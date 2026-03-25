import type { HttpContext } from '@adonisjs/core/http'
import NotificationService, { type NotificationEvent } from '#services/notification_service'

export default class NotificationsController {
  /**
   * GET /api/notifications/stream
   * Server-Sent Events stream for real-time notifications
   */
  async stream({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()

    // Set SSE headers
    response.response.setHeader('Content-Type', 'text/event-stream')
    response.response.setHeader('Cache-Control', 'no-cache')
    response.response.setHeader('Connection', 'keep-alive')
    response.response.setHeader('X-Accel-Buffering', 'no')
    response.response.flushHeaders()

    // Send initial connection event
    response.response.write('event: connected\ndata: {"status":"connected"}\n\n')

    // Keep-alive interval
    const keepAlive = setInterval(() => {
      try {
        response.response.write(': keep-alive\n\n')
      } catch {
        clearInterval(keepAlive)
      }
    }, 15000)

    // Subscribe to events for this user
    const handler = (event: NotificationEvent) => {
      try {
        const data = JSON.stringify(event)
        response.response.write(`event: ${event.type}\ndata: ${data}\n\n`)
      } catch {
        // Client disconnected
      }
    }

    NotificationService.subscribe(user.id, handler)

    // Cleanup on client disconnect
    response.response.on('close', () => {
      clearInterval(keepAlive)
      NotificationService.unsubscribe(user.id, handler)
    })

    // Return a promise that never resolves — SSE keeps connection open
    return new Promise<void>(() => {})
  }
}
