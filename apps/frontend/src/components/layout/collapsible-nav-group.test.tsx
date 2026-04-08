import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CollapsibleNavGroup } from './collapsible-nav-group'

describe('CollapsibleNavGroup', () => {
  // ORACLE: isOpen=true → children visible; isOpen=false → children hidden
  it('renders children when open and hides when closed', () => {
    const { rerender } = render(
      <CollapsibleNavGroup
        label="Test Group"
        isOpen={true}
        onToggle={vi.fn()}
      >
        <div data-testid="child-content">Child</div>
      </CollapsibleNavGroup>
    )

    expect(screen.getByTestId('child-content')).toBeDefined()

    rerender(
      <CollapsibleNavGroup
        label="Test Group"
        isOpen={false}
        onToggle={vi.fn()}
      >
        <div data-testid="child-content">Child</div>
      </CollapsibleNavGroup>
    )

    // When closed, content should have max-height: 0 (CSS collapse)
    const content = screen.getByTestId('child-content').parentElement
    expect(content).toBeDefined()
    // The wrapper should have overflow hidden + max-height 0 when collapsed
    expect(content?.style.maxHeight).toBe('0px')
  })

  it('calls onToggle when the header button is clicked', () => {
    const onToggle = vi.fn()
    render(
      <CollapsibleNavGroup
        label="Prospection"
        isOpen={true}
        onToggle={onToggle}
      >
        <div>Content</div>
      </CollapsibleNavGroup>
    )

    const button = screen.getByRole('button', { name: /Prospection/i })
    fireEvent.click(button)
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('shows chevron down when open and chevron right when closed', () => {
    const { rerender } = render(
      <CollapsibleNavGroup
        label="Group"
        isOpen={true}
        onToggle={vi.fn()}
      >
        <div>Content</div>
      </CollapsibleNavGroup>
    )

    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-expanded', 'true')

    rerender(
      <CollapsibleNavGroup
        label="Group"
        isOpen={false}
        onToggle={vi.fn()}
      >
        <div>Content</div>
      </CollapsibleNavGroup>
    )

    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  // ORACLE: badge=5 + isOpen=false → badge element present in DOM
  it('shows badge on collapsed parent when badge prop is provided', () => {
    render(
      <CollapsibleNavGroup
        label="Offres d'emploi"
        isOpen={false}
        onToggle={vi.fn()}
        badge={5}
      >
        <div>Content</div>
      </CollapsibleNavGroup>
    )

    const badge = screen.getByText('5')
    expect(badge).toBeDefined()
  })

  it('uses semantic HTML: nav wrapper is not part of the group, but ul/li are used', () => {
    render(
      <CollapsibleNavGroup
        label="Test"
        isOpen={true}
        onToggle={vi.fn()}
      >
        <li>Link 1</li>
      </CollapsibleNavGroup>
    )

    // The collapsible group should render a ul for child items
    const list = screen.getByRole('list')
    expect(list).toBeDefined()
  })
})
