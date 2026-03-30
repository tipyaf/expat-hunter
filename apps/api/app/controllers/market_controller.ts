import type { HttpContext } from '@adonisjs/core/http'
import MarketSnapshotService from '#services/market_snapshot_service'
import { LOCALE_NAMES } from '../constants/locale.js'

export default class MarketController {
  private marketService = new MarketSnapshotService()

  /**
   * GET /api/market/snapshot?country=X&sector=Y&lang=Z — Get market snapshot.
   * ?lang is sanitized — only values present in LOCALE_NAMES are accepted.
   * Fallback order: ?lang → user.locale → 'fr'.
   */
  async snapshot({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const country = request.input('country')
    const sector = request.input('sector')
    const rawLang = (request.input('lang') as string | null) ?? user.locale ?? 'fr'
    const lang = LOCALE_NAMES[rawLang] ? rawLang : 'fr'

    if (!country || typeof country !== 'string' || country.length < 2) {
      return response.badRequest({
        error: {
          code: 'COUNTRY_REQUIRED',
          message: 'A valid country is required',
        },
      })
    }

    const snapshot = await this.marketService.getSnapshot(country, sector ?? undefined, lang)

    return response.ok({ data: snapshot })
  }
}
