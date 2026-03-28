import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PasswordInput } from './password-input'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      showPassword: 'Show password',
      hidePassword: 'Hide password',
    }
    return messages[key] ?? key
  },
}))

describe('PasswordInput', () => {
  it('renders with type="password" by default (masked)', () => {
    render(<PasswordInput placeholder="Enter password" />)
    const input = screen.getByPlaceholderText('Enter password')
    expect(input).toHaveAttribute('type', 'password')
  })

  it('shows Eye icon when password is hidden', () => {
    render(<PasswordInput />)
    const toggle = screen.getByRole('button', { name: 'Show password' })
    expect(toggle).toBeDefined()
  })

  it('toggles type to "text" when the toggle button is clicked', () => {
    render(<PasswordInput placeholder="Enter password" />)
    const input = screen.getByPlaceholderText('Enter password')
    const toggle = screen.getByRole('button', { name: 'Show password' })

    expect(input).toHaveAttribute('type', 'password')
    fireEvent.click(toggle)
    expect(input).toHaveAttribute('type', 'text')
  })

  it('toggles back to "password" on second click', () => {
    render(<PasswordInput placeholder="Enter password" />)
    const input = screen.getByPlaceholderText('Enter password')
    const toggle = screen.getByRole('button', { name: 'Show password' })

    fireEvent.click(toggle)
    expect(input).toHaveAttribute('type', 'text')

    const hideToggle = screen.getByRole('button', { name: 'Hide password' })
    fireEvent.click(hideToggle)
    expect(input).toHaveAttribute('type', 'password')
  })

  it('updates aria-label to "Hide password" when password is visible', () => {
    render(<PasswordInput />)
    const toggle = screen.getByRole('button', { name: 'Show password' })
    fireEvent.click(toggle)
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeDefined()
  })

  it('passes additional props to the input element', () => {
    render(<PasswordInput id="my-pass" required minLength={8} />)
    const inputById = document.getElementById('my-pass') as HTMLInputElement
    expect(inputById).not.toBeNull()
    expect(inputById.required).toBe(true)
    expect(inputById.minLength).toBe(8)
  })

  it('each instance has independent state', () => {
    render(
      <>
        <PasswordInput placeholder="first" />
        <PasswordInput placeholder="second" />
      </>,
    )
    const [toggle1] = screen.getAllByRole('button', { name: 'Show password' })
    fireEvent.click(toggle1)

    const inputs = screen.getAllByPlaceholderText(/first|second/)
    const firstInput = inputs.find((el) => el.getAttribute('placeholder') === 'first')
    const secondInput = inputs.find((el) => el.getAttribute('placeholder') === 'second')

    expect(firstInput).toHaveAttribute('type', 'text')
    expect(secondInput).toHaveAttribute('type', 'password')
  })
})
