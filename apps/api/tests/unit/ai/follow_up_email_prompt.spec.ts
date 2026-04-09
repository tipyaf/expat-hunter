import { test } from '@japa/runner'
import { buildFollowUpEmailPrompt } from '#ai/prompts/follow_up_email_prompt'

test.group('buildFollowUpEmailPrompt', () => {
  test('generates thank_you prompt with contact name and context', ({ assert }) => {
    // ORACLE: prompt includes thank, contact name, context
    const { system, user } = buildFollowUpEmailPrompt({
      type: 'thank_you',
      contactName: 'John Smith',
      contactRole: 'Engineering Manager',
      companyName: 'Acme Corp',
      context: 'Had a great phone interview about the frontend role',
    })

    assert.isTrue(
      system.includes('thank') || user.includes('thank') || system.includes('Thank') || user.includes('Thank'),
      'prompt should include thank reference'
    )
    assert.isTrue(user.includes('John Smith'))
    assert.isTrue(user.includes('phone interview'))
  })

  test('generates follow_up prompt with polite follow-up instructions', ({ assert }) => {
    // ORACLE: prompt includes follow-up instructions
    const { system, user } = buildFollowUpEmailPrompt({
      type: 'follow_up',
      contactName: 'Jane Doe',
      contactRole: 'HR',
      companyName: 'StartupX',
      context: 'Applied 2 weeks ago, no response yet',
    })

    assert.isTrue(
      system.includes('follow') || system.includes('Follow') || user.includes('follow') || user.includes('Follow'),
      'prompt should include follow-up reference'
    )
  })

  test('generates status_check prompt', ({ assert }) => {
    const { system, user } = buildFollowUpEmailPrompt({
      type: 'status_check',
      contactName: 'Bob',
      contactRole: 'CTO',
      companyName: 'TechCo',
      context: 'Waiting for interview feedback',
    })

    assert.isString(system)
    assert.isString(user)
    assert.isTrue(user.includes('Bob'))
    assert.isTrue(user.includes('TechCo'))
  })

  test('sanitizes HTML in inputs', ({ assert }) => {
    const { user } = buildFollowUpEmailPrompt({
      type: 'thank_you',
      contactName: '<img src=x onerror=alert(1)>',
      contactRole: 'Test',
      companyName: 'Corp',
      context: 'Test context',
    })

    assert.isFalse(user.includes('<img'), 'HTML should be escaped')
  })
})
