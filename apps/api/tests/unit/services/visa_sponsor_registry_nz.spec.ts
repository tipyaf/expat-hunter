import { test } from '@japa/runner'
import VisaSponsorRegistryService from '#services/visa_sponsor_registry'
import PlaywrightClient from '#services/playwright_client'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a fake Playwright network response matching the immigration.govt.nz API format.
 * "results" is a JSON string (double-encoded) as the real API does it.
 */
function buildNzApiBody(
  employers: Array<{
    employerName: string
    tradingName?: string
    expiryDateOfAccreditation?: string
  }>,
  statusCode = 200
) {
  const results = employers.map((e, i) => ({
    id: { raw: i + 1 },
    title: { raw: e.employerName },
    field_schema: {
      raw: [
        { APIColumn: 'employerName', Value: e.employerName },
        { APIColumn: 'tradingName', Value: e.tradingName ?? '' },
        {
          APIColumn: 'expiryDateOfAccreditation',
          Value: e.expiryDateOfAccreditation ?? '',
        },
        { APIColumn: 'nzbn', Value: '9999999999999' },
      ],
    },
  }))

  const body = JSON.stringify({
    totalResults: employers.length,
    totalPages: 1,
    current: 1,
    results: JSON.stringify(results), // double-encoded
  })

  return { body, statusCode }
}

function buildEmptyNzApiBody() {
  return {
    body: JSON.stringify({ totalResults: 0, totalPages: 0, current: 1, results: '[]' }),
    statusCode: 400,
  }
}

// ─── Mock factory ─────────────────────────────────────────────────────────────

function mockPlaywrightClient(options: {
  sessionId?: string
  networkBody?: string
  networkStatusCode?: number
  throwOnNavigate?: boolean
}): PlaywrightClient {
  return {
    navigate: async () => {
      if (options.throwOnNavigate) throw new Error('Network error')
      return { sessionId: options.sessionId ?? 'test-session-id' }
    },
    waitForSelector: async () => {},
    fill: async () => {},
    fillReactInput: async (_selector: string, value: string) => value, // returns value directly
    evaluate: async () => ({ result: 'Datacom' }),
    click: async () => {},
    getNetworkRequests: async () => ({
      requests: options.networkBody
        ? [
            {
              url: 'https://www.immigration.govt.nz/list-api/getAPIResults/',
              method: 'POST',
              statusCode: options.networkStatusCode ?? 200,
              body: options.networkBody,
            },
          ]
        : [],
    }),
  } as unknown as PlaywrightClient
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.group('VisaSponsorRegistryService — NZ Playwright scraping (unit)', () => {
  test('returns accredited for known NZ employer (Datacom)', async ({ assert }) => {
    const { body, statusCode } = buildNzApiBody([
      { employerName: 'Datacom Systems Limited', tradingName: 'Datacom' },
    ])
    const service = new VisaSponsorRegistryService()
    ;(service as any).playwrightClient = mockPlaywrightClient({
      networkBody: body,
      networkStatusCode: statusCode,
    })
    ;(service as any).nzWaitAfterClickMs = 0
    // Bypass cache
    ;(service as any).cacheService = {
      getOrFetch: async (_s: string, _t: string, _k: string, fn: () => Promise<unknown>) => ({
        data: await fn(),
        fromCache: false,
      }),
    }

    const result = await service.checkNZ('Datacom')

    assert.equal(result.status, 'accredited')
    assert.isTrue(result.isAccredited)
    assert.include(result.countries, 'NZ')
    assert.include(result.visaTypes, 'AEWV')
    assert.isAbove(result.confidence, 0.7)
  })

  test('returns not_found for unknown company', async ({ assert }) => {
    const { body, statusCode } = buildEmptyNzApiBody()
    const service = new VisaSponsorRegistryService()
    ;(service as any).playwrightClient = mockPlaywrightClient({
      networkBody: body,
      networkStatusCode: statusCode,
    })
    ;(service as any).nzWaitAfterClickMs = 0
    ;(service as any).cacheService = {
      getOrFetch: async (_s: string, _t: string, _k: string, fn: () => Promise<unknown>) => ({
        data: await fn(),
        fromCache: false,
      }),
    }

    const result = await service.checkNZ('FakeCompanyXYZ999')

    assert.equal(result.status, 'not_found')
    assert.isFalse(result.isAccredited)
  })

  test('returns unknown when Playwright server is unavailable', async ({ assert }) => {
    const service = new VisaSponsorRegistryService()
    ;(service as any).playwrightClient = mockPlaywrightClient({ throwOnNavigate: true })
    ;(service as any).nzWaitAfterClickMs = 0
    ;(service as any).cacheService = {
      getOrFetch: async (_s: string, _t: string, _k: string, fn: () => Promise<unknown>) => {
        // Let the error bubble so checkNZ catches it
        const data = await fn()
        return { data, fromCache: false }
      },
    }

    const result = await service.checkNZ('AnyCompany')

    assert.equal(result.status, 'unknown')
    assert.isFalse(result.isAccredited)
  })

  test('returns unknown when no network requests intercepted', async ({ assert }) => {
    const service = new VisaSponsorRegistryService()
    ;(service as any).playwrightClient = mockPlaywrightClient({
      sessionId: 'test-session',
      networkBody: undefined, // no requests captured
    })
    ;(service as any).nzWaitAfterClickMs = 0
    ;(service as any).cacheService = {
      getOrFetch: async (_s: string, _t: string, _k: string, fn: () => Promise<unknown>) => ({
        data: await fn(),
        fromCache: false,
      }),
    }

    const result = await service.checkNZ('Datacom')

    // No network body → not_found (page loaded but no API call captured)
    assert.oneOf(result.status, ['not_found', 'unknown'])
  })

  test('returns not_found for expired accreditation', async ({ assert }) => {
    const { body, statusCode } = buildNzApiBody([
      {
        employerName: 'Expired Company Ltd',
        expiryDateOfAccreditation: '2020-01-01', // past date
      },
    ])
    const service = new VisaSponsorRegistryService()
    ;(service as any).playwrightClient = mockPlaywrightClient({
      networkBody: body,
      networkStatusCode: statusCode,
    })
    ;(service as any).nzWaitAfterClickMs = 0
    ;(service as any).cacheService = {
      getOrFetch: async (_s: string, _t: string, _k: string, fn: () => Promise<unknown>) => ({
        data: await fn(),
        fromCache: false,
      }),
    }

    const result = await service.checkNZ('Expired Company')

    assert.equal(result.status, 'not_found')
    assert.isFalse(result.isAccredited)
  })

  test('parseNzApiResponse — double-encoded results string is parsed correctly', async ({
    assert,
  }) => {
    const service = new VisaSponsorRegistryService()
    const { body } = buildNzApiBody([{ employerName: 'Spark New Zealand' }])

    const result = (service as any).parseNzApiResponse(body, 200, 'spark new zealand')

    assert.equal(result.status, 'accredited')
    assert.equal(result.matchedName, 'Spark New Zealand')
  })
})

// ─── Integration test against the real site ──────────────────────────────────
// These tests require PLAYWRIGHT_SERVER_URL + PLAYWRIGHT_SERVER_TOKEN to be set.
// They validate that results match what the real immigration.govt.nz site returns.

test.group('VisaSponsorRegistryService — NZ real-site integration', (group) => {
  const hasCredentials =
    !!process.env.PLAYWRIGHT_SERVER_URL && !!process.env.PLAYWRIGHT_SERVER_TOKEN

  group.tap((t) => {
    if (!hasCredentials) t.skip(true, 'PLAYWRIGHT_SERVER_URL or PLAYWRIGHT_SERVER_TOKEN not set')
  })

  test('Datacom is accredited on immigration.govt.nz', async ({ assert }) => {
    const service = new VisaSponsorRegistryService()
    ;(service as any).cacheService = {
      getOrFetch: async (_s: string, _t: string, _k: string, fn: () => Promise<unknown>) => ({
        data: await fn(),
        fromCache: false,
      }),
    }

    const result = await service.checkNZ('Datacom')

    assert.equal(
      result.status,
      'accredited',
      `Expected Datacom to be accredited on immigration.govt.nz but got: ${result.status} (confidence=${result.confidence})`
    )
    assert.isAbove(result.confidence, 0.7)
    assert.include(result.visaTypes, 'AEWV')
  }).timeout(30_000)

  test('FakeCompanyXYZ999 is not found on immigration.govt.nz', async ({ assert }) => {
    const service = new VisaSponsorRegistryService()
    ;(service as any).cacheService = {
      getOrFetch: async (_s: string, _t: string, _k: string, fn: () => Promise<unknown>) => ({
        data: await fn(),
        fromCache: false,
      }),
    }

    const result = await service.checkNZ('FakeCompanyXYZ999')

    assert.equal(
      result.status,
      'not_found',
      `Expected FakeCompanyXYZ999 to be not_found but got: ${result.status}`
    )
  }).timeout(30_000)

  test('Spark NZ is accredited on immigration.govt.nz', async ({ assert }) => {
    const service = new VisaSponsorRegistryService()
    ;(service as any).cacheService = {
      getOrFetch: async (_s: string, _t: string, _k: string, fn: () => Promise<unknown>) => ({
        data: await fn(),
        fromCache: false,
      }),
    }

    const result = await service.checkNZ('Spark New Zealand')

    assert.equal(
      result.status,
      'accredited',
      `Expected Spark NZ to be accredited but got: ${result.status}`
    )
  }).timeout(30_000)
})
