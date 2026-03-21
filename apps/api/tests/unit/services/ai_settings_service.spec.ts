import { test } from '@japa/runner'
import AiSettingsService from '#services/ai_settings_service'

test.group('AiSettingsService', () => {
  test('cache can be invalidated', ({ assert }) => {
    AiSettingsService.invalidateCache()
    // Should not throw
    assert.isTrue(true)
  })

  test('getConfig returns env fallback when no DB rows exist', async ({ assert }) => {
    AiSettingsService.invalidateCache()
    const config = await AiSettingsService.getConfig('default')
    assert.exists(config.model)
    assert.isNumber(config.temperature)
    assert.isNumber(config.maxTokens)
    assert.isBoolean(config.isEnabled)
  })

  test('getConfig caches results', async ({ assert }) => {
    AiSettingsService.invalidateCache()
    const config1 = await AiSettingsService.getConfig('cv_extraction')
    const config2 = await AiSettingsService.getConfig('cv_extraction')
    assert.deepEqual(config1, config2)
  })
})
