import Contact from '#models/contact'
import ContactMovement from '#models/contact_movement'
import BlockedEntity from '#models/blocked_entity'
import type { MovementTrigger } from '#models/contact_movement'
import type { BlockedEntityType } from '#models/blocked_entity'
import { DateTime } from 'luxon'

export default class ContactMovementService {
  /**
   * Record a status change movement for a contact.
   */
  async recordMovement(
    contactId: string,
    fromStatus: string,
    toStatus: string,
    trigger: MovementTrigger = 'manual'
  ): Promise<void> {
    await ContactMovement.create({ contactId, fromStatus, toStatus, trigger })
  }

  /**
   * Move a contact to a new status and record the movement.
   */
  async moveContact(
    contactId: string,
    toStatus: string,
    trigger: MovementTrigger = 'manual'
  ): Promise<void> {
    const contact = await Contact.findOrFail(contactId)
    const fromStatus = contact.status
    if (fromStatus === toStatus) return

    contact.status = toStatus as Contact['status']
    await contact.save()
    await this.recordMovement(contactId, fromStatus, toStatus, trigger)
  }

  /**
   * Get all movements for a contact, ordered by most recent first.
   */
  async getMovements(contactId: string): Promise<ContactMovement[]> {
    return ContactMovement.query()
      .where('contactId', contactId)
      .orderBy('createdAt', 'desc')
  }

  /**
   * Block an entity (contact or company) for a user.
   */
  async block(
    userId: string,
    entityType: BlockedEntityType,
    entityId: string,
    reason?: string,
    durationDays?: number
  ): Promise<BlockedEntity> {
    const blockedUntil = durationDays
      ? DateTime.now().plus({ days: durationDays })
      : null

    const existing = await BlockedEntity.query()
      .where('userId', userId)
      .where('entityType', entityType)
      .where('entityId', entityId)
      .first()

    if (existing) {
      existing.reason = reason ?? existing.reason
      existing.blockedUntil = blockedUntil
      await existing.save()
      return existing
    }

    return BlockedEntity.create({ userId, entityType, entityId, reason, blockedUntil })
  }

  /**
   * Unblock an entity.
   */
  async unblock(userId: string, blockedId: string): Promise<void> {
    await BlockedEntity.query()
      .where('id', blockedId)
      .where('userId', userId)
      .delete()
  }

  /**
   * Get all active blocks for a user.
   */
  async getBlocked(userId: string): Promise<BlockedEntity[]> {
    const all = await BlockedEntity.query().where('userId', userId).orderBy('createdAt', 'desc')
    return all.filter((b) => b.isActive)
  }

  /**
   * Check if a contact or company is blocked for a user.
   */
  async isBlocked(userId: string, entityType: BlockedEntityType, entityId: string): Promise<boolean> {
    const block = await BlockedEntity.query()
      .where('userId', userId)
      .where('entityType', entityType)
      .where('entityId', entityId)
      .first()
    return block ? block.isActive : false
  }

  /**
   * Get IDs of blocked contacts and companies for a user (for pipeline exclusion).
   */
  async getBlockedIds(userId: string): Promise<{ contactIds: string[]; companyIds: string[] }> {
    const blocks = await BlockedEntity.query().where('userId', userId)
    const active = blocks.filter((b) => b.isActive)
    return {
      contactIds: active.filter((b) => b.entityType === 'contact').map((b) => b.entityId),
      companyIds: active.filter((b) => b.entityType === 'company').map((b) => b.entityId),
    }
  }
}
