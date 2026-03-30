import { Redis } from 'ioredis'
import env from '#start/env'
import logger from '@adonisjs/core/services/logger'

let redisClient: Redis | null = null

/**
 * Get or create a singleton Redis client for rate limiting.
 * Fails open: returns null if Redis is unavailable.
 */
export function getRedisClient(): Redis | null {
  if (redisClient) return redisClient

  try {
    redisClient = new Redis({
      host: env.get('REDIS_HOST', '127.0.0.1'),
      port: Number(env.get('REDIS_PORT', '6379')),
      password: env.get('REDIS_PASSWORD', '') || undefined,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      retryStrategy(times: number): number | null {
        if (times > 3) return null
        return Math.min(times * 200, 2000)
      },
    })

    redisClient.on('error', (err: Error) => {
      logger.warn({ err: err.message }, 'Redis rate-limiter connection error — failing open')
    })

    redisClient.connect().catch(() => {
      logger.warn('Redis rate-limiter: initial connect failed — failing open')
    })

    return redisClient
  } catch {
    logger.warn('Redis rate-limiter: could not create client — failing open')
    return null
  }
}
