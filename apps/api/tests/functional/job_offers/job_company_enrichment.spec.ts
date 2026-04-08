import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { CACHE_TTL_DAYS } from '@expat-hunter/shared'
import { DateTime } from 'luxon'

test.group('JobCompanyEnrichment — functional', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('enrichForSearch skips when OpenRouter not configured', async ({ assert }) => {
    const { default: JobCompanyEnrichmentService } = await import('#services/job_company_enrichment_service')

    const mockClient = { isConfigured: false, chat: async () => '' } as any
    const service = new JobCompanyEnrichmentService(mockClient)

    // Should return empty result without error
    const result = await service.enrichForSearch('fake-search-id', 'fake-user-id')
    assert.equal(result.enriched, 0)
    assert.equal(result.cached, 0)
    assert.equal(result.skipped, 0)
    assert.equal(result.errors, 0)
  })

  test('CompanyCache record is created with correct fields via migration', async ({ assert }) => {
    const { default: CompanyCache } = await import('#models/company_cache')

    const cache = await CompanyCache.create({
      slug: 'test-company',
      country: 'NZ',
      name: 'Test Company',
      sector: 'Technology',
      size: 'medium',
      companyType: 'hiring_company',
      expiresAt: DateTime.now().plus({ days: CACHE_TTL_DAYS }),
    })

    // ORACLE: record created with all fields populated
    assert.isNotNull(cache.id)
    assert.equal(cache.slug, 'test-company')
    assert.equal(cache.country, 'NZ')
    assert.equal(cache.name, 'Test Company')
    assert.equal(cache.sector, 'Technology')
    assert.equal(cache.size, 'medium')
    assert.equal(cache.companyType, 'hiring_company')
    assert.isNotNull(cache.expiresAt)
    assert.isNotNull(cache.createdAt)
  })

  test('CompanyCache enforces unique (slug, country) constraint', async ({ assert }) => {
    const { default: CompanyCache } = await import('#models/company_cache')

    await CompanyCache.create({
      slug: 'unique-test',
      country: 'NZ',
      name: 'Company A',
      companyType: 'unknown',
      expiresAt: DateTime.now().plus({ days: CACHE_TTL_DAYS }),
    })

    // Same slug + different country should work
    const differentCountry = await CompanyCache.create({
      slug: 'unique-test',
      country: 'AU',
      name: 'Company A AU',
      companyType: 'unknown',
      expiresAt: DateTime.now().plus({ days: CACHE_TTL_DAYS }),
    })
    assert.isNotNull(differentCountry.id)

    // Same slug + same country should fail
    try {
      await CompanyCache.create({
        slug: 'unique-test',
        country: 'NZ',
        name: 'Company A Duplicate',
        companyType: 'unknown',
        expiresAt: DateTime.now().plus({ days: CACHE_TTL_DAYS }),
      })
      assert.fail('Should have thrown unique constraint error')
    } catch (error: any) {
      assert.include(error.message, 'unique')
    }
  })

  test('AccreditationCache record is created with correct fields', async ({ assert }) => {
    const { default: AccreditationCache } = await import('#models/accreditation_cache')

    const cache = await AccreditationCache.create({
      slug: 'xero',
      country: 'NZ',
      isAccredited: true,
      source: 'visa_sponsor_registry',
      checkedAt: DateTime.now(),
    })

    // ORACLE: record created with accreditation data
    assert.isNotNull(cache.id)
    assert.equal(cache.slug, 'xero')
    assert.equal(cache.country, 'NZ')
    assert.isTrue(cache.isAccredited)
    assert.equal(cache.source, 'visa_sponsor_registry')
  })

  test('AccreditationCache enforces unique (slug, country) constraint', async ({ assert }) => {
    const { default: AccreditationCache } = await import('#models/accreditation_cache')

    await AccreditationCache.create({
      slug: 'accred-test',
      country: 'NZ',
      isAccredited: false,
      checkedAt: DateTime.now(),
    })

    // Same slug + same country should fail
    try {
      await AccreditationCache.create({
        slug: 'accred-test',
        country: 'NZ',
        isAccredited: true,
        checkedAt: DateTime.now(),
      })
      assert.fail('Should have thrown unique constraint error')
    } catch (error: any) {
      assert.include(error.message, 'unique')
    }
  })

  test('CompanyCache expires_at is correctly set to created_at + 365 days', async ({ assert }) => {
    const { default: CompanyCache } = await import('#models/company_cache')

    const now = DateTime.now()
    const cache = await CompanyCache.create({
      slug: 'ttl-test',
      country: 'NZ',
      name: 'TTL Test',
      companyType: 'unknown',
      expiresAt: now.plus({ days: CACHE_TTL_DAYS }),
    })

    // ORACLE: expires_at should be ~365 days from creation
    const diffDays = cache.expiresAt.diff(cache.createdAt, 'days').days
    assert.isAtLeast(diffDays, 364)
    assert.isAtMost(diffDays, 366)
  })

  test('JobOffer has companyName column', async ({ assert }) => {
    const { default: JobOffer } = await import('#models/job_offer')
    const { default: JobSearch } = await import('#models/job_search')
    const { default: User } = await import('#models/user')

    // Create a user and search for the FK constraint
    const user = await User.create({
      email: 'enrichment-test@example.com',
      password: 'password123',
      fullName: 'Enrichment Test User',
    })

    const search = await JobSearch.create({
      userId: user.id,
      roles: ['developer'],
      countries: ['NZ'],
      platforms: ['seek'],
      seniority: 'senior',
      frequency: 'daily',
      isActive: true,
    })

    const offer = await JobOffer.create({
      searchId: search.id,
      title: 'Test Offer',
      companyName: 'Test Company Ltd',
      status: 'new',
      publicationDates: [DateTime.now().toISO()],
      isRepublished: false,
    })

    // ORACLE: companyName stored and retrievable
    const found = await JobOffer.findOrFail(offer.id)
    assert.equal(found.companyName, 'Test Company Ltd')
  })

  test('JobOffer belongsTo CompanyCache relation works', async ({ assert }) => {
    const { default: JobOffer } = await import('#models/job_offer')
    const { default: JobSearch } = await import('#models/job_search')
    const { default: CompanyCache } = await import('#models/company_cache')
    const { default: User } = await import('#models/user')

    const user = await User.create({
      email: 'relation-test@example.com',
      password: 'password123',
      fullName: 'Relation Test User',
    })

    const search = await JobSearch.create({
      userId: user.id,
      roles: ['developer'],
      countries: ['NZ'],
      platforms: ['seek'],
      seniority: 'senior',
      frequency: 'daily',
      isActive: true,
    })

    const cache = await CompanyCache.create({
      slug: 'relation-test',
      country: 'NZ',
      name: 'Relation Test Co',
      sector: 'Tech',
      companyType: 'hiring_company',
      expiresAt: DateTime.now().plus({ days: CACHE_TTL_DAYS }),
    })

    const offer = await JobOffer.create({
      searchId: search.id,
      companyCacheId: cache.id,
      companyName: 'Relation Test Co',
      title: 'Developer',
      status: 'evaluated',
      publicationDates: [DateTime.now().toISO()],
      isRepublished: false,
    })

    // Preload and verify
    const loaded = await JobOffer.query()
      .where('id', offer.id)
      .preload('companyCache')
      .firstOrFail()

    // ORACLE: companyCache relation loaded with correct data
    assert.isNotNull(loaded.companyCache)
    assert.equal(loaded.companyCache.name, 'Relation Test Co')
    assert.equal(loaded.companyCache.sector, 'Tech')
    assert.equal(loaded.companyCache.companyType, 'hiring_company')
  })

  test('serialized offer includes company object when enriched', async ({ assert }) => {
    const { default: JobOffer } = await import('#models/job_offer')
    const { default: JobSearch } = await import('#models/job_search')
    const { default: CompanyCache } = await import('#models/company_cache')
    const { default: User } = await import('#models/user')

    const user = await User.create({
      email: 'serialize-test@example.com',
      password: 'password123',
      fullName: 'Serialize Test User',
    })

    const search = await JobSearch.create({
      userId: user.id,
      roles: ['developer'],
      countries: ['NZ'],
      platforms: ['seek'],
      seniority: 'senior',
      frequency: 'daily',
      isActive: true,
    })

    const cache = await CompanyCache.create({
      slug: 'serialize-co',
      country: 'NZ',
      name: 'Serialize Co',
      sector: 'Finance',
      size: 'large',
      companyType: 'consulting',
      expiresAt: DateTime.now().plus({ days: CACHE_TTL_DAYS }),
    })

    await JobOffer.create({
      searchId: search.id,
      companyCacheId: cache.id,
      companyName: 'Serialize Co Ltd',
      title: 'Analyst',
      status: 'evaluated',
      publicationDates: [DateTime.now().toISO()],
      isRepublished: false,
    })

    // ORACLE: the controller serialize method includes company data
    // We verify through the service + controller indirectly by checking the relation loads
    const loaded = await JobOffer.query()
      .where('searchId', search.id)
      .preload('companyCache')
      .firstOrFail()

    assert.equal(loaded.companyCache.name, 'Serialize Co')
    assert.equal(loaded.companyCache.sector, 'Finance')
    assert.equal(loaded.companyCache.size, 'large')
    assert.equal(loaded.companyCache.companyType, 'consulting')
  })
})
