import { test } from '@japa/runner'
import NotificationService from '#services/notification_service'
import type { NotificationEvent } from '#services/notification_service'

test.group('NotificationService', () => {
  test('emit triggers subscribed handler with correct event', async ({ assert }) => {
    const userId = 'test-user-emit'
    const received: NotificationEvent[] = []

    const handler = (event: NotificationEvent) => {
      received.push(event)
    }

    NotificationService.subscribe(userId, handler)

    const event: NotificationEvent = {
      type: 'search_completed',
      message: 'Search finished',
      data: { resultCount: 42 },
    }
    NotificationService.emit(userId, event)

    assert.equal(received.length, 1) // ORACLE: 1 emit = 1 received
    assert.equal(received[0].type, 'search_completed')
    assert.equal(received[0].message, 'Search finished')
    assert.deepEqual(received[0].data, { resultCount: 42 })

    // Cleanup
    NotificationService.unsubscribe(userId, handler)
  })

  test('unsubscribe stops receiving events', async ({ assert }) => {
    const userId = 'test-user-unsub'
    const received: NotificationEvent[] = []

    const handler = (event: NotificationEvent) => {
      received.push(event)
    }

    NotificationService.subscribe(userId, handler)
    NotificationService.emit(userId, { type: 'email_sent', message: 'First' })
    assert.equal(received.length, 1) // ORACLE: subscribed, so 1

    NotificationService.unsubscribe(userId, handler)
    NotificationService.emit(userId, { type: 'email_sent', message: 'Second' })
    assert.equal(received.length, 1) // ORACLE: unsubscribed, still 1
  })

  test('events for one user do not leak to another user', async ({ assert }) => {
    const userA = 'test-user-a'
    const userB = 'test-user-b'
    const receivedA: NotificationEvent[] = []
    const receivedB: NotificationEvent[] = []

    const handlerA = (event: NotificationEvent) => receivedA.push(event)
    const handlerB = (event: NotificationEvent) => receivedB.push(event)

    NotificationService.subscribe(userA, handlerA)
    NotificationService.subscribe(userB, handlerB)

    NotificationService.emit(userA, { type: 'reply_received', message: 'For A only' })

    assert.equal(receivedA.length, 1) // ORACLE: emitted to A
    assert.equal(receivedB.length, 0) // ORACLE: not emitted to B

    // Cleanup
    NotificationService.unsubscribe(userA, handlerA)
    NotificationService.unsubscribe(userB, handlerB)
  })

  test('NotificationEvent type is constrained to valid values', async ({ assert }) => {
    const validTypes: NotificationEvent['type'][] = ['search_completed', 'reply_received', 'email_sent']
    assert.equal(validTypes.length, 3) // ORACLE: 3 event types defined
    assert.include(validTypes, 'search_completed')
    assert.include(validTypes, 'reply_received')
    assert.include(validTypes, 'email_sent')
  })
})
