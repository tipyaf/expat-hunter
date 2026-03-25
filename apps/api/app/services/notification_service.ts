import { EventEmitter } from 'node:events'

export interface NotificationEvent {
  type: 'search_completed' | 'reply_received' | 'email_sent'
  message: string
  data?: Record<string, unknown>
}

// Singleton emitter
const emitter = new EventEmitter()
emitter.setMaxListeners(100)

export default class NotificationService {
  static subscribe(userId: string, handler: (event: NotificationEvent) => void): void {
    emitter.on(`user:${userId}`, handler)
  }

  static unsubscribe(userId: string, handler: (event: NotificationEvent) => void): void {
    emitter.off(`user:${userId}`, handler)
  }

  static emit(userId: string, event: NotificationEvent): void {
    emitter.emit(`user:${userId}`, event)
  }
}
