import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NotificationBadge } from './notification-badge'

describe('NotificationBadge', () => {
  it('renders badge with count when count > 0', () => {
    render(<NotificationBadge count={5} />)
    const badge = screen.getByTestId('notification-badge')
    expect(badge).toBeDefined()
    // ORACLE: count 5 → display "5"
    expect(badge.textContent).toBe('5')
  })

  it('does not render when count is 0', () => {
    render(<NotificationBadge count={0} />)
    // ORACLE: count 0 → no badge rendered
    const badge = screen.queryByTestId('notification-badge')
    expect(badge).toBeNull()
  })

  it('does not render when count is negative', () => {
    render(<NotificationBadge count={-1} />)
    const badge = screen.queryByTestId('notification-badge')
    expect(badge).toBeNull()
  })

  it('shows 99+ when count exceeds 99', () => {
    render(<NotificationBadge count={150} />)
    const badge = screen.getByTestId('notification-badge')
    // ORACLE: count 150 → display "99+"
    expect(badge.textContent).toBe('99+')
  })

  it('shows exact count at boundary (99)', () => {
    render(<NotificationBadge count={99} />)
    const badge = screen.getByTestId('notification-badge')
    // ORACLE: count 99 → display "99" (not 99+)
    expect(badge.textContent).toBe('99')
  })

  it('has data-testid attribute', () => {
    render(<NotificationBadge count={3} />)
    const badge = screen.getByTestId('notification-badge')
    expect(badge).toBeDefined()
  })
})
