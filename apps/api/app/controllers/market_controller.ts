import type { HttpContext } from '@adonisjs/core/http'
import MarketSnapshotService from '#services/market_snapshot_service'

export default class MarketController {
  private marketService = new MarketSnapshotService()

  /**
   * GET /api/market/snapshot?country=X&sector=Y — Get market snapshot.
   */
  async snapshot({ auth, request, response }: HttpContext) {
    auth.getUserOrFail()
    const country = request.input('country')
    const sector = request.input('sector')

    if (!country || typeof country !== 'string' || country.length < 2) {
      return response.badRequest({
        error: {
          code: 'COUNTRY_REQUIRED',
          message: 'A valid country is required',
        },
      })
    }

    const snapshot = await this.marketService.getSnapshot(country, sector ?? undefined)

    return response.ok({ data: snapshot })
  }
}
