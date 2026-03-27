import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class PlanGuardMiddleware {
  async handle(ctx: HttpContext, next: NextFn): Promise<void> {
    await ctx.auth.authenticate()
    const user = ctx.auth.getUserOrFail()

    if (!user.isPremium) {
      ctx.response.forbidden({
        error: { code: 'PREMIUM_REQUIRED', message: 'This feature requires a Premium plan' },
      })
      return
    }

    return next()
  }
}
