# Project Memory: ExpatHunter

> Last updated by **agent** — 2026-03-25

## Metadata
- **Project**: expat-hunter
- **Started**: 2026-03-17
- **Current phase**: Phase 2 — Construction (features pending refinement)
- **Last updated**: 2026-04-07
- **Framework version**: 4.1.1
- **GitHub repo**: https://github.com/tipyaf/expat-hunter (public)
- **Branches**: main (protected, default), develop (protected, dev base), feature/* → PR to develop

## Spec
- **File**: `specs/expat-hunter.yaml`
- **Type**: fullstack TypeScript
- **Stack**: AdonisJS + Lucid, Next.js (React), Tailwind CSS, PostgreSQL, OpenRouter, Playwright (scraping), Shortcut.com (project management)

## Feature Status

| Feature | Priority | Status | Story file | Cycles |
|---------|----------|--------|------------|--------|
| candidate-profile | must-have | ✅ validated | specs/stories/candidate-profile.yaml | 1 |
| contact-sourcing | must-have | ✅ validated | specs/stories/contact-sourcing.yaml | 1 |
| ai-relevance-analysis | must-have | ✅ validated | specs/stories/ai-relevance-analysis.yaml | 1 |
| personalized-emailing | must-have | ✅ validated | specs/stories/personalized-emailing.yaml | 1 |
| pipeline-dashboard | must-have | ✅ validated | specs/stories/pipeline-dashboard.yaml | 1 |
| signal-detection | should-have | pending | — | 0 |
| multi-country | should-have | pending | — | 0 |
| linkedin-messaging | nice-to-have | pending | — | 0 |
| multi-users | nice-to-have | pending | — | 0 |
| expat-assistance | nice-to-have | pending | — | 0 |
| interview-prep | nice-to-have | pending | — | 0 |
| mobile-app | nice-to-have | pending | — | 0 |
| analytics | nice-to-have | pending | — | 0 |
| contact-detail-panel | must-have | ✅ validated | specs/stories/contact-detail-panel.yaml | 1 |

| job-search-config | must-have | ✅ validated | specs/stories/job-search-config.yaml | 1 |
| job-scraping-pipeline | must-have | 🔄 refining | — | 0 |
| job-ai-evaluation | must-have | pending | — | 0 |
| job-company-enrichment | must-have | pending | — | 0 |
| job-offers-page | must-have | pending | — | 0 |
| job-cv-generation | must-have | pending | — | 0 |
| job-cover-letter | must-have | pending | — | 0 |
| job-application-send | must-have | pending | — | 0 |
| job-recurring-search | should-have | pending | — | 0 |
| job-custom-platforms | should-have | pending | — | 0 |
| job-notifications | nice-to-have | pending | — | 0 |

**Summary**: 25 features total — 7 validated (original MVP + job-search-config), 7 new must-have remaining (job offers pipeline), 11 pending. /spec complete for job offers pipeline. Next: finish `/refine job-scraping-pipeline` (3 decisions pending), then `/build`.

## Architecture Decisions

### Architecture
| # | Decision | Alternatives considered | Reason | Phase |
|---|----------|------------------------|--------|-------|
| 1 | Pluggable connectors per source/country | Monolithic scraping | Multi-country scalability | 0 |
| 2 | OpenRouter as AI provider | OpenAI direct, Ollama | Interchangeable models, low-cost | 0 |
| 3 | In-house scraping + Apify fallback | Apify only, Scrapy | Reduce external deps, control costs | 0 |
| 4 | Mono-user MVP, architected for multi-user | Multi-user from start | Ship fast, scale later | 0 |
| 5 | No n8n, everything in the SaaS | n8n orchestration | Centralize, simplify | 0 |
| 6 | Fullstack TypeScript (Node.js + Next.js) | Python + FastAPI | Single runtime, shared types, less RAM, comfort stack | 1 |
| 10 | Next.js + Tailwind CSS for frontend | Remix, SvelteKit | React more mature for web, drag&drop kanban, optional SEO, light bundle | 1 |
| 11 | AdonisJS as backend framework | NestJS, Hono, Fastify | Batteries-included (auth, mail, queue, i18n, validation), zero wiring | 1 |
| 12 | Lucid ORM (native AdonisJS) | Prisma, Drizzle | Consistent with ecosystem, migrations + seeds built-in | 1 |
| 13 | Biome for linting/formatting | ESLint + Prettier | Ultra fast, replaces two tools | 1 |
| 14 | Vitest for tests | Jest | Fast, native TypeScript support | 1 |
| 15 | pnpm as package manager | npm, yarn, bun | Fast, disk-efficient, native workspaces | 1 |
| 16 | REST API (no tRPC/GraphQL) | tRPC, GraphQL | Independently testable, mobile-reusable, no coupling | 1 |
| 17 | Pluggable scrapers (Strategy + Registry) | Hardcoded scrapers | Adding a country/source = 1 class + 1 line | 1 |
| 18 | Background jobs BullMQ (@adonisjs/queue) | Cron, Bull | Scraping + AI + email async, automatic retry | 1 |
| 19 | Simple pnpm workspaces (no Turborepo/Nx) | Turborepo, Nx | Sufficient for 3 packages, zero config | 1 |
| 20 | Japa (backend) + Vitest (frontend) | Jest everywhere | Native AdonisJS on API side, fast on frontend | 1 |

### Functional
| # | Decision | Reason | Phase |
|---|----------|--------|-------|
| 1 | Target operational team leads, NOT HR | HR posts jobs, we want the hidden market | 0 |
| 2 | Configurable persona (not fixed to Yannick) | Makes the tool usable by anyone | 0 |
| 3 | LinkedIn messaging as nice-to-have with prior study | Ban risk, requires research | 0 |
| 4 | Email as main MVP channel | Less risky, simpler | 0 |
| 5 | Not limited to tech sector | Candidate defines their sector, system adapts | 0 |
| 6 | Interview prep (local language, culture) as nice-to-have | High value-add for expats | 0 |

### UX/UI
| # | Decision | Reason | Phase |
|---|----------|--------|-------|
| 1 | Extreme simplicity despite technical complexity | User requirement | 0 |
| 2 | Fixed left sidebar (SaaS style) | Always-visible navigation | 0.5 |
| 3 | Dashboard = pending actions (to-do style) | User knows what to do immediately | 0.5 |
| 4 | Onboarding wizard + CV upload + conversational AI | Guided, fast, intelligent | 0.5 |
| 5 | AI-assisted sourcing (pre-filled suggestions) | Simplicity + relevance | 0.5 |
| 6 | Hybrid email validation (first 3 one-by-one, then batch) | Quality control + efficiency | 0.5 |
| 7 | 5-column MVP pipeline (Found/To contact/Contacted/In discussion/Done) | Readable, no overload | 0.5 |
| 8 | Relevance badges: color + short explanation (no raw score) | More understandable than a number | 0.5 |
| 9 | Modern/warm tone (teal/orange, Linear style) | Friendly, professional without corporate feel | 0.5 |
| 10 | Dark mode: system preference default + settings toggle | Comfort + user control | 0.5 |
| 11 | i18n: EN + FR at MVP, browser language default, extensible | Validate i18n early, international target | 0.5 |
| 12 | Shared design system web + mobile | Visual consistency, single token set | 0.5 |
| 13 | Sidebar collapsible menus + flyout mode rétracté | Dual pipeline (Prospection + Offres d'emploi) proprement organisé | 0.3-bis |
| 14 | Job offers page with 3 tabs (Nouvelles/Postulées/Archivées) | Pattern pills cohérent avec contacts existants | 0.3-bis |
| 15 | Application workspace split 50/50 (CV + LM) + email footer | Page la plus complexe, layout optimisé | 0.3-bis |
| 16 | CV dual method: Google Docs API (recommandé) + local DOCX templates | Meilleur résultat vs alternative sans Google | 0.3-bis |

## Phase History

### Phase 0 — Conception
- **Status**: ✅ Done
- **Artifacts**: `specs/expat-hunter.yaml`, `specs/expat-hunter-ux.md`, `specs/expat-hunter-architecture.md`, `specs/constitution.md`, `specs/expat-hunter-clarifications.md`, `specs/expat-hunter-manifest.yaml`
- **Summary**: Full YAML spec (5 must-have, 2 should-have, 6 nice-to-have, 6 entities). Full design (sitemap, 5 flows, design system, 10 components, 5 layouts). Layered monorepo pnpm architecture, 8 Lucid entities, 9 epics, 7 ADRs. Stack profiles AdonisJS + Next.js. Constitution, clarifications (12 CL), and manifest created 2026-03-25.

### Phase 1 — Scaffold
- **Status**: ✅ Done
- **Summary**: pnpm monorepo created. AdonisJS 7 scaffolded (core, lucid, auth, mail, i18n, cors, shield, drive). Next.js 14 (App Router) + Tailwind CSS v4. Shared package (types + constants). Docker-compose (PostgreSQL 16 + Redis 7). Biome, .env.example.
- **Note**: AdonisJS v7 (not v6 as originally planned)

### Phase 2 — Construction
- **Status**: 🔄 In progress — Job Offers pipeline (E10)
- **Features**: 7 must-have validated (+job-search-config), 2 should-have pending, 6 nice-to-have pending
- **Current**: Refining job-scraping-pipeline (next in E10 after job-search-config)
- **Last completed**: sc-810 (job-search-config) — PR #144 + PR #145 (SonarQube fixes) merged
- **Previous sprint**: SonarQube refactoring (sc-755 to sc-808, all validated)
- **Refinement in progress — job-scraping-pipeline**:
  - Split proposed: 2 stories (XL → 2×L)
  - Story 1: Data model + 4 scrapers (Seek/BuiltIn/Zeil/LinkedIn)
  - Story 2: Orchestration + dedup + API + quotas
  - 3 decisions pending user validation:
    1. BullMQ → reporter à E14 (job-recurring-search), garder sync+polling
    2. Seek scraper → réutiliser pattern Apify existant (pas Playwright)
    3. Dédup IA → v1 rules-only ou inclure IA dès maintenant?
  - Wireframe gate: SKIP (backend-only, pas d'UI)
  - Codebase findings: BaseScraper exists (returns RawContact[]), need new BaseJobOfferScraper (returns RawJobOffer[]), ScraperRegistry pattern reusable, Apify already integrated, last migration=34, BullMQ NOT installed

### Phase 3 — Review
- **Status**: ✅ Done (all must-have features validated 2026-03-25)

### Phase 4 — Deploy
- **Status**: ⬜ Not started

### Phase 5 — Release
- **Status**: ⬜ Not started

## Issues Encountered
| # | Issue | Solution | Phase |
|---|-------|----------|-------|
| - | - | - | - |

## User Feedback (cumulative)
| Phase | Feedback | Action taken |
|-------|----------|-------------|
| 0 | Don't limit to tech, target operational leads | Updated spec |
| 0 | Configurable persona, not fixed | Updated spec |
| 0 | LinkedIn messaging risky, prior study needed | Moved to nice-to-have with condition |
| 0 | Anti-detection scraping important | Added to spec constraints |
| 0 | Stop n8n, centralize everything | Full SaaS architecture |
| 0 | built.com not BuiltWith | Fixed |
| 0 | Long-term vision: full expat assistance | Documented as nice-to-have |
| 0 | OpenRouter for AI (interchangeable models) | Updated stack |
| 0 | Existing Hostinger KVM2 VPS | Updated deployment |
| 1 | Python proposed first even though TS was sufficient | Framework improved: evaluate technically first, comfort as tiebreaker |
| 1 | AdonisJS not proposed initially (popularity bias) | Framework improved: anti-bias rules + evaluation checklist added |
| 2 | Files committed in French (non-translation) | Rule: ALL non-translation files must be in English |

## Key Files
| File | Role |
|------|------|
| `specs/expat-hunter.yaml` | Full project spec |
| `specs/expat-hunter-ux.md` | Full UX/UI design |
| `specs/expat-hunter-architecture.md` | Full architecture plan |
| `specs/feature-tracker.yaml` | Feature state tracker (v2.1.0) |
| `specs/stories/` | Story files — build contracts (v2.1.0) |
| `stacks/typescript-adonisjs.md` | Backend stack profile AdonisJS |
| `stacks/typescript-nextjs.md` | Frontend stack profile Next.js |
| `memory/expat-hunter.md` | This file — project state |
| `memory/LESSONS.md` | Past mistakes, read by all agents |
| `memory/SYNC.md` | Framework version |

## Notes
- Strict budget: $30/month max
- Hostinger KVM2 VPS may be limited for Ollama — OpenRouter first
- User has an existing LinkedIn + Hunter.io + n8n pipeline that yields poor results (bad targeting + generic messages)
- Sources by country (configurable). NZ example: Seek, Matchstiq, Zeil, built.com. Global: LinkedIn, Hunter.io
- Tool is NOT limited to NZ — each user chooses their target country, sources adapt
- **Framework v2.1.0**: Enforcement layer active — feature-tracker + story files + verify: commands
- **Phase 0 complete**: All 6 artifacts exist on disk — phase guards unblocked for `/refine`
