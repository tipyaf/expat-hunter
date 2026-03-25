# sc-31 — Qualified contacts pipeline (hidden market)

## Status
- **Shortcut story**: sc-31 (To Do)
- **Specs produced**:
  - `specs/sc31-contacts-quality-refinement.yaml` — full PO spec
  - `specs/sc31-architecture.md` — detailed technical architecture
  - `specs/contact-sourcing-strategy.yaml` — sourcing strategy v1
- **Agents involved**: PO + Architect consulted on 2026-03-23
- **Study in progress**: dedicated recruitment/company-org agents (see section below)

## Product promise (hidden market)
ExpatHunter targets **operational managers** (not HR) who have hiring authority, BEFORE a job posting is published. The email sent must show the user genuinely researched the company and the person. This is not generic outreach — it is AI-assisted expatriation.

## Validated PO decisions

### Titles by sector
- **Static** base for MVP (zero cost, deterministic, testable)
- **LLM fallback** only for unknown sectors (~$0.001/call, GPT-4o-mini via OpenRouter)
- 30-day cache in DB (`sector_title_cache`)
- 5 MVP sectors: IT, Finance, Marketing, Ops, Construction

### Target contacts
- **Operational managers** only (no HR by default)
- HR optional via UX checkbox (disabled by default)
- IT examples: Engineering Manager, CTO, Head of Engineering, VP Engineering, IT Manager, Director of Engineering, Lead Software Engineer, Software Manager

### Information needed for impactful emails
Company culture, tech stack, required skills, sector, history, current/upcoming projects, current needs, active hiring signals. Sources: website (About page LLM-parsed), Hunter Company Enrichment, Google News, Crunchbase basic.

### Email quality threshold
Any verified email is good, verified is better. Plan internal verification service (SMTP + pattern).

### Legal NZ/AU
Only public aggregated sources. No hidden scraping.

## Validated architect decisions

### Multi-sector architecture
`SectorRegistry` (same pattern as `ScraperRegistry`). Adding a sector = 1 entry, zero code.

### Specialized agents
**No for MVP.** Specialized services are sufficient. Phase 3+ if needed.
(Study in progress on dedicated recruitment/org agents — see below)

### New contact sources
- Hunter Company Search (company discovery)
- GitHub API free (5000 req/h)
- Google → `site:linkedin.com/in` (free, 100/day)

### New services to create
| Service | Responsibility |
|---------|---------------|
| `sourcing_orchestrator.ts` | Entry point, dispatches jobs |
| `context_enrichment_service.ts` | Culture, tech stack, news, signals |
| `sector_title_service.ts` | Titles by sector + 30-day cache |
| `email_verifier.ts` | MX + SMTP + pattern scoring |
| `sector_registry.ts` | Per-sector config (whitelist, keywords) |

### New scrapers
| Scraper | Source | Cost |
|---------|--------|------|
| `hunter_company_search_scraper.ts` | Hunter Company Search API | Credits |
| `github_contact_finder.ts` | GitHub public API | Free |
| `google_linkedin_proxy_scraper.ts` | Google `site:linkedin.com/in` | Free |

### New DB tables
- `sector_title_cache` — titles by sector + country, TTL 30d
- New `companies` columns: `context_data` (JSONB), `context_enriched_at`, `hiring_signals`
- New `contacts` columns: `email_verified_at`, `email_verify_method`, `sector_context`, `linkedin_url`

## Split into 8 sub-stories (PO)

| # | Story | Priority |
|---|-------|----------|
| sc-31-1 | Domain Resolver — fuzzy match domain → exact URL | **P0 blocking** |
| sc-31-2 | SectorRegistry + SectorTitleService | P0 |
| sc-31-3 | EmailVerifier (SMTP + pattern) | P1 |
| sc-31-4 | ContextEnrichmentService (culture, tech, news) | P1 |
| sc-31-5 | Hunter Company Search Scraper | P1 |
| sc-31-6 | GitHub ContactFinder | P2 |
| sc-31-7 | Google/LinkedIn proxy | P2 |
| sc-31-8 | SourcingOrchestrator + BullMQ | P2 |

**To create in Shortcut**: pending user validation of the breakdown.

## Target metrics
- Contact relevance: 4% → ≥ 70%
- Email coverage: 0% → ≥ 60% (verified or probable)
- Contextual richness: ≥ 4 fields per company
- Hunter cost: ≤ 25 calls per sourcing run

## Study complete — Dedicated recruitment/org agents (2026-03-23)

**Recommendation**: 1 single agent `recruitment-intelligence.md` in `.claude/agents/` (outside `.framework/`)
**Justification**: company organization + hidden market are inseparable in the ExpatHunter context

**Files produced**:
- `specs/sc31-recruitment-agents-study.md` — comparative study 1 vs 2 agents
- `data/sector-titles.yaml` — static base for 10 sectors × 3 cultures (EN/FR/DE), 4 levels per sector
- `data/sector-titles-prompt.md` — full LLM fallback prompt with post-LLM validation

**To do**: create `.claude/agents/recruitment-intelligence.md` before implementing `SectorTitleService`
