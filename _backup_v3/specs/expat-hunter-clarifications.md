# ExpatHunter — Clarifications

Ambiguities identified in the spec and their resolutions.

## CL-001: Scraping — In-house vs Apify

**Question**: When exactly does the system fall back to Apify?
**Resolution**: In-house Playwright scraper is always attempted first. Apify is triggered only when:
1. The in-house scraper fails 3 consecutive times for a source
2. A captcha cannot be bypassed after 2 retries
3. The source is known to be Playwright-hostile (configured per-source in scraper registry)

Apify usage is logged and capped at 5$/month to stay within budget.

## CL-002: Contact Deduplication Strategy

**Question**: How are contacts deduplicated across sources?
**Resolution**: Three-level dedup:
1. **Email match** — exact match on email address (highest confidence)
2. **LinkedIn URL match** — exact match on LinkedIn profile URL
3. **Fuzzy name + company** — same company + Levenshtein distance < 3 on name → flagged for manual review

Dedup runs after each sourcing batch completes.

## CL-003: AI Model Selection

**Question**: Which OpenRouter model is used? Is it configurable?
**Resolution**: Default model is configurable in admin settings (`/admin/ai-settings`). MVP starts with a cost-effective model (e.g., `mistral/mistral-large` or `anthropic/claude-3-haiku`). The model ID is stored in the database settings table, not hardcoded. Cost per analysis is tracked.

## CL-004: Gmail API — OAuth Scope

**Question**: How does the user connect Gmail?
**Resolution**: OAuth2 flow via `/parametres/connexion-email`. The app requests `gmail.send` and `gmail.readonly` scopes. Refresh tokens are encrypted in the database (AES-256). The user can disconnect Gmail at any time. Outlook support is deferred post-MVP.

## CL-005: Follow-Up Sequence Timing

**Question**: What are the default follow-up intervals?
**Resolution**: Default sequence: J+3, J+7, J+14 (configurable in `/parametres`). Each follow-up is a new AI-generated message (not a copy). Follow-ups stop automatically when:
- The contact replies
- The contact is moved to "rejected" in the pipeline
- The contact is blocked by the user
- Maximum 3 follow-ups reached

## CL-006: Pipeline Columns vs Contact Statuses

**Question**: The spec mentions 8 statuses but the UX doc shows 6 kanban columns. Which is correct?
**Resolution**: The **data model** uses 8 statuses (identified, analyzed, to_contact, contacted, replied, interview, offer, rejected). The **kanban UI** groups them into 6 columns:
| Kanban Column | Statuses included |
|---------------|-------------------|
| Trouvé | identified, analyzed |
| À contacter | to_contact |
| Contacté | contacted |
| En discussion | replied |
| Entretien | interview |
| Terminé | offer, rejected |

## CL-007: "Include HR" Option

**Question**: The search form has an "Include HR" checkbox, but the spec says we target operational leads only.
**Resolution**: By default, HR contacts are filtered out during sourcing. The checkbox allows the user to optionally include them (some HR contacts in small companies also have hiring power). When included, HR contacts are tagged `is_hr: true` and receive a lower base relevance score (-20 penalty).

## CL-008: Market Snapshot Source

**Question**: Where does the market snapshot data come from?
**Resolution**: The market snapshot is computed from:
1. **Cached sourcing data** — aggregated from previous runs for the selected country/sector
2. **External signals** — job board counts (scraped periodically as a background job)
3. **AI summary** — OpenRouter generates a 2-3 sentence market overview from the aggregated data

Data is cached for 7 days per country/sector combination.

## CL-009: Contact Cooldown Period

**Question**: How long before a contact can be re-contacted?
**Resolution**: 90 days from the last email sent to that contact. During cooldown:
- The contact appears grayed out in the pipeline
- The contact is excluded from new sourcing runs (via `contactsExcludedCooldown` counter)
- The user can override cooldown manually (with a warning)

## CL-010: Language Behavior

**Question**: Which language is used for AI-generated emails?
**Resolution**: The email language is determined by the **generation preset** (`/parametres/presets`), not the UI language. Default presets ship with FR and EN. The AI adapts tone, formality, and cultural references based on the target country. UI language and email language are independent settings.

## CL-011: Admin Pages Access

**Question**: Who can access admin pages?
**Resolution**: MVP is mono-user, so the single user has admin access. The `User` model has a `role` field (enum: `user`, `admin`). Admin routes are guarded by role middleware. In multi-user mode, only `admin` role can access `/admin/*` pages.

## CL-012: CV Parsing Behavior

**Question**: What happens when CV parsing fails?
**Resolution**: CV parsing (PDF → text → AI extraction) is best-effort:
1. PDF text extraction via `pdf-parse`
2. AI extraction of skills/experience via OpenRouter
3. If extraction fails: user is prompted to enter skills manually
4. Partial extractions are shown as editable suggestions (user can correct)

The raw CV text is always stored regardless of extraction success.
