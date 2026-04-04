# Architecture sc-31 — Pipeline de contacts qualifiés ExpatHunter

> Produit par l'agent architecte — 2026-03-23

## 1. Pipeline (ASCII)

```
REQUETE UTILISATEUR
  userId + country + sector + candidateProfile
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│              SourcingOrchestrator (NOUVEAU)              │
│  Coordonne les 5 phases, crée le SourcingRun, publie    │
│  les jobs BullMQ dans le bon ordre                       │
└─────────────────┬───────────────────────────────────────┘
                  │
        ┌─────────┼──────────────────────────┐
        ▼         ▼                          ▼
  ┌──────────┐ ┌──────────────┐    ┌──────────────────┐
  │  Phase 1 │ │   Phase 1b   │    │     Phase 1c     │
  │ Scrapers │ │ HunterSearch │    │  SectorDirectory │
  │(Seek/etc)│ │ (companies)  │    │  Scrapers        │
  └────┬─────┘ └──────┬───────┘    └────────┬─────────┘
       └──────────────┴─────────────────────┘
                      │
                      ▼
        ┌─────────────────────────┐
        │   CompanyRepository     │
        │   (dedup + persist)     │
        └──────────┬──────────────┘
                   │ [job: enrich_company]
                   ▼
      ┌────────────────────────────┐
      │   Phase 2 — CompanyEnricher│  (existant, à étendre)
      │  + ContextEnrichmentService│  (NOUVEAU)
      │  - team page crawl         │
      │  - website analysis (LLM)  │
      │  - news/funding signals     │
      │  - Hunter Company Enrich   │
      └──────────┬─────────────────┘
                 │ [job: identify_contacts]
                 ▼
      ┌──────────────────────────────┐
      │   Phase 3 — Contact Finders  │
      │  - SectorTitleService (LLM)  │  (NOUVEAU)
      │  - GitHubContactFinder       │  (NOUVEAU)
      │  - GoogleLinkedInProxy       │  (NOUVEAU)
      └──────────┬───────────────────┘
                 │ [job: enrich_email]
                 ▼
      ┌──────────────────────────────┐
      │   Phase 4 — EmailEnricher    │  (existant, à étendre)
      │  + EmailVerifier             │  (NOUVEAU)
      │  - Hunter Email Finder       │
      │  - Pattern inference         │
      │  - SMTP verification         │
      └──────────┬───────────────────┘
                 │ [job: score_contact]
                 ▼
      ┌──────────────────────────────┐
      │  Phase 5 — ExpatScoringService│  (existant, à étendre)
      │  - visa score                 │
      │  - role relevance (IA)        │
      │  - hiring intensity           │
      │  - expat signals              │
      │  - context momentum           │
      └──────────┬───────────────────┘
                 ▼
        ┌─────────────────┐
        │ CONTACT          │
        │ ACTIONNABLE      │
        │ score + email    │
        │ + contexte       │
        └─────────────────┘
```

## 2. Services à créer

| Service | Responsabilité | Max lignes |
|---------|---------------|-----------|
| `sourcing_orchestrator.ts` | Point d'entrée unique, dispatche jobs BullMQ | 300 |
| `context_enrichment_service.ts` | Culture, tech stack, news, signaux croissance | 350 |
| `sector_title_service.ts` | Titres cibles par secteur + pays, cache 30j | 250 |
| `email_verifier.ts` | MX + SMTP handshake + pattern scoring | 200 |
| `sector_registry.ts` | Config par secteur (whitelist, keywords, directories) | 200 |

## 3. Scrapers à créer

| Scraper | Source | Coût |
|---------|--------|------|
| `hunter_company_search_scraper.ts` | Hunter Company Search API | 1 crédit/call |
| `github_contact_finder.ts` | GitHub API public | Gratuit (5000 req/h) |
| `google_linkedin_proxy_scraper.ts` | Google Search `site:linkedin.com/in` | Gratuit (100/j) |

## 4. Modèle de données

### Nouvelles colonnes — `companies`
```sql
context_data          JSONB       -- culture, tech_stack, news, funding, hiring_signals
context_enriched_at   TIMESTAMP
hunter_enriched_at    TIMESTAMP
hiring_signals        JSONB       -- { isHiring, openRolesCount, techRolesCount, lastJobDate }
```

### Nouvelles colonnes — `contacts`
```sql
email_verified_at     TIMESTAMP
email_verify_method   VARCHAR(20)  -- 'smtp' | 'dns' | 'hunter' | 'pattern'
sector_context        JSONB        -- { targetTitles: [], matchedTitle: '' }
linkedin_url          VARCHAR(500)
```

### Nouvelle table — `sector_title_cache`
```sql
CREATE TABLE sector_title_cache (
  id            UUID PRIMARY KEY,
  sector        VARCHAR(100) NOT NULL,
  country       VARCHAR(10)  NOT NULL,
  titles        JSONB        NOT NULL,
  generated_by  VARCHAR(50)  NOT NULL,  -- 'llm:gpt-4o-mini' | 'static'
  expires_at    TIMESTAMP    NOT NULL,
  created_at    TIMESTAMP    NOT NULL,
  UNIQUE (sector, country)
);
```

## 5. SectorTitleService — Architecture détaillée

```typescript
interface TitleGenerationProvider {
  generateTitles(sector: string, country: string, count: number): Promise<string[]>
  readonly providerName: string
}
// Implémentations : OpenRouterTitleProvider (GPT-4o-mini ~0.001$/call) + StaticTitleProvider (fallback)
// Cache DB 30j. Coût estimé : 50 appels/mois = ~0.05$/mois
```

## 6. EmailVerifier — 3 niveaux

1. **MX check DNS** — Coût: 0. Confirme que le domaine accepte des emails
2. **SMTP handshake** — EHLO → MAIL FROM → RCPT TO → parser 2xx/5xx. Timeout 5s. Ne jamais marquer `invalid` sur timeout (catch-all / greylisting)
3. **Pattern scoring** — Si Hunter a fourni des emails pour ce domaine, utiliser le pattern dominant

```typescript
interface VerificationResult {
  status: 'verified' | 'probable' | 'risky' | 'invalid' | 'unknown'
  confidence: number    // 0-100
  method: 'smtp' | 'hunter' | 'pattern' | 'dns_only'
}
```

## 7. Architecture multi-secteurs — SectorRegistry

```typescript
interface SectorConfig {
  sectorKey: string
  displayName: string
  roleWhitelist: string[]         // rôles opérationnels cibles
  roleBlacklist: string[]         // rôles à exclure
  jobBoardKeywords: string[]      // mots-clés Seek/Indeed
  githubTopics?: string[]
}
// Même pattern que ScraperRegistry. Ajouter un secteur = 1 entrée dans la Map
```

## 8. Agents spécialisés — Recommandation

**Non pour le MVP.** Les agents multi-LLM ajoutent de la complexité opérationnelle sans bénéfice démontré à cette échelle. La spécialisation métier se fait via SectorRegistry + SectorTitleService + ContextEnrichmentService.

Structure si besoin en Phase 3+ : `app/agents/` avec `base_agent.ts`, `company_research_agent.ts`, `contact_discovery_agent.ts`, `agent_registry.ts`.

## 9. Background jobs BullMQ

```
Queue: sourcing → Job: sourcing:run (Phase 1)
  → Queue: enrichment → Job: company:enrich (Phase 2, concurrency: 3)
    → Queue: contacts → Job: contacts:identify (Phase 3, concurrency: 3)
      → Queue: email → Job: email:enrich (Phase 4, concurrency: 5, attempts: 2)
        → Queue: scoring → Job: contact:score (Phase 5, concurrency: 10, attempts: 1)
```

Note: BullMQ pas encore installé. MVP peut démarrer avec async léger (pattern actuel `triggerCompanyEnrichment`) et migrer vers BullMQ.

## 10. Tests — Priorités

| Priorité | Service | Raison |
|----------|---------|--------|
| P0 | `email_verifier.ts` | Cœur du funnel, logique critique |
| P0 | `sector_title_service.ts` | Cache + fallback + agnostisme provider |
| P1 | `visa_sponsor_registry.ts` | Fuzzy match edge cases |
| P1 | `expat_scoring_service.ts` | Chaque sub-score isolément |
| P1 | `context_enrichment_service.ts` | Parsing HTML, merge multi-sources |
| P2 | Scrapers | Integration tests avec mock APIs |

## 11. Séquence d'implémentation

| Sprint | Contenu |
|--------|---------|
| 1 | SectorRegistry + SectorTitleService + migrations DB |
| 2 | EmailVerifier (SMTP + pattern) + extension EmailEnricher |
| 3 | ContextEnrichmentService + extension CompanyEnricher + ExpatScoring v3 |
| 4 | HunterCompanySearchScraper + GitHubContactFinder + GoogleLinkedInProxy |
| 5 | SourcingOrchestrator + BullMQ jobs + refactor SourcingService |

## Fichiers critiques existants

- `app/services/company_enricher.ts` — Pattern `getOrFetch` + CacheService à reproduire
- `app/scrapers/scraper_registry.ts` — Pattern Registry à reproduire pour SectorRegistry
- `app/services/expat_scoring_service.ts` — À étendre en v3 sans casser le frontend
- `app/services/sourcing_service.ts` — À refactorer vers SourcingOrchestrator
- `app/ai/openrouter_client.ts` — Client LLM à wrapper dans TitleGenerationProvider
