import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SafeHtml } from './safe-html'

describe('SafeHtml', () => {
  it('renders formatted HTML (bold, lists, headings)', () => {
    const html = '<h2>Title</h2><p><strong>Bold</strong> text</p><ul><li>Item 1</li></ul>'
    render(<SafeHtml html={html} />)

    const container = screen.getByTestId('safe-html')
    expect(container.querySelector('h2')?.textContent).toBe('Title')
    expect(container.querySelector('strong')?.textContent).toBe('Bold')
    expect(container.querySelector('ul')).not.toBeNull()
    expect(container.querySelector('li')?.textContent).toBe('Item 1')
  })

  it('strips <script> tags', () => {
    const html = '<p>Safe content</p><script>alert("xss")</script>'
    render(<SafeHtml html={html} />)

    const container = screen.getByTestId('safe-html')
    expect(container.querySelector('script')).toBeNull()
    expect(container.textContent).toBe('Safe content')
  })

  it('strips onerror, onclick, and onload attributes', () => {
    const html = '<img src="x" onerror="alert(1)" /><div onclick="alert(2)">Click</div><img src="y" onload="alert(3)" />'
    render(<SafeHtml html={html} />)

    const container = screen.getByTestId('safe-html')
    const images = container.querySelectorAll('img')
    const div = container.querySelector('div')

    for (const img of images) {
      expect(img.getAttribute('onerror')).toBeNull()
      expect(img.getAttribute('onload')).toBeNull()
    }
    expect(div?.getAttribute('onclick')).toBeNull()
  })

  it('returns null for null input', () => {
    const { container } = render(<SafeHtml html={null} />)
    expect(container.innerHTML).toBe('')
  })

  it('returns null for empty string input', () => {
    const { container } = render(<SafeHtml html="" />)
    expect(container.innerHTML).toBe('')
  })

  it('preserves <ul>, <ol>, <li>, <a>, <table> tags', () => {
    const html = [
      '<ul><li>Unordered</li></ul>',
      '<ol><li>Ordered</li></ol>',
      '<a href="https://example.com">Link</a>',
      '<table><tr><td>Cell</td></tr></table>',
    ].join('')

    render(<SafeHtml html={html} />)

    const container = screen.getByTestId('safe-html')
    expect(container.querySelector('ul')).not.toBeNull()
    expect(container.querySelector('ol')).not.toBeNull()
    expect(container.querySelectorAll('li')).toHaveLength(2)
    expect(container.querySelector('a')?.getAttribute('href')).toBe('https://example.com')
    expect(container.querySelector('table')).not.toBeNull()
    expect(container.querySelector('td')?.textContent).toBe('Cell')
  })

  it('applies className prop to the container', () => {
    render(<SafeHtml html="<p>Test</p>" className="prose prose-sm" />)

    const container = screen.getByTestId('safe-html')
    expect(container.className).toBe('prose prose-sm')
  })
})
