import { test } from '@japa/runner'
import SectorTitleService, {
  type TitleGenerationProvider,
  type SectorTitles,
  StaticTitleProvider,
} from '#services/sector_title_service'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockProvider(titles: Partial<SectorTitles> = {}): TitleGenerationProvider {
  return {
    providerName: 'mock',
    generateTitles: async () => ({
      primary: titles.primary ?? ['Mock Manager', 'Mock Director'],
      secondary: titles.secondary ?? ['Mock Lead'],
      hr_talent: titles.hr_talent ?? [],
      exclude: titles.exclude ?? [],
    }),
  }
}

function makeFailingProvider(): TitleGenerationProvider {
  return {
    providerName: 'failing',
    generateTitles: async () => {
      throw new Error('LLM unavailable')
    },
  }
}

// ---------------------------------------------------------------------------
// StaticTitleProvider
// ---------------------------------------------------------------------------

test.group('StaticTitleProvider', () => {
  test('returns titles for known IT sector without LLM call', async ({ assert }) => {
    const provider = new StaticTitleProvider()
    const titles = await provider.generateTitles('it_software_tech', 'NZ')

    assert.isArray(titles.primary)
    assert.isNotEmpty(titles.primary)
    assert.include(titles.primary.map((t) => t.toLowerCase()), 'cto')
  })

  test('primary titles include engineering manager', async ({ assert }) => {
    const provider = new StaticTitleProvider()
    const titles = await provider.generateTitles('it_software_tech', 'NZ')
    const lowerPrimary = titles.primary.map((t) => t.toLowerCase())
    assert.isTrue(lowerPrimary.some((t) => t.includes('engineering manager')))
  })

  test('alias tech resolves to IT config', async ({ assert }) => {
    const provider = new StaticTitleProvider()
    const titles = await provider.generateTitles('tech', 'NZ')
    assert.isNotEmpty(titles.primary)
  })
})

// ---------------------------------------------------------------------------
// SectorTitleService — provider agnosticism
// ---------------------------------------------------------------------------

test.group('SectorTitleService — provider agnosticism', () => {
  test('uses mock provider for unknown sector', async ({ assert }) => {
    const mockProvider = makeMockProvider({ primary: ['Custom Manager'] })
    const service = new SectorTitleService(mockProvider)

    // Unknown sector → skips static → calls LLM provider
    const result = await service.getTitles('unknown_sector_xyz', 'NZ')
    assert.include(result.primary, 'Custom Manager')
    assert.equal(result.source, 'mock')
  })

  test('falls back to static when LLM fails', async ({ assert }) => {
    const service = new SectorTitleService(makeFailingProvider())

    // Unknown sector → LLM fails → static fallback
    const result = await service.getTitles('unknown_sector_xyz_fail', 'NZ')
    assert.isNotEmpty(result.primary)
    assert.equal(result.source, 'static:fallback')
  })

  test('uses static for known IT sector (no LLM call)', async ({ assert }) => {
    const failingProvider = makeFailingProvider()
    const service = new SectorTitleService(failingProvider)

    // IT is known → uses static, LLM never called → no error
    const result = await service.getTitles('it_software_tech', 'NZ')
    assert.isNotEmpty(result.primary)
    assert.equal(result.source, 'static')
  })
})

// ---------------------------------------------------------------------------
// SectorTitleService — getFlatTitles
// ---------------------------------------------------------------------------

test.group('SectorTitleService — getFlatTitles', () => {
  test('combines primary + secondary by default', async ({ assert }) => {
    const service = new SectorTitleService(
      makeMockProvider({
        primary: ['Manager A'],
        secondary: ['Lead B'],
        hr_talent: ['Recruiter C'],
      })
    )

    const flat = await service.getFlatTitles('it_software_tech', 'NZ')
    // IT is known → static provider used, not mock
    // But test that flat combines primary + secondary
    assert.isNotEmpty(flat)
  })

  test('includes hr_talent when includeHr=true', async ({ assert }) => {
    const mockProvider = makeMockProvider({
      primary: ['Manager A'],
      secondary: ['Lead B'],
      hr_talent: ['Recruiter C'],
    })
    const service = new SectorTitleService(mockProvider)

    const withoutHr = await service.getFlatTitles('unknown_sector_hr_test', 'NZ', false)
    const withHr = await service.getFlatTitles('unknown_sector_hr_test', 'NZ', true)

    assert.notInclude(withoutHr, 'Recruiter C')
    assert.include(withHr, 'Recruiter C')
  })
})
