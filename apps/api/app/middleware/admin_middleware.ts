import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class AdminMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    await ctx.auth.authenticate()
    const user = ctx.auth.getUserOrFail()

    if (!user.isAdmin) {
      return ctx.response.forbidden({
        error: { code: 'ADMIN_REQUIRED', message: 'Admin access required' },
      })
    }

    return next()
  }
}
