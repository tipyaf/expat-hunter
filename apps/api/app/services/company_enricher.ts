import { parse } from 'node-html-parser'
import Company from '#models/company'
import Contact from '#models/contact'
import { DateTime } from 'luxon'

export interface TeamMember {
  fullName: string
  role: string
  email?: string
  pageUrl: string
}

export interface CompanyEnrichmentResult {
  companyId: string
  teamMembers: TeamMember[]
  crawledUrls: string[]
  errors: string[]
}

// Paths to try in order
const TEAM_PATHS = [
  '/team',
  '/our-team',
  '/people',
  '/about',
  '/about-us',
  '/company',
  '/leadership',
  '/who-we-are',
]

// Roles we want to keep (hiring decision makers)
const ROLE_WHITELIST = [
  'engineering manager',
  'cto',
  'cio',
  'chief technology',
  'chief information',
  'vp engineering',
  'vp of engineering',
  'head of engineering',
  'head of technology',
  'head of product',
  'head of tech',
  'tech lead',
  'technical lead',
  'product manager',
  'software lead',
  'director of engineering',
  'director of technology',
  'engineering director',
  'principal engineer',
  'founder',
  'co-founder',
  'ceo',
  'managing director',
]

// Roles to skip (HR/admin roles that won't hire directly)
const ROLE_BLACKLIST = [
  'recruiter',
  'talent acquisition',
  'talent partner',
  'hr manager',
  'human resources',
  'people operations',
  'people partner',
  'office manager',
  'executive assistant',
  'receptionist',
]

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g

export default class CompanyEnricher {
  /**
   * Crawl company website for team members and persist them as contacts.
   */
  async enrichCompany(
    company: Company,
    userId: string,
    sourcingRunId: string | null
  ): Promise<CompanyEnrichmentResult> {
    const domain = company.domain ?? this.extractDomain(company.website ?? '')
    if (!domain) {
      return { companyId: company.id, teamMembers: [], crawledUrls: [], errors: ['No domain'] }
    }

    // Update domain on company if missing
    if (!company.domain) {
      company.domain = domain
    }

    const baseUrl = `https://${domain}`
    const crawledUrls: string[] = []
    const errors: string[] = []
    const allMembers: TeamMember[] = []

    // Check robots.txt first
    const robotsAllowed = await this.checkRobots(baseUrl)
    if (!robotsAllowed) {
      errors.push('Crawl disallowed by robots.txt')
      return { companyId: company.id, teamMembers: [], crawledUrls, errors }
    }

    // Try each path, stop after finding 2 pages with members
    let successfulPages = 0
    for (const path of TEAM_PATHS) {
      if (successfulPages >= 2) break
      if (crawledUrls.length >= 5) break

      const url = `${baseUrl}${path}`
      try {
        await this.delay()
        const members = await this.crawlPage(url)
        crawledUrls.push(url)

        if (members.length > 0) {
          allMembers.push(...members)
          successfulPages++
        }
      } catch {
        // Silently skip unreachable pages
      }
    }

    // Deduplicate by name
    const seen = new Set<string>()
    const uniqueMembers = allMembers.filter((m) => {
      const key = m.fullName.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // Persist as contacts
    let persisted = 0
    for (const member of uniqueMembers) {
      try {
        // Skip if already exists
        if (member.email) {
          const existing = await Contact.query()
            .where('userId', userId)
            .where('email', member.email)
            .first()
          if (existing) continue
        }

        await Contact.create({
          userId,
          companyId: company.id,
          sourcingRunId,
          fullName: member.fullName,
          role: member.role,
          email: member.email ?? null,
          emailSource: member.email ? 'page' : null,
          emailConfidence: member.email ? 85 : null,
          emailStatus: member.email ? 'probable' : null,
          sourceDetail: member.pageUrl,
          source: 'company_team',
          status: 'identified',
        })
        persisted++
      } catch {
        // Skip duplicates
      }
    }

    // Update company crawl timestamp
    company.teamCrawledAt = DateTime.now()
    await company.save()

    return { companyId: company.id, teamMembers: uniqueMembers, crawledUrls, errors }
  }

  private async crawlPage(url: string): Promise<TeamMember[]> {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; ExpatHunter-Bot/1.0; +https://expat-hunter.com/bot)',
        Accept: 'text/html',
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) return []

    const html = await response.text()
    return this.extractTeamMembers(html, url)
  }

  private extractTeamMembers(html: string, pageUrl: string): TeamMember[] {
    const root = parse(html)
    const members: TeamMember[] = []

    // Extract emails visible in the page (bonus — not for team page extraction itself)
    const pageText = root.text
    const emailsInPage = pageText.match(EMAIL_REGEX) ?? []
    const professionalEmails = emailsInPage.filter(
      (e) => !e.match(/^(info|contact|hello|hi|support|noreply|no-reply|admin|careers|jobs|hr)@/i)
    )

    // Look for structured person cards: elements with both name-like text and role-like text
    // Common patterns: .team-member, .person, .staff, article with h3+p, etc.
    const cardSelectors = [
      '.team-member',
      '.person',
      '.staff-member',
      '.employee',
      '.team-card',
      '.member',
      '[class*="team"]',
      '[class*="person"]',
      '[class*="staff"]',
    ]

    for (const selector of cardSelectors) {
      try {
        const cards = root.querySelectorAll(selector)
        for (const card of cards) {
          const member = this.parseCard(card.text, pageUrl, professionalEmails)
          if (member) members.push(member)
        }
      } catch {
        // Ignore selector errors
      }

      if (members.length > 0) break
    }

    // Fallback: scan headings followed by role-like text
    if (members.length === 0) {
      const headings = root.querySelectorAll('h2, h3, h4')
      for (const heading of headings) {
        const name = heading.text.trim()
        if (!this.looksLikeName(name)) continue

        const next = heading.nextElementSibling
        const role = next?.text?.trim() ?? ''
        if (!role || role.length > 80) continue

        if (!this.isOperationalRole(role)) continue

        members.push({ fullName: name, role, pageUrl })
      }
    }

    return members.slice(0, 20) // Cap per page
  }

  private parseCard(
    text: string,
    pageUrl: string,
    availableEmails: string[]
  ): TeamMember | null {
    const lines = text
      .split(/\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && l.length < 100)

    if (lines.length < 2) return null

    const nameLine = lines[0]
    const roleLine = lines[1]

    if (!this.looksLikeName(nameLine)) return null
    if (!roleLine || !this.isOperationalRole(roleLine)) return null

    // Try to find a matching email
    const firstName = nameLine.split(' ')[0].toLowerCase()
    const email = availableEmails.find((e) => e.toLowerCase().includes(firstName))

    return { fullName: nameLine, role: roleLine, email, pageUrl }
  }

  private isOperationalRole(role: string): boolean {
    const lower = role.toLowerCase()
    if (ROLE_BLACKLIST.some((b) => lower.includes(b))) return false
    return ROLE_WHITELIST.some((w) => lower.includes(w))
  }

  private looksLikeName(text: string): boolean {
    if (!text || text.length < 4 || text.length > 50) return false
    // Should look like "Firstname Lastname" — 2-4 words, each capitalised
    const words = text.split(/\s+/)
    if (words.length < 2 || words.length > 4) return false
    return words.every((w) => /^[A-Z][a-z'-]+$/.test(w))
  }

  private async checkRobots(baseUrl: string): Promise<boolean> {
    try {
      const res = await fetch(`${baseUrl}/robots.txt`, { signal: AbortSignal.timeout(3000) })
      if (!res.ok) return true // If robots.txt not found, assume allowed
      const text = await res.text()
      // Simple check: if Disallow: / for all agents, skip
      const lines = text.split('\n')
      let allAgents = false
      for (const line of lines) {
        if (line.trim().toLowerCase() === 'user-agent: *') allAgents = true
        if (allAgents && line.trim().toLowerCase() === 'disallow: /') return false
      }
      return true
    } catch {
      return true // If can't reach robots.txt, allow
    }
  }

  extractDomain(website: string): string {
    if (!website) return ''
    try {
      const url = new URL(website.startsWith('http') ? website : `https://${website}`)
      return url.hostname.replace(/^www\./, '')
    } catch {
      return ''
    }
  }

  private async delay(): Promise<void> {
    const ms = 2000 + Math.floor(Math.random() * 1000)
    await new Promise((resolve) => setTimeout(resolve, ms))
  }
}
