/**
 * POC Pipeline — Test contact enrichment on 10 NZ companies
 *
 * Run: cd apps/api && npx tsx commands/poc_pipeline.ts
 *
 * Calls APIs directly (no AdonisJS container needed):
 * - Immigration NZ API (visa check)
 * - Hunter.io domain search + email finder
 * - Apollo.io people match
 * - DIY pattern inference + MX verification
 */

import dns from 'node:dns/promises'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Load env from apps/api/.env (no dotenv dependency)
const envPath = resolve(import.meta.dirname, '../.env')
const envContent = readFileSync(envPath, 'utf-8')
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eqIdx = trimmed.indexOf('=')
  if (eqIdx === -1) continue
  const key = trimmed.substring(0, eqIdx).trim()
  const value = trimmed.substring(eqIdx + 1).trim()
  if (!process.env[key]) process.env[key] = value
}

const HUNTER_API_KEY = process.env.HUNTER_API_KEY ?? ''
const APOLLO_API_KEY = process.env.APOLLO_API_KEY ?? ''

// ─── Types ───────────────────────────────────────────────────────────────────

interface CompanyTest {
  name: string
  domain: string
  city: string
  expectedVisa: 'accredited' | 'not_found' | 'unknown'
}

interface ContactFound {
  name: string
  role: string
  email: string | null
  emailSource: string
  emailConfidence: number
  emailStatus: string
}

interface CompanyResult {
  company: string
  domain: string
  city: string
  visaStatus: string
  visaConfidence: number
  visaMatchedName?: string
  visaExpected: string
  visaCorrect: boolean
  hunterContactsFound: number
  apolloContactsFound: number
  contacts: ContactFound[]
  contactsWithEmail: number
  contactsWithVerifiedEmail: number
  durationMs: number
  errors: string[]
}

// ─── Test Data ───────────────────────────────────────────────────────────────

const NZ_COMPANIES: CompanyTest[] = [
  { name: 'Theta', domain: 'theta.co.nz', city: 'Auckland', expectedVisa: 'accredited' },
  { name: 'PredictHQ', domain: 'phq.nz', city: 'Auckland', expectedVisa: 'not_found' },
  { name: 'Xero', domain: 'xero.com', city: 'Wellington', expectedVisa: 'accredited' },
  { name: 'Datacom', domain: 'datacom.com', city: 'Auckland', expectedVisa: 'accredited' },
  { name: 'Vista Group', domain: 'vistagroup.co', city: 'Auckland', expectedVisa: 'accredited' },
  { name: 'Seequent', domain: 'seequent.com', city: 'Christchurch', expectedVisa: 'accredited' },
  { name: 'Pushpay', domain: 'pushpay.com', city: 'Auckland', expectedVisa: 'accredited' },
  { name: 'Timely', domain: 'gettimely.com', city: 'Auckland', expectedVisa: 'unknown' },
  { name: 'Hnry', domain: 'hnry.co.nz', city: 'Wellington', expectedVisa: 'unknown' },
  { name: 'Halter', domain: 'halterhq.com', city: 'Auckland', expectedVisa: 'accredited' },
]

// ─── Visa Check (NZ Immigration API) ─────────────────────────────────────────

const NZ_API_URL = 'https://www.immigration.govt.nz/list-api/getAPIResults/'

const LEGAL_SUFFIXES =
  /\b(limited|ltd|pty|pty\s+ltd|inc|incorporated|corporation|corp|gmbh|sas|sarl|llc|plc|co\.|company|group|holdings|international|intl)\b\.?/gi

function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(LEGAL_SUFFIXES, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => {
      if (i === 0) return j
      if (j === 0) return i
      return 0
    })
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

function fuzzyMatch(a: string, b: string): number {
  if (a === b) return 1
  if (!a || !b) return 0

  // Substring containment: if search term is fully contained in result, high score
  if (b.includes(a)) return 0.9 + 0.1 * (a.length / b.length)
  if (a.includes(b)) return 0.9 + 0.1 * (b.length / a.length)

  // Token overlap: check if all words of the shorter are in the longer
  const aWords = a.split(/\s+/)
  const bWords = b.split(/\s+/)
  const [shorter, longer] = aWords.length <= bWords.length ? [aWords, bWords] : [bWords, aWords]
  const matchedTokens = shorter.filter((w) => longer.some((lw) => lw === w || lw.startsWith(w)))
  if (matchedTokens.length === shorter.length && shorter.length > 0) {
    return 0.85 + 0.1 * (shorter.length / longer.length)
  }

  // Fallback to levenshtein
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length)
}

async function checkVisaNZ(companyName: string): Promise<{
  status: string
  confidence: number
  matchedName?: string
}> {
  const formData = new FormData()
  formData.append('query', companyName)
  formData.append('collection', '2')
  formData.append('page', '1')

  const res = await fetch(NZ_API_URL, {
    method: 'POST',
    body: formData,
    headers: {
      Accept: 'application/json, text/plain, */*',
      Origin: 'https://www.immigration.govt.nz',
      Referer:
        'https://www.immigration.govt.nz/work/requirements-for-work-visas/approved-employers/accredited-employer-list/',
    },
    signal: AbortSignal.timeout(15_000),
  })

  // NZ API returns HTTP 400 with "No Results" when company is not found — this is NOT an error
  if (res.status === 400) {
    const body = (await res.json().catch(() => null)) as { Title?: string } | null
    if (body?.Title === 'No Results') {
      return { status: 'not_found', confidence: 0 }
    }
    throw new Error(`NZ API 400: ${JSON.stringify(body)}`)
  }

  if (!res.ok) throw new Error(`NZ API ${res.status}`)

  const json = (await res.json()) as {
    results: string
    totalResults: number
  }

  if (!json.results || json.totalResults === 0) {
    return { status: 'not_found', confidence: 0 }
  }

  const results = JSON.parse(json.results) as Array<{
    field_schema: { raw: Array<{ APIColumn: string; Value: string }> }
  }>

  const normalized = normalizeCompanyName(companyName)
  let bestScore = 0
  let bestName = ''

  for (const result of results) {
    const employerName =
      result.field_schema.raw.find((f) => f.APIColumn === 'employerName')?.Value ?? ''
    const tradingName =
      result.field_schema.raw.find((f) => f.APIColumn === 'tradingName')?.Value ?? ''

    const s1 = fuzzyMatch(normalized, normalizeCompanyName(employerName))
    const s2 = fuzzyMatch(normalized, normalizeCompanyName(tradingName))
    const score = Math.max(s1, s2)
    if (score > bestScore) {
      bestScore = score
      bestName = employerName || tradingName
    }
  }

  if (bestScore < 0.7) {
    return { status: 'not_found', confidence: bestScore }
  }

  return { status: 'accredited', confidence: bestScore, matchedName: bestName }
}

// ─── Hunter.io Domain Search ─────────────────────────────────────────────────

interface HunterContact {
  firstName: string
  lastName: string
  position: string
  email?: string
  confidence?: number
  department?: string
}

async function hunterDomainSearch(domain: string): Promise<HunterContact[]> {
  if (!HUNTER_API_KEY) return []

  const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${HUNTER_API_KEY}&limit=20`
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })

  if (!res.ok) throw new Error(`Hunter ${res.status}`)

  const json = (await res.json()) as {
    data?: {
      emails?: Array<{
        value?: string
        first_name?: string
        last_name?: string
        position?: string
        confidence?: number
        department?: string
      }>
    }
  }

  return (
    json.data?.emails?.map((e) => ({
      firstName: e.first_name ?? '',
      lastName: e.last_name ?? '',
      position: e.position ?? '',
      email: e.value,
      confidence: e.confidence,
      department: e.department,
    })) ?? []
  )
}

// ─── Apollo.io Organization Search ───────────────────────────────────────────

async function apolloOrgSearch(
  domain: string
): Promise<Array<{ name: string; title: string; email: string | null }>> {
  if (!APOLLO_API_KEY) return []

  try {
    const res = await fetch('https://api.apollo.io/api/v1/mixed_people/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': APOLLO_API_KEY },
      body: JSON.stringify({
        q_organization_domains: domain,
        page: 1,
        per_page: 10,
      }),
      signal: AbortSignal.timeout(15_000),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Apollo ${res.status}: ${text.substring(0, 200)}`)
    }

    const json = (await res.json()) as {
      people?: Array<{
        name?: string
        title?: string
        email?: string
        email_status?: string
      }>
    }

    return (
      json.people?.map((p) => ({
        name: p.name ?? '',
        title: p.title ?? '',
        email: p.email ?? null,
      })) ?? []
    )
  } catch (err) {
    console.log(`  Apollo search error: ${err instanceof Error ? err.message : err}`)
    return []
  }
}

// ─── Email Pattern Inference ─────────────────────────────────────────────────

function inferEmailPatterns(firstName: string, lastName: string, domain: string): string[] {
  const f = firstName.toLowerCase().replace(/[^a-z]/g, '')
  const l = lastName.toLowerCase().replace(/[^a-z]/g, '')
  if (!f || !l) return []

  return [
    `${f}.${l}@${domain}`,
    `${f}${l}@${domain}`,
    `${f[0]}.${l}@${domain}`,
    `${f[0]}${l}@${domain}`,
    `${f}@${domain}`,
    `${l}.${f}@${domain}`,
    `${f}_${l}@${domain}`,
    `${f[0]}${l[0]}@${domain}`,
  ]
}

async function verifyMx(domain: string): Promise<boolean> {
  try {
    const records = await dns.resolveMx(domain)
    return records.length > 0
  } catch {
    return false
  }
}

// ─── Contact Prioritization ──────────────────────────────────────────────────

function roleScore(position: string): number {
  const lower = position.toLowerCase()
  const hiring = ['talent', 'recruit', 'people', 'hr', 'human resources', 'hiring']
  const decision = ['cto', 'ceo', 'founder', 'vp', 'vice president', 'director', 'head of', 'chief', 'lead', 'manager', 'principal', 'senior']
  let score = 0
  if (hiring.some((k) => lower.includes(k))) score += 20
  if (decision.some((k) => lower.includes(k))) score += 10
  if (position) score += 1
  return score
}

// ─── Pipeline Step Helpers ───────────────────────────────────────────────────

function runVisaCheck(
  companyName: string,
  expectedVisa: string,
  errors: string[]
): Promise<{ status: string; confidence: number; matchedName?: string; correct: boolean }> {
  return checkVisaNZ(companyName)
    .then((visa) => {
      const correct = visa.status === expectedVisa || expectedVisa === 'unknown'
      console.log(
        `  Visa: ${visa.status} (${(visa.confidence * 100).toFixed(0)}%` +
          `${visa.matchedName ? `, "${visa.matchedName}"` : ''}) ` +
          `${correct ? '✅' : '❌ expected ' + expectedVisa}`
      )
      return { status: visa.status, confidence: visa.confidence, matchedName: visa.matchedName, correct }
    })
    .catch((err) => {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`Visa: ${msg}`)
      console.log(`  Visa: ERROR — ${msg}`)
      return { status: 'unknown', confidence: 0, matchedName: undefined, correct: expectedVisa === 'unknown' }
    })
}

async function runHunterSearch(domain: string, errors: string[]): Promise<HunterContact[]> {
  try {
    const contacts = await hunterDomainSearch(domain)
    console.log(`  Hunter: ${contacts.length} contacts`)
    return contacts
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(`Hunter: ${msg}`)
    console.log(`  Hunter: ERROR — ${msg}`)
    return []
  }
}

async function runApolloSearch(
  domain: string,
  errors: string[]
): Promise<Array<{ name: string; title: string; email: string | null }>> {
  try {
    const contacts = await apolloOrgSearch(domain)
    console.log(`  Apollo: ${contacts.length} contacts`)
    return contacts
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(`Apollo: ${msg}`)
    console.log(`  Apollo: ERROR — ${msg}`)
    return []
  }
}

function mergeHunterContacts(
  hunterContacts: HunterContact[],
  seenNames: Set<string>
): ContactFound[] {
  const merged: ContactFound[] = []
  for (const c of hunterContacts) {
    const name = `${c.firstName} ${c.lastName}`.trim()
    if (!name || seenNames.has(name.toLowerCase())) continue
    seenNames.add(name.toLowerCase())
    merged.push({
      name,
      role: c.position || 'Unknown',
      email: c.email ?? null,
      emailSource: c.email ? 'hunter' : 'none',
      emailConfidence: c.email ? (c.confidence ?? 90) : 0,
      emailStatus: c.email ? 'verified' : 'unknown',
    })
  }
  return merged
}

function mergeApolloContacts(
  apolloContacts: Array<{ name: string; title: string; email: string | null }>,
  seenNames: Set<string>
): ContactFound[] {
  const merged: ContactFound[] = []
  for (const c of apolloContacts) {
    if (!c.name || seenNames.has(c.name.toLowerCase())) continue
    seenNames.add(c.name.toLowerCase())
    merged.push({
      name: c.name,
      role: c.title || 'Unknown',
      email: c.email,
      emailSource: c.email ? 'apollo' : 'none',
      emailConfidence: c.email ? 80 : 0,
      emailStatus: c.email ? 'probable' : 'unknown',
    })
  }
  return merged
}

function inferEmailsForContacts(contacts: ContactFound[], domain: string, mxValid: boolean): void {
  for (const contact of contacts) {
    if (contact.email) continue
    if (!mxValid) continue

    const parts = contact.name.split(/\s+/)
    if (parts.length < 2) continue

    const patterns = inferEmailPatterns(parts[0], parts.slice(1).join(' '), domain)
    if (patterns.length > 0) {
      contact.email = patterns[0]
      contact.emailSource = 'inferred'
      contact.emailConfidence = 40
      contact.emailStatus = 'probable'
    }
  }
}

function logTopContacts(contacts: ContactFound[]): void {
  for (const c of contacts) {
    const emailStr = c.email
      ? `${c.email} (${c.emailSource}, ${c.emailConfidence}%)`
      : 'NO EMAIL'
    console.log(`  → ${c.name} — ${c.role} — ${emailStr}`)
  }
}

async function processSingleCompany(company: CompanyTest): Promise<CompanyResult> {
  console.log(`--- ${company.name} (${company.domain}, ${company.city}) ---`)
  const start = Date.now()
  const errors: string[] = []

  // Step 1: Visa Check
  const visa = await runVisaCheck(company.name, company.expectedVisa, errors)

  // Step 2: Hunter Domain Search
  const hunterContacts = await runHunterSearch(company.domain, errors)

  // Step 3: Apollo Org Search
  const apolloContacts = await runApolloSearch(company.domain, errors)

  // Step 4: Merge & Deduplicate
  const seenNames = new Set<string>()
  const allContacts: ContactFound[] = [
    ...mergeHunterContacts(hunterContacts, seenNames),
    ...mergeApolloContacts(apolloContacts, seenNames),
  ]
  allContacts.sort((a, b) => roleScore(b.role) - roleScore(a.role))

  // Step 5: Pattern inference for contacts without email
  const mxValid = await verifyMx(company.domain)
  const top5 = allContacts.slice(0, 5)
  inferEmailsForContacts(top5, company.domain, mxValid)

  logTopContacts(top5)

  const contactsWithEmail = top5.filter((c) => c.email).length
  const contactsWithVerifiedEmail = top5.filter(
    (c) => c.email && (c.emailStatus === 'verified' || c.emailConfidence >= 80)
  ).length

  const durationMs = Date.now() - start
  console.log(`  ⏱ ${(durationMs / 1000).toFixed(1)}s | ${errors.length} errors`)
  console.log('')

  return {
    company: company.name,
    domain: company.domain,
    city: company.city,
    visaStatus: visa.status,
    visaConfidence: visa.confidence,
    visaMatchedName: visa.matchedName,
    visaExpected: company.expectedVisa,
    visaCorrect: visa.correct,
    hunterContactsFound: hunterContacts.length,
    apolloContactsFound: apolloContacts.length,
    contacts: top5,
    contactsWithEmail,
    contactsWithVerifiedEmail,
    durationMs,
    errors,
  }
}

function printResultsTable(results: CompanyResult[]): void {
  console.log(
    'Company'.padEnd(16) +
      'Visa'.padEnd(18) +
      'Hunter'.padEnd(8) +
      'Apollo'.padEnd(8) +
      'w/Email'.padEnd(9) +
      'Verified'.padEnd(10) +
      'Time'
  )
  console.log('─'.repeat(75))

  for (const r of results) {
    const visa = `${r.visaStatus} ${r.visaCorrect ? '✅' : '❌'}`
    console.log(
      r.company.padEnd(16) +
        visa.padEnd(18) +
        String(r.hunterContactsFound).padEnd(8) +
        String(r.apolloContactsFound).padEnd(8) +
        `${r.contactsWithEmail}/5`.padEnd(9) +
        `${r.contactsWithVerifiedEmail}/5`.padEnd(10) +
        `${(r.durationMs / 1000).toFixed(1)}s`
    )
  }
  console.log('─'.repeat(75))
}

function printMetrics(results: CompanyResult[]): void {
  const total = results.length
  const visaResolved = results.filter((r) => r.visaStatus !== 'unknown').length
  const visaCorrect = results.filter((r) => r.visaCorrect).length
  const totalHunter = results.reduce((s, r) => s + r.hunterContactsFound, 0)
  const totalApollo = results.reduce((s, r) => s + r.apolloContactsFound, 0)
  const totalTested = results.reduce((s, r) => s + r.contacts.length, 0)
  const totalWithEmail = results.reduce((s, r) => s + r.contactsWithEmail, 0)
  const totalVerified = results.reduce((s, r) => s + r.contactsWithVerifiedEmail, 0)
  const totalTime = results.reduce((s, r) => s + r.durationMs, 0)
  const totalErrors = results.reduce((s, r) => s + r.errors.length, 0)

  console.log('')
  console.log('METRICS:')
  console.log(`  Companies:            ${total}`)
  console.log(`  Visa resolved:        ${visaResolved}/${total} (${pct(visaResolved, total)}) — target ≥80%`)
  console.log(`  Visa accuracy:        ${visaCorrect}/${total} (${pct(visaCorrect, total)})`)
  console.log(`  Hunter contacts:      ${totalHunter}`)
  console.log(`  Apollo contacts:      ${totalApollo}`)
  console.log(`  Top contacts tested:  ${totalTested}`)
  console.log(`  With email:           ${totalWithEmail}/${totalTested} (${pct(totalWithEmail, totalTested)}) — target ≥70%`)
  console.log(`  Verified (≥80%):      ${totalVerified}/${totalTested} (${pct(totalVerified, totalTested)})`)
  console.log(`  Total time:           ${(totalTime / 1000).toFixed(1)}s`)
  console.log(`  Errors:               ${totalErrors}`)
  console.log(`  Cost:                 ~$0 (free tiers)`)

  const visaPct = (visaResolved / total) * 100
  const emailPct = totalTested > 0 ? (totalWithEmail / totalTested) * 100 : 0

  console.log('')
  console.log('GO/NO-GO:')
  console.log(`  Visa ≥80%:   ${visaPct >= 80 ? '✅ PASS' : '❌ FAIL'} (${visaPct.toFixed(0)}%)`)
  console.log(`  Email ≥70%:  ${emailPct >= 70 ? '✅ PASS' : '❌ FAIL'} (${emailPct.toFixed(0)}%)`)
  console.log(`  Overall:     ${visaPct >= 80 && emailPct >= 70 ? '🟢 GO' : '🔴 NEEDS WORK'}`)
  console.log('')

  if (totalErrors > 0) {
    console.log('ERRORS:')
    for (const r of results) {
      for (const err of r.errors) {
        console.log(`  [${r.company}] ${err}`)
      }
    }
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function run() {
  console.log('=== POC Pipeline — 10 NZ Companies ===')
  console.log(`Hunter API: ${HUNTER_API_KEY ? '✅ configured' : '❌ missing'}`)
  console.log(`Apollo API: ${APOLLO_API_KEY ? '✅ configured' : '❌ missing'}`)
  console.log('')

  const results: CompanyResult[] = []

  for (const company of NZ_COMPANIES) {
    const result = await processSingleCompany(company)
    results.push(result)

    // Rate limiting
    await new Promise((r) => setTimeout(r, 1500))
  }

  // ─── Summary ───────────────────────────────────────────────────────────────
  console.log('══════════════════════════════════════════════════════════════')
  console.log('                   POC RESULTS SUMMARY')
  console.log('══════════════════════════════════════════════════════════════')
  console.log('')

  printResultsTable(results)
  printMetrics(results)
}

function pct(a: number, b: number): string {
  return b > 0 ? `${((a / b) * 100).toFixed(0)}%` : '0%'
}

run().catch(console.error)
