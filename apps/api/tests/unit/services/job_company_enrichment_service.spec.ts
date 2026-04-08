import { test } from '@japa/runner'
import {
  CACHE_TTL_DAYS,
  COMPANY_TYPES,
  ENRICHMENT_BATCH_SIZE,
  MAX_COMPANY_NAME_LENGTH,
  DEDUP_RULES,
} from '@expat-hunter/shared'

test.group('JobCompanyEnrichmentService — constants', () => {
  test('CACHE_TTL_DAYS is 365', ({ assert }) => {
    // ORACLE: CACHE_TTL_DAYS = 365 (from story AC-FUNC-JCE-08)
    assert.equal(CACHE_TTL_DAYS, 365)
  })

  test('ENRICHMENT_BATCH_SIZE is 10', ({ assert }) => {
    // ORACLE: ENRICHMENT_BATCH_SIZE = 10 (from story technical_notes)
    assert.equal(ENRICHMENT_BATCH_SIZE, 10)
  })

  test('MAX_COMPANY_NAME_LENGTH is 255', ({ assert }) => {
    // ORACLE: MAX_COMPANY_NAME_LENGTH = 255 (from story edge_cases)
    assert.equal(MAX_COMPANY_NAME_LENGTH, 255)
  })

  test('COMPANY_TYPES contains 4 values', ({ assert }) => {
    // ORACLE: 4 types from story AC-FUNC-JCE-09
    assert.deepEqual([...COMPANY_TYPES], [
      'recruitment_agency',
      'hiring_company',
      'consulting',
      'unknown',
    ])
  })

  test('DEDUP_RULES.COMPANY_SUFFIXES includes common suffixes', ({ assert }) => {
    // ORACLE: from shared constants, used by normalizeSlug
    assert.include(DEDUP_RULES.COMPANY_SUFFIXES, 'ltd')
    assert.include(DEDUP_RULES.COMPANY_SUFFIXES, 'limited')
    assert.include(DEDUP_RULES.COMPANY_SUFFIXES, 'inc')
    assert.include(DEDUP_RULES.COMPANY_SUFFIXES, 'corp')
    assert.include(DEDUP_RULES.COMPANY_SUFFIXES, 'corporation')
    assert.include(DEDUP_RULES.COMPANY_SUFFIXES, 'pty')
    assert.include(DEDUP_RULES.COMPANY_SUFFIXES, 'llc')
  })
})

test.group('JobCompanyEnrichmentService — normalizeSlug', () => {
  test('strips "Limited" and "NZ" from "Xero NZ Limited"', async ({ assert }) => {
    const { normalizeSlug } = await import('#services/job_company_enrichment_service')
    // ORACLE: "Xero NZ Limited" → lowercase → remove "nz" (country suffix), remove "limited" (company suffix) → "xero"
    assert.equal(normalizeSlug('Xero NZ Limited'), 'xero')
  })

  test('strips "Corp" from "Fisher & Paykel Healthcare Corp"', async ({ assert }) => {
    const { normalizeSlug } = await import('#services/job_company_enrichment_service')
    // ORACLE: "Fisher & Paykel Healthcare Corp" → lowercase → remove "&" (special char → space) → remove "corp" → "fisher paykel healthcare"
    assert.equal(normalizeSlug('Fisher & Paykel Healthcare Corp'), 'fisher paykel healthcare')
  })

  test('strips "Ltd" and trims "  Datacom Ltd  "', async ({ assert }) => {
    const { normalizeSlug } = await import('#services/job_company_enrichment_service')
    // ORACLE: "  Datacom Ltd  " → trim → lowercase → remove "ltd" → "datacom"
    assert.equal(normalizeSlug('  Datacom Ltd  '), 'datacom')
  })

  test('lowercases simple name "ABC"', async ({ assert }) => {
    const { normalizeSlug } = await import('#services/job_company_enrichment_service')
    // ORACLE: "ABC" → lowercase → "abc" (no suffixes to strip)
    assert.equal(normalizeSlug('ABC'), 'abc')
  })

  test('returns empty string for empty input', async ({ assert }) => {
    const { normalizeSlug } = await import('#services/job_company_enrichment_service')
    // ORACLE: "" → ""
    assert.equal(normalizeSlug(''), '')
  })

  test('strips multiple suffixes from "Acme Inc LLC"', async ({ assert }) => {
    const { normalizeSlug } = await import('#services/job_company_enrichment_service')
    // ORACLE: "Acme Inc LLC" → lowercase → remove "inc" and "llc" → "acme"
    assert.equal(normalizeSlug('Acme Inc LLC'), 'acme')
  })

  test('strips country suffix "AU" from "Company AU Pty"', async ({ assert }) => {
    const { normalizeSlug } = await import('#services/job_company_enrichment_service')
    // ORACLE: "Company AU Pty" → lowercase → remove "au" (country), "pty" (company suffix) → "company"
    assert.equal(normalizeSlug('Company AU Pty'), 'company')
  })

  test('truncates names longer than MAX_COMPANY_NAME_LENGTH', async ({ assert }) => {
    const { normalizeSlug } = await import('#services/job_company_enrichment_service')
    const longName = 'A'.repeat(300)
    const result = normalizeSlug(longName)
    // ORACLE: truncated to MAX_COMPANY_NAME_LENGTH (255), then lowercased
    assert.isAtMost(result.length, MAX_COMPANY_NAME_LENGTH)
  })
})

test.group('JobCompanyEnrichmentService — service structure', () => {
  test('service module can be imported', async ({ assert }) => {
    const mod = await import('#services/job_company_enrichment_service')
    assert.isFunction(mod.default)
  })

  test('constructor accepts optional OpenRouterClient', async ({ assert }) => {
    const { default: JobCompanyEnrichmentService } = await import('#services/job_company_enrichment_service')
    const service = new JobCompanyEnrichmentService()
    assert.isDefined(service)
  })

  test('enrichForSearch method exists', async ({ assert }) => {
    const { default: JobCompanyEnrichmentService } = await import('#services/job_company_enrichment_service')
    const service = new JobCompanyEnrichmentService()
    assert.isFunction(service.enrichForSearch)
  })

  test('enrichCompanyViaAI method exists', async ({ assert }) => {
    const { default: JobCompanyEnrichmentService } = await import('#services/job_company_enrichment_service')
    const service = new JobCompanyEnrichmentService()
    assert.isFunction(service.enrichCompanyViaAI)
  })
})

test.group('JobCompanyEnrichmentService — AI response parsing', () => {
  test('enrichCompanyViaAI parses valid JSON response', async ({ assert }) => {
    const { default: JobCompanyEnrichmentService } = await import('#services/job_company_enrichment_service')

    const mockResponse = JSON.stringify({
      name: 'Xero',
      sector: 'Technology',
      size: 'large',
      companyType: 'hiring_company',
    })

    const mockClient = {
      isConfigured: true,
      chat: async () => mockResponse,
    } as any

    const service = new JobCompanyEnrichmentService(mockClient)
    const result = await service.enrichCompanyViaAI('Xero NZ Limited', 'NZ')

    // ORACLE: parsed from mock response
    assert.equal(result.name, 'Xero')
    assert.equal(result.sector, 'Technology')
    assert.equal(result.size, 'large')
    assert.equal(result.companyType, 'hiring_company')
  })

  test('enrichCompanyViaAI handles malformed JSON gracefully', async ({ assert }) => {
    const { default: JobCompanyEnrichmentService } = await import('#services/job_company_enrichment_service')

    const mockClient = {
      isConfigured: true,
      chat: async () => 'This is not JSON at all',
    } as any

    const service = new JobCompanyEnrichmentService(mockClient)
    const result = await service.enrichCompanyViaAI('SomeCompany', 'NZ')

    // ORACLE: fallback values when JSON parsing fails
    assert.equal(result.name, 'SomeCompany')
    assert.isNull(result.sector)
    assert.isNull(result.size)
    assert.equal(result.companyType, 'unknown')
  })

  test('enrichCompanyViaAI handles markdown-wrapped JSON', async ({ assert }) => {
    const { default: JobCompanyEnrichmentService } = await import('#services/job_company_enrichment_service')

    const mockResponse = '```json\n{"name":"Test","sector":"Finance","size":"medium","companyType":"consulting"}\n```'

    const mockClient = {
      isConfigured: true,
      chat: async () => mockResponse,
    } as any

    const service = new JobCompanyEnrichmentService(mockClient)
    const result = await service.enrichCompanyViaAI('Test Corp', 'AU')

    // ORACLE: should strip markdown fences and parse
    assert.equal(result.name, 'Test')
    assert.equal(result.sector, 'Finance')
    assert.equal(result.companyType, 'consulting')
  })

  test('enrichCompanyViaAI defaults invalid companyType to unknown', async ({ assert }) => {
    const { default: JobCompanyEnrichmentService } = await import('#services/job_company_enrichment_service')

    const mockResponse = JSON.stringify({
      name: 'Foo',
      sector: 'Tech',
      size: 'small',
      companyType: 'invalid_type',
    })

    const mockClient = {
      isConfigured: true,
      chat: async () => mockResponse,
    } as any

    const service = new JobCompanyEnrichmentService(mockClient)
    const result = await service.enrichCompanyViaAI('Foo Bar', 'NZ')

    // ORACLE: invalid companyType → 'unknown'
    assert.equal(result.companyType, 'unknown')
  })

  test('enrichCompanyViaAI handles partial data (missing sector)', async ({ assert }) => {
    const { default: JobCompanyEnrichmentService } = await import('#services/job_company_enrichment_service')

    const mockResponse = JSON.stringify({
      name: 'PartialCo',
      companyType: 'hiring_company',
    })

    const mockClient = {
      isConfigured: true,
      chat: async () => mockResponse,
    } as any

    const service = new JobCompanyEnrichmentService(mockClient)
    const result = await service.enrichCompanyViaAI('PartialCo Ltd', 'US')

    // ORACLE: missing sector/size → null
    assert.equal(result.name, 'PartialCo')
    assert.isNull(result.sector)
    assert.isNull(result.size)
    assert.equal(result.companyType, 'hiring_company')
  })

  test('enrichCompanyViaAI uses country in prompt', async ({ assert }) => {
    const { default: JobCompanyEnrichmentService } = await import('#services/job_company_enrichment_service')

    let capturedMessages: any[] = []
    const mockClient = {
      isConfigured: true,
      chat: async (params: any) => {
        capturedMessages = params.messages
        return JSON.stringify({
          name: 'Test',
          sector: null,
          size: null,
          companyType: 'unknown',
        })
      },
    } as any

    const service = new JobCompanyEnrichmentService(mockClient)
    await service.enrichCompanyViaAI('TestCo', 'NZ')

    // ORACLE: user message contains country context
    const userMsg = capturedMessages.find((m: any) => m.role === 'user')
    assert.include(userMsg.content, 'NZ')
    assert.include(userMsg.content, 'TestCo')
  })
})

test.group('JobCompanyEnrichmentService — models', () => {
  test('CompanyCache model can be imported', async ({ assert }) => {
    const mod = await import('#models/company_cache')
    assert.isFunction(mod.default)
  })

  test('AccreditationCache model can be imported', async ({ assert }) => {
    const mod = await import('#models/accreditation_cache')
    assert.isFunction(mod.default)
  })

  test('CompanyCache table name is company_caches', async ({ assert }) => {
    const { default: CompanyCache } = await import('#models/company_cache')
    assert.equal(CompanyCache.table, 'company_caches')
  })

  test('AccreditationCache table name is accreditation_caches', async ({ assert }) => {
    const { default: AccreditationCache } = await import('#models/accreditation_cache')
    assert.equal(AccreditationCache.table, 'accreditation_caches')
  })
})
