import { test } from '@japa/runner'
import SourcingOrchestrator from '#services/sourcing_orchestrator'

test.group('SourcingOrchestrator — isRunning', () => {
  test('returns false when no run in progress', ({ assert }) => {
    assert.isFalse(SourcingOrchestrator.isRunning('user-123'))
  })

  test('returns false for different userId', ({ assert }) => {
    assert.isFalse(SourcingOrchestrator.isRunning('user-456'))
  })
})

test.group('SourcingOrchestrator — structure', () => {
  test('class can be instantiated', ({ assert }) => {
    const orchestrator = new SourcingOrchestrator()
    assert.isDefined(orchestrator)
    assert.isFunction(orchestrator.run)
  })

  test('run method exists and requires userId, country', ({ assert }) => {
    const orchestrator = new SourcingOrchestrator()
    assert.equal(orchestrator.run.length, 4) // userId, country, sector?, sourceNames?
  })
})
