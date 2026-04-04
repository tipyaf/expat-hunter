# ExpatHunter — Constitution

## Purpose

ExpatHunter automates hidden job market prospecting for expats. It identifies operational team leads (not HR), evaluates relevance against a candidate profile using AI, generates personalized outreach emails, and manages follow-up sequences.

## Non-Negotiable Principles

### 1. Hidden Market Focus
We target people who **can hire before a job is posted** — engineering managers, CTOs, team leads. Never HR recruiters, never published job boards. The entire value proposition depends on this.

### 2. AI as Copilot, Not Autopilot
AI scores contacts, drafts emails, and suggests actions. The human **always reviews and approves** before any outreach is sent. No email leaves without explicit user approval.

### 3. Anti-Detection First
Scraping must be invisible. User-agent rotation, random delays (2–10s), proxy support, captcha handling, Apify fallback. Getting blocked means losing the data source entirely.

### 4. Budget Constraint: 30$/month
The entire stack (hosting + APIs + AI) must fit within 30$/month. This constrains every architectural decision: single VPS, batch AI processing, cached results, no expensive SaaS dependencies.

### 5. Mono-User MVP, Multi-User Architecture
The MVP serves one user. But the data model, auth system, and service boundaries must be designed for multi-user from day one. No shortcuts that would require a rewrite.

### 6. Simplicity for the User
The technical complexity (scraping, AI, email integration) must be invisible. The user configures a profile, clicks "search", reviews results, approves emails. Three clicks to value.

### 7. Privacy and Ethics
- Scraped data is used only for outreach, never sold or shared
- Users can block contacts/companies permanently
- Cooldown periods prevent re-contacting the same person
- Respect robots.txt where applicable

## Boundaries

### In Scope (MVP)
- Candidate profile with CV parsing
- Contact sourcing (NZ focus, extensible to 11 countries)
- AI relevance scoring (0–100) via OpenRouter
- Personalized email generation and Gmail sending
- Pipeline kanban tracking
- Follow-up sequences
- Bilingual UI (FR/EN)

### Out of Scope (MVP)
- LinkedIn messaging (requires feasibility study first — ban risk)
- Multi-user registration/billing
- Expat assistance (visa, housing)
- Interview preparation
- Mobile app
- Analytics dashboard

## Technical Decisions (ADRs)

| ADR | Decision | Rationale |
|-----|----------|-----------|
| ADR-001 | TypeScript fullstack | Single runtime on budget VPS, Playwright native for scraping, mature LLM libs |
| ADR-002 | AdonisJS backend | Batteries-included (auth, mail, queue, i18n, validation), zero external wiring |
| ADR-003 | Next.js frontend | App Router, React ecosystem, i18n support, SSR capability |
| ADR-004 | PostgreSQL + Redis | Relational data model + job queues (BullMQ), both lightweight |
| ADR-005 | OpenRouter for AI | Model-agnostic, cost control, easy model switching |
| ADR-006 | pnpm monorepo | Simple workspaces (apps/api, apps/frontend, packages/shared) |

## Success Criteria

1. A user can go from zero to sending their first personalized email in under 15 minutes
2. AI relevance scoring achieves >70% agreement with user manual assessment
3. Email response rate exceeds cold-email industry average (>5%)
4. Full pipeline run (scrape → analyze → generate) completes in under 10 minutes for a single country/sector
5. Total monthly cost stays under 30$
