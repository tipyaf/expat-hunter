# sc-31 — Pipeline contacts qualifiés (marché caché)

## Statut
- **Story Shortcut** : sc-31 (To Do)
- **Specs produites** :
  - `specs/sc31-contacts-quality-refinement.yaml` — spec PO complète
  - `specs/sc31-architecture.md` — architecture technique détaillée
  - `specs/contact-sourcing-strategy.yaml` — stratégie sourcing v1
- **Agents impliqués** : PO + Architecte consultés le 2026-03-23
- **Étude en cours** : agents dédiés recrutement/org entreprise (voir section ci-dessous)

## Promesse produit (marché caché)
ExpatHunter cible les **managers opérationnels** (pas les RH) qui ont le pouvoir de recruter, AVANT qu'une offre soit publiée. L'email envoyé doit montrer que l'utilisateur s'est vraiment intéressé à l'entreprise et à la personne. Ce n'est pas de la prospection généraliste — c'est de l'expatriation assistée par IA.

## Décisions PO validées

### Titres par secteur
- Base **statique** pour le MVP (coût 0, déterministe, testable)
- **LLM fallback** uniquement pour secteurs inconnus (~0.001$/appel, GPT-4o-mini via OpenRouter)
- Cache 30 jours en DB (`sector_title_cache`)
- 5 secteurs MVP : IT, Finance, Marketing, Ops, Construction

### Contacts cibles
- Managers **opérationnels** uniquement (pas HR par défaut)
- HR optionnel via checkbox dans l'UX (désactivé par défaut)
- Exemples IT : Engineering Manager, CTO, Head of Engineering, VP Engineering, IT Manager, Director of Engineering, Lead Software Engineer, Software Manager

### Info nécessaire pour emails impactants
Culture entreprise, tech stack, compétences demandées, secteur, historique, projets en cours/à venir, besoins du moment, signaux de recrutement actif. Sources : site web (About page LLM-parsé), Hunter Company Enrichment, Google News, Crunchbase basic.

### Seuil qualité email
Tout email est bon, vérifié c'est mieux. Prévoir service de vérification interne (SMTP + pattern).

### Légal NZ/AU
Uniquement sources publiques agrégées. Pas de scraping caché.

## Décisions Architecte validées

### Architecture multi-secteurs
`SectorRegistry` (même pattern que `ScraperRegistry`). Ajouter un secteur = 1 entrée, zéro code.

### Agents spécialisés
**Non pour le MVP.** Services spécialisés suffisent. Phase 3+ si besoin.
(Étude en cours sur agents dédiés recrutement/org — voir ci-dessous)

### Nouvelles sources de contacts
- Hunter Company Search (découverte entreprises)
- GitHub API gratuit (5000 req/h)
- Google → `site:linkedin.com/in` (gratuit, 100/j)

### Nouveaux services à créer
| Service | Responsabilité |
|---------|---------------|
| `sourcing_orchestrator.ts` | Point d'entrée, dispatche jobs |
| `context_enrichment_service.ts` | Culture, tech stack, news, signaux |
| `sector_title_service.ts` | Titres par secteur + cache 30j |
| `email_verifier.ts` | MX + SMTP + pattern scoring |
| `sector_registry.ts` | Config par secteur (whitelist, keywords) |

### Nouveaux scrapers
| Scraper | Source | Coût |
|---------|--------|------|
| `hunter_company_search_scraper.ts` | Hunter Company Search API | Crédits |
| `github_contact_finder.ts` | GitHub API public | Gratuit |
| `google_linkedin_proxy_scraper.ts` | Google `site:linkedin.com/in` | Gratuit |

### Nouvelles tables DB
- `sector_title_cache` — titres par secteur + pays, TTL 30j
- Nouvelles colonnes `companies` : `context_data` (JSONB), `context_enriched_at`, `hiring_signals`
- Nouvelles colonnes `contacts` : `email_verified_at`, `email_verify_method`, `sector_context`, `linkedin_url`

## Découpage en 8 sous-stories (PO)

| # | Story | Priorité |
|---|-------|----------|
| sc-31-1 | Domain Resolver — fuzzy match domaine → URL exacte | **P0 bloquant** |
| sc-31-2 | SectorRegistry + SectorTitleService | P0 |
| sc-31-3 | EmailVerifier (SMTP + pattern) | P1 |
| sc-31-4 | ContextEnrichmentService (culture, tech, news) | P1 |
| sc-31-5 | Hunter Company Search Scraper | P1 |
| sc-31-6 | GitHub ContactFinder | P2 |
| sc-31-7 | Google/LinkedIn proxy | P2 |
| sc-31-8 | SourcingOrchestrator + BullMQ | P2 |

**À créer dans Shortcut** : en attente validation utilisateur du découpage.

## Métriques cibles
- Pertinence contacts : 4% → ≥ 70%
- Couverture email : 0% → ≥ 60% (vérifié ou probable)
- Richesse contextuelle : ≥ 4 champs par entreprise
- Coût Hunter : ≤ 25 calls par sourcing run

## Étude terminée — Agents dédiés recrutement/org (2026-03-23)

**Recommandation** : 1 seul agent `recruitment-intelligence.md` dans `.claude/agents/` (hors `.framework/`)
**Justification** : organisation d'entreprise + marché caché sont indissociables dans le contexte ExpatHunter

**Fichiers produits** :
- `specs/sc31-recruitment-agents-study.md` — étude comparative 1 vs 2 agents
- `data/sector-titles.yaml` — base statique 10 secteurs × 3 cultures (EN/FR/DE), 4 niveaux par secteur
- `data/sector-titles-prompt.md` — prompt LLM fallback complet avec validation post-LLM

**À faire** : créer `.claude/agents/recruitment-intelligence.md` avant d'implémenter `SectorTitleService`
