import ExternalCache from '#models/external_cache'
import { DateTime } from 'luxon'

export type EntityType = 'company' | 'contact' | 'market' | 'visa'

const DEFAULT_TTL_DAYS: Record<EntityType, number> = {
  company: 30,
  contact: 14,
  market: 7,
  visa: 90,
}

export default class CacheService {
  /**
   * Cache-first: return cached data if fresh, otherwise call fetcher and cache the result.
   */
  async getOrFetch<T extends Record<string, unknown>>(
    source: string,
    entityType: EntityType,
    entityKey: string,
    fetcher: () => Promise<T>,
    ttlDays?: number
  ): Promise<{ data: T; fromCache: boolean; fetchedAt: DateTime }> {
    const cached = await ExternalCache.query()
      .where('source', source)
      .where('entityType', entityType)
      .where('entityKey', entityKey)
      .first()

    if (cached && !cached.isExpired) {
      return {
        data: cached.data as T,
        fromCache: true,
        fetchedAt: cached.fetchedAt,
      }
    }

    const freshData = await fetcher()
    const ttl = ttlDays ?? DEFAULT_TTL_DAYS[entityType]
    const now = DateTime.now()

    if (cached) {
      cached.data = freshData
      cached.fetchedAt = now
      cached.expiresAt = now.plus({ days: ttl })
      await cached.save()
    } else {
      await ExternalCache.create({
        source,
        entityType,
        entityKey,
        data: freshData,
        fetchedAt: now,
        expiresAt: now.plus({ days: ttl }),
      })
    }

    return {
      data: freshData,
      fromCache: false,
      fetchedAt: now,
    }
  }

  /**
   * Get cached data without fetching. Returns null if not cached or expired.
   */
  async get<T extends Record<string, unknown>>(
    source: string,
    entityType: EntityType,
    entityKey: string
  ): Promise<{ data: T; fetchedAt: DateTime } | null> {
    const cached = await ExternalCache.query()
      .where('source', source)
      .where('entityType', entityType)
      .where('entityKey', entityKey)
      .first()

    if (!cached || cached.isExpired) return null

    return { data: cached.data as T, fetchedAt: cached.fetchedAt }
  }

  /**
   * Invalidate a specific cache entry.
   */
  async invalidate(source: string, entityType: EntityType, entityKey: string): Promise<void> {
    await ExternalCache.query()
      .where('source', source)
      .where('entityType', entityType)
      .where('entityKey', entityKey)
      .delete()
  }

  /**
   * Purge all expired entries.
   */
  async purgeExpired(): Promise<number> {
    const result = await ExternalCache.query()
      .where('expiresAt', '<', DateTime.now().toSQL()!)
      .delete()
    return result[0] ?? 0
  }

  /**
   * Get cache statistics for admin dashboard.
   */
  async getStats(): Promise<{
    totalEntries: number
    expiredEntries: number
    byType: Record<string, { count: number; avgAgeDays: number }>
    bySource: Record<string, number>
  }> {
    const now = DateTime.now()

    const allEntries = await ExternalCache.query()
    const totalEntries = allEntries.length
    const expiredEntries = allEntries.filter((e) => e.isExpired).length

    const byType: Record<string, { count: number; avgAgeDays: number }> = {}
    const bySource: Record<string, number> = {}

    for (const entry of allEntries) {
      // By type
      if (!byType[entry.entityType]) {
        byType[entry.entityType] = { count: 0, avgAgeDays: 0 }
      }
      byType[entry.entityType].count++
      const ageDays = now.diff(entry.fetchedAt, 'days').days
      byType[entry.entityType].avgAgeDays += ageDays

      // By source
      bySource[entry.source] = (bySource[entry.source] ?? 0) + 1
    }

    // Compute averages
    for (const type of Object.keys(byType)) {
      if (byType[type].count > 0) {
        byType[type].avgAgeDays = Math.round(byType[type].avgAgeDays / byType[type].count)
      }
    }

    return { totalEntries, expiredEntries, byType, bySource }
  }
}
