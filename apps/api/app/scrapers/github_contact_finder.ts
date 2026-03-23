/**
 * GitHubContactFinder — Finds technical contacts via GitHub API.
 *
 * Free source (5000 req/h authenticated). GitHub profiles often include
 * company, location, and sometimes public email.
 * Best for IT sector — most tech managers have GitHub profiles.
 */
import { BaseScraper, type ScrapeParams, type RawContact } from './base_scraper.js'
import env from '#start/env'

interface GitHubSearchResponse {
  items: GitHubUser[]
  total_count: number
}

interface GitHubUser {
  login: string
  html_url: string
  name: string | null
  email: string | null
  company: string | null
  bio: string | null
  location: string | null
  public_repos: number
}

const GITHUB_API = 'https://api.github.com'
const NZ_LOCATIONS = ['Auckland', 'Wellington', 'Christchurch', 'Hamilton', 'Tauranga', 'New Zealand']
const AU_LOCATIONS = ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Australia']

const COUNTRY_LOCATIONS: Record<string, string[]> = {
  NZ: NZ_LOCATIONS,
  AU: AU_LOCATIONS,
}

export class GitHubContactFinder extends BaseScraper {
  readonly name = 'github_contact_finder'
  readonly country = '*'
  private token = env.get('GITHUB_TOKEN', '')

  async scrape(params: ScrapeParams): Promise<RawContact[]> {
    const locations = COUNTRY_LOCATIONS[params.country] ?? [params.country]
    const allContacts: RawContact[] = []

    for (const location of locations.slice(0, 3)) {
      const users = await this.searchByLocation(location)
      const contacts = users
        .filter((u) => u.name && u.company)
        .map((u) => this.toRawContact(u, params.country))

      allContacts.push(...contacts)

      if (allContacts.length >= (params.maxResults ?? 50)) break
      await this.delay(1000, 2000)
    }

    return this.deduplicateContacts(allContacts).slice(0, params.maxResults ?? 50)
  }

  /**
   * Search GitHub users by location. Returns up to 30 per call (GitHub default).
   */
  async searchByLocation(location: string): Promise<GitHubUser[]> {
    try {
      const query = encodeURIComponent(`location:"${location}" type:user repos:>5`)
      const url = `${GITHUB_API}/search/users?q=${query}&per_page=30&sort=repositories&order=desc`

      const headers: Record<string, string> = {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'ExpatHunter/1.0',
      }
      if (this.token) {
        headers.Authorization = `Bearer ${this.token}`
      }

      const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) })
      if (!res.ok) return []

      const json = (await res.json()) as GitHubSearchResponse
      const users = json.items ?? []

      // Fetch full profile for each user (search only returns basic info)
      const enriched: GitHubUser[] = []
      for (const user of users.slice(0, 15)) {
        const profile = await this.fetchProfile(user.login, headers)
        if (profile) enriched.push(profile)
        await this.delay(200, 500)
      }

      return enriched
    } catch {
      return []
    }
  }

  /**
   * Fetch a user's full profile (includes email, company, bio).
   */
  private async fetchProfile(login: string, headers: Record<string, string>): Promise<GitHubUser | null> {
    try {
      const res = await fetch(`${GITHUB_API}/users/${login}`, {
        headers,
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) return null
      return (await res.json()) as GitHubUser
    } catch {
      return null
    }
  }

  private toRawContact(user: GitHubUser, country: string): RawContact {
    const companyName = (user.company ?? '')
      .replace(/^@/, '')
      .replace(/\s*\(.*\)/, '')
      .trim()

    return {
      fullName: user.name ?? user.login,
      role: this.inferRole(user),
      email: user.email ?? undefined,
      companyName,
      companyCountry: country,
      source: 'github_contact_finder',
      sourceDetail: `github:${user.login}`,
      emailSource: user.email ? 'scraped' : undefined,
      emailConfidence: user.email ? 70 : undefined,
      githubUrl: user.html_url,
    }
  }

  /**
   * Infer role from bio — GitHub bios often contain job titles.
   */
  private inferRole(user: GitHubUser): string {
    if (!user.bio) return 'Software Engineer'

    const bio = user.bio.toLowerCase()
    const rolePatterns: [string, string][] = [
      ['cto', 'CTO'],
      ['chief technology', 'CTO'],
      ['engineering manager', 'Engineering Manager'],
      ['head of engineering', 'Head of Engineering'],
      ['vp engineering', 'VP Engineering'],
      ['tech lead', 'Tech Lead'],
      ['technical lead', 'Technical Lead'],
      ['lead engineer', 'Lead Engineer'],
      ['principal engineer', 'Principal Engineer'],
      ['staff engineer', 'Staff Engineer'],
      ['founder', 'Founder'],
      ['co-founder', 'Co-Founder'],
      ['director', 'Director of Engineering'],
      ['architect', 'Software Architect'],
      ['senior', 'Senior Software Engineer'],
    ]

    for (const [pattern, title] of rolePatterns) {
      if (bio.includes(pattern)) return title
    }

    return 'Software Engineer'
  }
}
