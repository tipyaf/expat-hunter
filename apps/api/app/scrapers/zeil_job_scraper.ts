/**
 * ZeilJobScraper — Scrapes job offers from Zeil (NZ) via custom Playwright server.
 *
 * IMPORTANT: Zeil does NOT use Apify. The n8n workflow (BGR_U_WNHN1ChfRAe2yaj +
 * bQq2XdV0qrJGisGl) uses a self-hosted Playwright server to navigate
 * zeil.com, extract job listings via DOM evaluation, and return structured data.
 *
 * This scraper replicates the same approach: it calls the Playwright server
 * to navigate, evaluate JS, and extract job data.
 *
 * Requires PLAYWRIGHT_SERVER_URL and PLAYWRIGHT_SERVER_TOKEN env vars.
 */
import env from '#start/env'
import type { RawJobOffer } from '@expat-hunter/shared'
import { BaseJobOfferScraper, type JobOfferScrapeParams } from './base_job_offer_scraper.js'

/**
 * Shape verified against real n8n workflow execution (bQq2XdV0qrJGisGl,
 * execution 6700 — 2026-04-05). All fields are always present in the
 * "Run Evaluate" output; empty values are '' or [].
 */
interface ZeilScrapedJob {
  company_name: string
  role: string
  posted_at: string
  id: string
  content: string
  jobLink: string
  hard_skills: string[]
  soft_skills: string[]
}

const ZEIL_BASE_URL = 'https://www.zeil.com/jobs'
const APPLY_URL_TEMPLATE = 'https://app.zeil.com/app/candidate/job'

export class ZeilJobScraper extends BaseJobOfferScraper {
  readonly name = 'zeil-jobs'
  readonly platform = 'zeil' as const
  private readonly serverUrl: string
  private readonly serverToken: string

  constructor() {
    super()
    this.serverUrl = env.get('PLAYWRIGHT_SERVER_URL', '')
    this.serverToken = env.get('PLAYWRIGHT_SERVER_TOKEN', '')
  }

  get isConfigured(): boolean {
    return this.serverUrl.length > 0 && this.serverToken.length > 0
  }

  async scrape(params: JobOfferScrapeParams): Promise<RawJobOffer[]> {
    if (!this.isConfigured) {
      throw new Error('PLAYWRIGHT_SERVER_URL or PLAYWRIGHT_SERVER_TOKEN is not configured')
    }

    const keywords = params.roles.join('-').toLowerCase()
    const city = (params.city ?? 'auckland').toLowerCase()
    const searchUrl = `${ZEIL_BASE_URL}/${encodeURIComponent(city)}/${encodeURIComponent(keywords)}`

    const sessionId = `zeil-${Date.now()}`

    try {
      await this.navigateToPage(sessionId, searchUrl)
      const jobs = await this.extractJobs(sessionId)
      return jobs.map((job) => this.toRawJobOffer(job))
    } finally {
      await this.closeSession(sessionId)
    }
  }

  private async callServer(body: Record<string, unknown>): Promise<unknown> {
    const response = await fetch(`${this.serverUrl}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.serverToken}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`Playwright server returned ${response.status}`)
    }

    return response.json()
  }

  private async navigateToPage(sessionId: string, url: string): Promise<void> {
    await this.callServer({
      tool: 'navigate',
      sessionId,
      arguments: { url },
    })
  }

  private async extractJobs(sessionId: string): Promise<ZeilScrapedJob[]> {
    const script = this.buildExtractionScript()
    const result = (await this.callServer({
      tool: 'evaluate',
      sessionId,
      arguments: { script },
    })) as { success: boolean; result: ZeilScrapedJob[] }

    if (!result.success || !Array.isArray(result.result)) {
      return []
    }

    return result.result.filter((job) => !('error' in job))
  }

  private async closeSession(sessionId: string): Promise<void> {
    try {
      await this.callServer({ tool: 'close_session', sessionId })
    } catch {
      /* best-effort cleanup */
    }
  }

  private toRawJobOffer(job: ZeilScrapedJob): RawJobOffer {
    return {
      title: job.role || 'Untitled',
      company: job.company_name || 'Unknown',
      location: 'New Zealand',
      url: job.jobLink,
      platform: 'zeil',
      externalId: job.id || null,
      salaryMin: null,
      salaryMax: null,
      currency: null,
      closingDate: null,
      description: job.content || null,
      remoteType: this.detectRemoteType(job.content),
      contactEmail: null,
      applyUrl: job.id ? `${APPLY_URL_TEMPLATE}/${job.id}/apply` : null,
    }
  }

  private detectRemoteType(content: string): RawJobOffer['remoteType'] {
    if (!content) return null
    const lower = content.toLowerCase()
    if (lower.includes('remote')) return 'remote'
    if (lower.includes('hybrid')) return 'hybrid'
    return null
  }

  /**
   * JS script executed in the browser context to extract job listings.
   * Mirrors the n8n workflow's "Prepare Evaluate Script" node exactly.
   */
  private buildExtractionScript(): string {
    return `(async function() {
  var allAnchors = Array.from(document.querySelectorAll("a"));
  var jobAnchors = allAnchors.filter(function(a) {
    return a.href && a.href.indexOf("/jobs/job/") > -1 && a.parentElement && a.parentElement.tagName === "H3";
  });
  var rawUrls = jobAnchors.map(function(a) { return a.href; });
  var urls = rawUrls.filter(function(url, idx) { return rawUrls.indexOf(url) === idx; });
  var jobs = [];
  if (urls.length > 0) {
    for (var i = 0; i < urls.length; i++) {
      var url = urls[i];
      try {
        var resp = await fetch(url);
        var html = await resp.text();
        var doc = new DOMParser().parseFromString(html, "text/html");
        var companyLink = doc.querySelector(".company > a");
        var company_name = companyLink ? companyLink.textContent.trim() : "";
        var h2 = doc.querySelector(".title-container > h2");
        var role = h2 ? h2.textContent.trim() : "";
        var posted_at = "";
        var liEls = Array.from(doc.querySelectorAll("li"));
        var jobLink = url;
        for (var j = 0; j < liEls.length; j++) {
          if (liEls[j].textContent.trim().indexOf("Posted") === 0) {
            posted_at = liEls[j].textContent.trim();
            break;
          }
        }
        var id = "";
        var docLinks = Array.from(doc.querySelectorAll("a"));
        var saveLink = docLinks.find(function(a) { return a.href && a.href.indexOf("/candidate/home/") > -1; });
        if (saveLink) {
          var homeIdx = saveLink.href.indexOf("/home/");
          if (homeIdx >= 0) { id = saveLink.href.substring(homeIdx + 6).split("/")[0]; }
        }
        if (!id) {
          var jobIdx = url.indexOf("/job/");
          if (jobIdx >= 0) { id = url.substring(jobIdx + 5).split("?")[0].split("/")[0]; }
        }
        var headings = Array.from(doc.querySelectorAll("h3"));
        var hardHeading = null, softHeading = null;
        for (var k = 0; k < headings.length; k++) {
          if (headings[k].textContent.indexOf("Hard Skills") > -1) hardHeading = headings[k];
          if (headings[k].textContent.indexOf("Soft Skills") > -1) softHeading = headings[k];
        }
        var hardList = hardHeading ? hardHeading.nextElementSibling : null;
        var softList = softHeading ? softHeading.nextElementSibling : null;
        var hard_skills = hardList ? Array.from(hardList.querySelectorAll("li")).map(function(li) { return li.textContent.trim(); }) : [];
        var soft_skills = softList ? Array.from(softList.querySelectorAll("li")).map(function(li) { return li.textContent.trim(); }) : [];
        var mainEl = doc.querySelector("main");
        var allEls = mainEl ? Array.from(mainEl.querySelectorAll("p, li")) : [];
        var content = allEls.filter(function(el) {
          return !(hardList && hardList.contains(el)) && !(softList && softList.contains(el)) && el.textContent.trim().length > 10;
        }).map(function(el) { return el.textContent.trim(); }).join(" ").substring(0, 5000);
        jobs.push({ company_name: company_name, role: role, posted_at: posted_at, id: id, content: content, jobLink: jobLink, hard_skills: hard_skills, soft_skills: soft_skills });
      } catch(ex) {
        jobs.push({ error: ex.message, url: url });
      }
    }
  }
  return jobs;
})();`
  }
}
