import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { getRedisClient } from '#config/limiter'
import { RATE_LIMIT_PREFIX } from '#constants/auth'
import logger from '@adonisjs/core/services/logger'
import app from '@adonisjs/core/services/app'

interface RateLimitOptions {
  /** Max requests allowed in the window */
  maxAttempts: number
  /** Window duration in seconds */
  windowSeconds: number
  /** Key prefix to distinguish routes */
  keyPrefix: string
}

/**
 * Rate limiter middleware factory.
 * Uses Redis sliding window counter. Fails open if Redis is unavailable.
 */
export function rateLimiter(options: RateLimitOptions) {
  return async function rateLimiterMiddleware(ctx: HttpContext, next: NextFn) {
    // Skip rate limiting in test environment to avoid interference with functional tests.
    // The antibot.spec.ts tests rate limiting explicitly by flushing Redis keys.
    if (app.inTest) {
      return next()
    }

    const redis = getRedisClient()

    // Fail open: if Redis is unavailable, allow the request
    if (!redis) {
      logger.debug('Rate limiter: Redis unavailable — failing open')
      return next()
    }

    const ip = ctx.request.ip()
    const key = `${RATE_LIMIT_PREFIX}${options.keyPrefix}:${ip}`

    try {
      const current = await redis.incr(key)

      // Set TTL on first request in the window
      if (current === 1) {
        await redis.expire(key, options.windowSeconds)
      }

      if (current > options.maxAttempts) {
        const ttl = await redis.ttl(key)
        ctx.response.header('Retry-After', String(ttl > 0 ? ttl : options.windowSeconds))
        return ctx.response.tooManyRequests({
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests. Please try again later.',
            retryAfter: ttl > 0 ? ttl : options.windowSeconds,
          },
        })
      }
    } catch (err) {
      // Fail open on Redis errors
      logger.warn({ err }, 'Rate limiter: Redis error — failing open')
    }

    return next()
  }
}
