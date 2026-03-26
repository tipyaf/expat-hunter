import env from '#start/env'

// ─── Constants ───────────────────────────────────────────────────────────────

const PLAYWRIGHT_EXECUTE_PATH = '/execute'
const PLAYWRIGHT_TIMEOUT_MS = 20_000

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PlaywrightNavigateResult {
  sessionId: string
}

export interface PlaywrightNetworkRequest {
  url: string
  method: string
  statusCode: number
  body: string
}

export interface PlaywrightNetworkResult {
  requests: PlaywrightNetworkRequest[]
}

export interface PlaywrightEvaluateResult {
  result: unknown
}

// ─── Client ──────────────────────────────────────────────────────────────────

/**
 * HTTP client for the external Playwright server.
 * The server exposes a single POST /execute endpoint that dispatches
 * browser automation tools (navigate, fill, click, get_network_requests, etc.).
 */
export default class PlaywrightClient {
  private readonly baseUrl: string
  private readonly token: string

  constructor() {
    this.baseUrl = env.get('PLAYWRIGHT_SERVER_URL', '')
    this.token = env.get('PLAYWRIGHT_SERVER_TOKEN', '')
  }

  /**
   * Navigate to a URL and start capturing network traffic.
   * Returns a sessionId to use in subsequent calls.
   */
  async navigate(url: string): Promise<PlaywrightNavigateResult> {
    return this.execute<PlaywrightNavigateResult>('navigate', {
      url,
      captureNetwork: true,
    })
  }

  /**
   * Wait for a CSS selector to appear in the page.
   */
  async waitForSelector(selector: string, sessionId: string): Promise<void> {
    await this.execute('wait_for_selector', { selector, sessionId })
  }

  /**
   * Fill an input field with a value.
   */
  async fill(selector: string, value: string, sessionId: string): Promise<void> {
    await this.execute('fill', { selector, value, sessionId })
  }

  /**
   * Fill a React-controlled input by using the native value setter and
   * dispatching synthetic `input` + `change` events.
   * Use this instead of `fill()` when the target input is managed by React/Vue.
   */
  async fillReactInput(selector: string, value: string, sessionId: string): Promise<string> {
    const escapedSelector = selector.replace(/'/g, "\\'")
    const escapedValue = value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

    const result = await this.evaluate(
      `(() => {
        const input = document.querySelector('${escapedSelector}');
        if (!input) return '';
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (setter) setter.call(input, '${escapedValue}');
        else input.value = '${escapedValue}';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return input.value;
      })()`,
      sessionId
    )

    return (result.result as string) ?? ''
  }

  /**
   * Evaluate a JavaScript expression in the page context.
   */
  async evaluate(script: string, sessionId: string): Promise<PlaywrightEvaluateResult> {
    return this.execute<PlaywrightEvaluateResult>('evaluate', { script, sessionId })
  }

  /**
   * Click an element matching the CSS selector.
   */
  async click(selector: string, sessionId: string): Promise<void> {
    await this.execute('click', { selector, sessionId })
  }

  /**
   * Retrieve captured network requests matching a URL pattern.
   */
  async getNetworkRequests(
    urlPattern: string,
    sessionId: string
  ): Promise<PlaywrightNetworkResult> {
    return this.execute<PlaywrightNetworkResult>('get_network_requests', {
      urlPattern,
      sessionId,
    })
  }

  /**
   * Close the browser session on the Playwright server.
   * Best-effort — errors are swallowed so they never mask the original scraping result.
   */
  async close(sessionId: string): Promise<void> {
    try {
      await this.execute<void>('close_session', { sessionId })
    } catch {
      // Session closure is best-effort — never re-throw
    }
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private async execute<T>(tool: string, args: Record<string, unknown>): Promise<T> {
    if (!this.baseUrl || !this.token) {
      throw new Error('PlaywrightClient: PLAYWRIGHT_SERVER_URL or PLAYWRIGHT_SERVER_TOKEN not set')
    }

    const res = await fetch(`${this.baseUrl}${PLAYWRIGHT_EXECUTE_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({ tool, arguments: args }),
      signal: AbortSignal.timeout(PLAYWRIGHT_TIMEOUT_MS),
    })

    if (!res.ok) {
      throw new Error(`PlaywrightClient: tool=${tool} returned HTTP ${res.status}`)
    }

    return res.json() as Promise<T>
  }
}
