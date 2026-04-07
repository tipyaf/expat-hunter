# ExpatHunter — Phase 1 : Plan d'Architecture

## 1. Vue d'ensemble

### Architecture
- **Pattern** : Layered Architecture (MVC côté API, App Router côté frontend)
- **Monorepo** : pnpm workspaces (`apps/api`, `apps/frontend`, `packages/shared`)
- **Communication** : REST API (JSON) entre frontend et backend
- **Background jobs** : BullMQ via @adonisjs/queue (Redis)
- **Base de données** : PostgreSQL 16
- **Cache / Queue broker** : Redis 7

### Couches applicatives

```
┌─────────────────────────────────────────────────────┐
│                    apps/frontend (Next.js)                │
│  App Router → Pages → Components → Hooks → API Client│
├─────────────────────────────────────────────────────┤
│                      REST API (JSON)                 │
├─────────────────────────────────────────────────────┤
│                    apps/api (AdonisJS)               │
│  Routes → Middleware → Controllers → Services        │
│                                   → Validators       │
│                                   → Models (Lucid)   │
│                                   → Jobs (BullMQ)    │
│                                   → Mailers          │
├─────────────────────────────────────────────────────┤
│              PostgreSQL          Redis                │
└─────────────────────────────────────────────────────┘
```

### Principes directeurs
1. **Separation of concerns** : Controllers minces, logique métier dans les Services
2. **Convention over configuration** : suivre les conventions AdonisJS et Next.js App Router
3. **Type safety** : types partagés dans `packages/shared`, validations VineJS côté API
4. **Async by default** : scraping et IA en background jobs, jamais dans le request cycle

---

## 2. Structure de fichiers détaillée

```
expat-hunter/
├── apps/
│   ├── api/                          # Backend AdonisJS 6
│   │   ├── app/
│   │   │   ├── controllers/
│   │   │   │   ├── auth_controller.ts
│   │   │   │   ├── profile_controller.ts
│   │   │   │   ├── sourcing_controller.ts
│   │   │   │   ├── contacts_controller.ts
│   │   │   │   ├── analysis_controller.ts
│   │   │   │   ├── emails_controller.ts
│   │   │   │   ├── pipeline_controller.ts
│   │   │   │   ├── settings_controller.ts
│   │   │   │   ├── job_searches_controller.ts    # CRUD recherches d'offres
│   │   │   │   ├── job_offers_controller.ts      # Offres, évaluation, exclusion, statut
│   │   │   │   └── job_applications_controller.ts # Candidatures, contacts recrutement
│   │   │   ├── models/
│   │   │   │   ├── user.ts
│   │   │   │   ├── candidate_profile.ts
│   │   │   │   ├── company.ts
│   │   │   │   ├── contact.ts
│   │   │   │   ├── email_message.ts
│   │   │   │   ├── sourcing_run.ts
│   │   │   │   ├── sourcing_source.ts
│   │   │   │   ├── follow_up_sequence.ts
│   │   │   │   ├── job_search.ts                 # Configuration recherche d'offres
│   │   │   │   ├── job_offer.ts                  # Offre d'emploi scrapée
│   │   │   │   ├── job_offer_link.ts             # Lien plateforme (Seek, LinkedIn...)
│   │   │   │   ├── job_offer_exclusion.ts        # Exclusion catégorisée par l'utilisateur
│   │   │   │   ├── job_application.ts            # Candidature (CV + LM + envoi)
│   │   │   │   ├── recruitment_contact.ts        # Contact de recrutement (distinct des leads)
│   │   │   │   ├── company_cache.ts              # Cache entreprise global (TTL 1 an)
│   │   │   │   └── accreditation_cache.ts        # Cache accréditation immigration (NZ, AU)
│   │   │   ├── services/
│   │   │   │   ├── profile_service.ts
│   │   │   │   ├── sourcing_service.ts
│   │   │   │   ├── analysis_service.ts
│   │   │   │   ├── email_generation_service.ts
│   │   │   │   ├── email_sending_service.ts
│   │   │   │   ├── pipeline_service.ts
│   │   │   │   ├── cv_parser_service.ts
│   │   │   │   ├── job_search_service.ts         # Gestion recherches d'offres + quotas
│   │   │   │   ├── job_scraping_service.ts       # Orchestration scraping offres + déduplication
│   │   │   │   ├── job_ai_evaluation_service.ts  # Évaluation IA des offres (score, match, conseils)
│   │   │   │   ├── job_company_enrichment_service.ts # Enrichissement entreprise (cache global)
│   │   │   │   ├── job_cv_generation_service.ts  # Adaptation CV (Google Docs + DOCX local)
│   │   │   │   ├── job_cover_letter_service.ts   # Génération lettre de motivation
│   │   │   │   └── job_application_service.ts    # Envoi candidature + contacts recrutement
│   │   │   ├── validators/
│   │   │   │   ├── profile_validator.ts
│   │   │   │   ├── sourcing_validator.ts
│   │   │   │   ├── contact_validator.ts
│   │   │   │   ├── email_validator.ts
│   │   │   │   ├── auth_validator.ts
│   │   │   │   ├── job_search_validator.ts       # Validation config recherche
│   │   │   │   ├── job_offer_validator.ts        # Validation statut, exclusion, conseil
│   │   │   │   └── job_application_validator.ts  # Validation candidature + contacts
│   │   │   ├── mailers/
│   │   │   │   └── outreach_mailer.ts
│   │   │   ├── jobs/
│   │   │   │   ├── sourcing_job.ts
│   │   │   │   ├── analysis_job.ts
│   │   │   │   ├── email_send_job.ts
│   │   │   │   ├── follow_up_job.ts
│   │   │   │   ├── job_scraping_job.ts           # Scraping offres (par recherche)
│   │   │   │   ├── job_evaluation_job.ts         # Évaluation IA batch des offres
│   │   │   │   └── job_enrichment_job.ts         # Enrichissement entreprise batch
│   │   │   ├── scrapers/
│   │   │   │   ├── base_scraper.ts          # Classe abstraite
│   │   │   │   ├── seek_scraper.ts
│   │   │   │   ├── matchstiq_scraper.ts
│   │   │   │   ├── zeil_scraper.ts
│   │   │   │   ├── built_scraper.ts
│   │   │   │   ├── linkedin_scraper.ts
│   │   │   │   ├── apify_fallback.ts
│   │   │   │   ├── scraper_registry.ts      # Registry des scrapers par pays
│   │   │   │   └── job_offer_scraper_registry.ts # Registry scrapers offres (réutilise l'infra existante)
│   │   │   ├── ai/
│   │   │   │   ├── openrouter_client.ts     # Client OpenRouter (modèles interchangeables)
│   │   │   │   ├── relevance_analyzer.ts    # Analyse de pertinence contact/profil
│   │   │   │   ├── email_composer.ts        # Génération d'emails personnalisés
│   │   │   │   ├── cv_extractor.ts          # Extraction compétences depuis CV
│   │   │   │   └── prompts/
│   │   │   │       ├── relevance_prompt.ts
│   │   │   │       ├── email_prompt.ts
│   │   │   │       ├── follow_up_prompt.ts
│   │   │   │       ├── cv_extraction_prompt.ts
│   │   │   │       ├── job_evaluation_prompt.ts  # Évaluation offre vs profil candidat
│   │   │   │       ├── cv_adaptation_prompt.ts   # Adaptation CV (max 7 remplacements)
│   │   │   │       ├── cover_letter_prompt.ts    # Génération lettre de motivation (style NZ)
│   │   │   │       └── application_email_prompt.ts # Email de candidature (3-4 lignes)
│   │   │   ├── middleware/
│   │   │   │   └── rate_limiter_middleware.ts
│   │   │   └── exceptions/
│   │   │       └── handler.ts
│   │   ├── config/
│   │   │   ├── app.ts
│   │   │   ├── auth.ts
│   │   │   ├── database.ts
│   │   │   ├── mail.ts
│   │   │   ├── queue.ts
│   │   │   ├── cors.ts
│   │   │   ├── i18n.ts
│   │   │   └── drive.ts                    # File storage (CV uploads)
│   │   ├── database/
│   │   │   ├── migrations/
│   │   │   │   ├── 001_create_users_table.ts
│   │   │   │   ├── 002_create_candidate_profiles_table.ts
│   │   │   │   ├── 003_create_companies_table.ts
│   │   │   │   ├── 004_create_contacts_table.ts
│   │   │   │   ├── 005_create_email_messages_table.ts
│   │   │   │   ├── 006_create_sourcing_runs_table.ts
│   │   │   │   ├── 007_create_sourcing_sources_table.ts
│   │   │   │   ├── 008_create_follow_up_sequences_table.ts
│   │   │   │   ├── 009_create_company_caches_table.ts
│   │   │   │   ├── 010_create_accreditation_caches_table.ts
│   │   │   │   ├── 011_create_job_searches_table.ts
│   │   │   │   ├── 012_create_job_offers_table.ts
│   │   │   │   ├── 013_create_job_offer_links_table.ts
│   │   │   │   ├── 014_create_job_offer_exclusions_table.ts
│   │   │   │   ├── 015_create_job_applications_table.ts
│   │   │   │   └── 016_create_recruitment_contacts_table.ts
│   │   │   └── seeders/
│   │   │       ├── user_seeder.ts
│   │   │       └── sourcing_sources_seeder.ts
│   │   ├── start/
│   │   │   ├── routes.ts
│   │   │   ├── kernel.ts
│   │   │   └── events.ts
│   │   ├── resources/
│   │   │   └── lang/
│   │   │       ├── en/
│   │   │       └── fr/
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   │   ├── services/
│   │   │   │   └── ai/
│   │   │   └── functional/
│   │   │       ├── auth.spec.ts
│   │   │       ├── profile.spec.ts
│   │   │       ├── sourcing.spec.ts
│   │   │       ├── contacts.spec.ts
│   │   │       ├── emails.spec.ts
│   │   │       ├── pipeline.spec.ts
│   │   │       ├── job_searches.spec.ts
│   │   │       ├── job_offers.spec.ts
│   │   │       └── job_applications.spec.ts
│   │   ├── adonisrc.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── web/                              # Frontend Next.js 14+ (App Router)
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx              # Root layout (sidebar, theme, i18n)
│       │   │   ├── page.tsx                # Dashboard
│       │   │   ├── login/
│       │   │   │   └── page.tsx
│       │   │   ├── profile/
│       │   │   │   ├── page.tsx            # Profil édition
│       │   │   │   └── setup/
│       │   │   │       └── page.tsx        # Wizard onboarding
│       │   │   ├── sourcing/
│       │   │   │   └── page.tsx
│       │   │   ├── contacts/
│       │   │   │   ├── page.tsx            # Liste
│       │   │   │   └── [id]/
│       │   │   │       └── page.tsx        # Fiche contact
│       │   │   ├── emails/
│       │   │   │   ├── page.tsx            # Queue + validation
│       │   │   │   └── [id]/
│       │   │   │       └── page.tsx        # Preview/edit email
│       │   │   ├── pipeline/
│       │   │   │   └── page.tsx            # Kanban
│       │   │   ├── offres/                      # NOUVEAU — Pipeline offres d'emploi
│       │   │   │   ├── page.tsx                 # Page principale (3 onglets)
│       │   │   │   └── [id]/
│       │   │   │       ├── page.tsx              # Fiche détail offre
│       │   │   │       └── candidature/
│       │   │   │           └── page.tsx          # Workspace candidature (CV + LM)
│       │   │   ├── recherche-offres/            # NOUVEAU — Config recherche d'offres
│       │   │   │   └── page.tsx
│       │   │   └── settings/
│       │   │       └── page.tsx
│       │   ├── components/
│       │   │   ├── ui/                     # Design system (primitifs)
│       │   │   │   ├── button.tsx
│       │   │   │   ├── input.tsx
│       │   │   │   ├── badge.tsx
│       │   │   │   ├── card.tsx
│       │   │   │   ├── modal.tsx
│       │   │   │   ├── dropdown.tsx
│       │   │   │   ├── progress-bar.tsx
│       │   │   │   ├── skeleton.tsx
│       │   │   │   ├── toast.tsx
│       │   │   │   └── checkbox.tsx
│       │   │   ├── layout/
│       │   │   │   ├── sidebar.tsx
│       │   │   │   ├── page-header.tsx
│       │   │   │   └── mobile-nav.tsx
│       │   │   ├── dashboard/
│       │   │   │   ├── dashboard-actions.tsx
│       │   │   │   └── stats-bar.tsx
│       │   │   ├── profile/
│       │   │   │   ├── profile-form.tsx
│       │   │   │   ├── profile-wizard.tsx
│       │   │   │   ├── cv-uploader.tsx
│       │   │   │   └── ai-conversation.tsx
│       │   │   ├── sourcing/
│       │   │   │   ├── sourcing-launcher.tsx
│       │   │   │   ├── sourcing-progress.tsx
│       │   │   │   └── sourcing-history.tsx
│       │   │   ├── contacts/
│       │   │   │   ├── contact-card.tsx
│       │   │   │   ├── contact-list.tsx
│       │   │   │   ├── contact-detail.tsx
│       │   │   │   └── relevance-badge.tsx
│       │   │   ├── emails/
│       │   │   │   ├── email-preview.tsx
│       │   │   │   ├── email-queue.tsx
│       │   │   │   └── follow-up-config.tsx
│       │   │   ├── pipeline/
│       │   │       ├── pipeline-board.tsx
│       │   │       ├── pipeline-column.tsx
│       │   │       ├── pipeline-list.tsx
│       │   │       └── pipeline-filters.tsx
│       │   │   └── job-offers/                  # NOUVEAU — Composants offres d'emploi
│       │   │       ├── job-offer-card.tsx        # Card offre (score, match, badges)
│       │   │       ├── job-offers-page.tsx       # Conteneur page offres (3 onglets)
│       │   │       ├── job-offer-detail-page.tsx # Page détail offre
│       │   │       ├── application-workspace.tsx # Split CV/LM avec preview + édition
│       │   │       ├── exclusion-modal.tsx       # Modal exclusion catégorisée
│       │   │       ├── recruitment-contact-card.tsx # Card contact recrutement
│       │   │       └── collapsible-sidebar.tsx   # Sidebar avec menus collapsibles
│       │   ├── hooks/
│       │   │   ├── use-api.ts              # Fetch wrapper avec auth
│       │   │   ├── use-profile.ts
│       │   │   ├── use-contacts.ts
│       │   │   ├── use-pipeline.ts
│       │   │   ├── use-theme.ts
│       │   │   ├── use-job-searches.ts          # CRUD recherches d'offres
│       │   │   ├── use-job-offers.ts            # Liste + détail offres
│       │   │   └── use-job-application.ts       # Candidature (CV, LM, envoi)
│       │   ├── lib/
│       │   │   ├── api-client.ts           # Client HTTP (fetch-based)
│       │   │   ├── auth.ts                 # Gestion tokens/session
│       │   │   └── utils.ts
│       │   └── i18n/
│       │       ├── config.ts
│       │       ├── en.json
│       │       └── fr.json
│       ├── public/
│       │   └── icons/
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   └── shared/                           # Types et constantes partagés
│       ├── src/
│       │   ├── types/
│       │   │   ├── user.ts
│       │   │   ├── profile.ts
│       │   │   ├── company.ts
│       │   │   ├── contact.ts
│       │   │   ├── email.ts
│       │   │   ├── sourcing.ts
│       │   │   ├── pipeline.ts
│       │   │   ├── api-responses.ts
│       │   │   ├── job-search.ts                # Types JobSearch
│       │   │   ├── job-offer.ts                 # Types JobOffer, JobOfferLink, JobOfferExclusion
│       │   │   ├── job-application.ts           # Types JobApplication, RecruitmentContact
│       │   │   └── company-cache.ts             # Types CompanyCache, AccreditationCache
│       │   ├── constants/
│       │   │   ├── pipeline-statuses.ts
│       │   │   ├── relevance-levels.ts
│       │   │   ├── countries.ts
│       │   │   ├── job-offer-statuses.ts        # Statuts offres (new → accepted/rejected)
│       │   │   └── exclusion-categories.ts      # Catégories d'exclusion structurées
│       │   └── index.ts
│       ├── tsconfig.json
│       └── package.json
│
├── stacks/
│   ├── typescript-adonisjs.md            # Stack profile backend
│   └── typescript-nextjs.md              # Stack profile frontend
│
├── docker-compose.yml                    # PostgreSQL + Redis (dev)
├── pnpm-workspace.yaml
├── biome.json
├── .env.example
├── .gitignore
└── package.json                          # Root scripts (dev, build, lint, test)
```

---

## 3. Modèle de données détaillé

### Diagramme des relations

```
User 1──1 CandidateProfile
Company 1──* Contact
Contact 1──* EmailMessage
SourcingRun 1──* Contact (via sourcing_run_id)
SourcingSource (table de référence, par pays)
FollowUpSequence *──1 Contact
```

### Entités Lucid

#### User

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | uuid | PK, default uuid_generate_v4() | |
| email | varchar(255) | UNIQUE, NOT NULL | |
| password | varchar(255) | NOT NULL | Hash bcrypt |
| full_name | varchar(255) | NOT NULL | |
| locale | varchar(5) | NOT NULL, default 'en' | Langue préférée (en, fr) |
| created_at | timestamp | NOT NULL | |
| updated_at | timestamp | NOT NULL | |

**Relations** : hasOne → CandidateProfile

#### CandidateProfile

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | uuid | PK | |
| user_id | uuid | FK → users, UNIQUE, NOT NULL | Relation 1-1 |
| cv_text | text | NULL | CV en texte brut (extrait ou saisi) |
| cv_file_path | varchar(500) | NULL | Chemin fichier CV uploadé |
| skills | jsonb | NOT NULL, default '[]' | Array de compétences |
| experience_years | integer | NOT NULL, default 0 | |
| target_countries | jsonb | NOT NULL, default '[]' | Ex: ["NZ", "AU"] |
| target_sectors | jsonb | NOT NULL, default '[]' | |
| target_roles | jsonb | NOT NULL, default '[]' | |
| preferences | jsonb | NULL | Taille entreprise, remote, salaire... |
| onboarding_completed | boolean | NOT NULL, default false | Wizard terminé ? |
| created_at | timestamp | NOT NULL | |
| updated_at | timestamp | NOT NULL | |

**Index** : user_id (UNIQUE)
**Relations** : belongsTo → User

#### Company

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | uuid | PK | |
| name | varchar(255) | NOT NULL | |
| website | varchar(500) | NULL | |
| sector | varchar(100) | NULL | |
| size | varchar(20) | NULL | startup, sme, enterprise |
| city | varchar(100) | NULL | |
| country | varchar(3) | NOT NULL | Code ISO (NZ, AU, FR...) |
| linkedin_url | varchar(500) | NULL | |
| signals | jsonb | NULL | Signaux détectés |
| source | varchar(50) | NOT NULL | seek, linkedin, built... |
| created_at | timestamp | NOT NULL | |
| updated_at | timestamp | NOT NULL | |

**Index** : (name, country) UNIQUE — éviter les doublons
**Relations** : hasMany → Contact

#### Contact

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | uuid | PK | |
| user_id | uuid | FK → users, NOT NULL | Le candidat qui a trouvé ce contact |
| company_id | uuid | FK → companies, NOT NULL | |
| sourcing_run_id | uuid | FK → sourcing_runs, NULL | Run qui a trouvé ce contact |
| full_name | varchar(255) | NOT NULL | |
| role | varchar(255) | NOT NULL | Engineering Manager, CTO... |
| email | varchar(255) | NULL | |
| linkedin_url | varchar(500) | NULL | |
| source | varchar(50) | NOT NULL | Source de découverte |
| status | varchar(20) | NOT NULL, default 'identified' | Pipeline status |
| relevance_score | integer | NULL | 0-100 |
| relevance_label | varchar(20) | NULL | very_relevant, relevant, to_review, not_relevant |
| relevance_reason | text | NULL | Explication IA |
| ai_recommendation | varchar(20) | NULL | contact, skip, manual_review |
| user_override | boolean | NOT NULL, default false | |
| created_at | timestamp | NOT NULL | |
| updated_at | timestamp | NOT NULL | |

**Index** : user_id, status — filtrage pipeline
**Index** : (user_id, linkedin_url) UNIQUE WHERE linkedin_url IS NOT NULL — déduplication
**Index** : (user_id, email) UNIQUE WHERE email IS NOT NULL — déduplication
**Contrainte CHECK** : status IN ('identified', 'analyzed', 'to_contact', 'contacted', 'replied', 'interview', 'offer', 'rejected')
**Relations** : belongsTo → Company, belongsTo → User, belongsTo → SourcingRun, hasMany → EmailMessage

#### EmailMessage

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | uuid | PK | |
| contact_id | uuid | FK → contacts, NOT NULL | |
| subject | varchar(500) | NOT NULL | |
| body | text | NOT NULL | |
| type | varchar(20) | NOT NULL | initial, follow_up_1, follow_up_2, follow_up_3 |
| status | varchar(20) | NOT NULL, default 'draft' | |
| sent_at | timestamp | NULL | |
| scheduled_at | timestamp | NULL | Date prévue (relances) |
| opened_at | timestamp | NULL | |
| replied_at | timestamp | NULL | |
| created_at | timestamp | NOT NULL | |
| updated_at | timestamp | NOT NULL | |

**Index** : contact_id, status
**Contrainte CHECK** : status IN ('draft', 'approved', 'sent', 'opened', 'replied', 'bounced')
**Contrainte CHECK** : type IN ('initial', 'follow_up_1', 'follow_up_2', 'follow_up_3')
**Relations** : belongsTo → Contact

#### SourcingRun

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | uuid | PK | |
| user_id | uuid | FK → users, NOT NULL | |
| status | varchar(20) | NOT NULL, default 'pending' | |
| country | varchar(3) | NOT NULL | |
| sector | varchar(100) | NULL | |
| sources | jsonb | NOT NULL | Sources utilisées |
| contacts_found | integer | NOT NULL, default 0 | |
| started_at | timestamp | NULL | |
| completed_at | timestamp | NULL | |
| errors | jsonb | NULL | Erreurs par source |
| created_at | timestamp | NOT NULL | |
| updated_at | timestamp | NOT NULL | |

**Index** : user_id, status
**Contrainte CHECK** : status IN ('pending', 'running', 'completed', 'failed')
**Relations** : belongsTo → User, hasMany → Contact

#### SourcingSource (table de référence)

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | uuid | PK | |
| name | varchar(50) | NOT NULL | seek, matchstiq, zeil, built, linkedin |
| country | varchar(3) | NOT NULL | NZ, AU, *, etc. (* = global) |
| base_url | varchar(500) | NOT NULL | |
| scraper_class | varchar(100) | NOT NULL | Nom de la classe scraper |
| enabled | boolean | NOT NULL, default true | |
| config | jsonb | NULL | Config spécifique (rate limit, proxy...) |
| created_at | timestamp | NOT NULL | |
| updated_at | timestamp | NOT NULL | |

**Index** : (name, country) UNIQUE
**Seed data** : les sources NZ + globales

#### FollowUpSequence

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | uuid | PK | |
| user_id | uuid | FK → users, NOT NULL | |
| delay_days_1 | integer | NOT NULL, default 3 | Jours avant relance 1 |
| delay_days_2 | integer | NOT NULL, default 7 | Jours avant relance 2 |
| delay_days_3 | integer | NOT NULL, default 14 | Jours avant relance 3 |
| created_at | timestamp | NOT NULL | |
| updated_at | timestamp | NOT NULL | |

**Index** : user_id (UNIQUE) — un seul par user
**Relations** : belongsTo → User

### Entités Lucid — Pipeline Offres d'emploi

#### Diagramme des relations (Offres)

```
User 1──* JobSearch
JobSearch 1──* JobOffer
JobOffer 1──* JobOfferLink
JobOffer 1──0..1 JobOfferExclusion
JobOffer 1──* JobApplication
JobOffer 1──* RecruitmentContact
JobOffer *──1 CompanyCache (via company_cache_id)
CompanyCache (global, partagé entre utilisateurs)
AccreditationCache (global, par slug + country)
Contact *──0..1 RecruitmentContact (via linked_lead_id)
```

#### CompanyCache

> Cache global partagé entre tous les utilisateurs. TTL 1 an. Slug normalisé pour déduplication (strips Ltd, Inc, NZ, etc.).

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | uuid | PK | |
| slug | varchar(255) | UNIQUE, NOT NULL | Slug normalisé pour dédup |
| name | varchar(255) | NOT NULL | Nom affiché |
| official_name | varchar(255) | NULL | Nom officiel (Companies Register) |
| company_type | varchar(30) | NULL | recruitment_agency, hiring_company, consulting, unknown |
| web_domain | varchar(500) | NULL | |
| sector | varchar(100) | NULL | |
| industry | varchar(100) | NULL | |
| size | varchar(50) | NULL | Ex: "51-250 employees" |
| country | varchar(3) | NULL | |
| core_business | text | NULL | Description 1-2 phrases |
| tech_stack | jsonb | NULL | Array de technologies |
| culture_keywords | jsonb | NULL | Array de mots-clés culture |
| recent_developments | text | NULL | |
| linkedin_url | varchar(500) | NULL | |
| data_source | varchar(50) | NULL | perplexity, serpapi, hunter.io... |
| expires_at | timestamp | NOT NULL | Expiration cache (1 an TTL) |
| created_at | timestamp | NOT NULL | |

**Index** : slug (UNIQUE)
**Index** : expires_at — nettoyage des entrées expirées
**Relations** : hasMany → JobOffer

#### AccreditationCache

> Cache d'accréditation immigration. Global, par slug + pays. Vérifié pour NZ et AU.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | uuid | PK | |
| slug | varchar(255) | NOT NULL | Slug normalisé entreprise |
| company_name | varchar(255) | NOT NULL | |
| country | varchar(3) | NOT NULL | NZ, AU |
| is_accredited | boolean | NOT NULL | |
| accreditation_details | jsonb | NULL | Type, expiration, etc. |
| checked_at | timestamp | NOT NULL | |
| expires_at | timestamp | NOT NULL | Expiration cache |

**Index** : (slug, country) UNIQUE
**Relations** : aucune (table de cache standalone)

#### JobSearch

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | uuid | PK | |
| user_id | uuid | FK → users, NOT NULL | |
| roles | jsonb | NOT NULL | Array de rôles cibles |
| countries | jsonb | NOT NULL | Array de pays cibles |
| cities | jsonb | NULL | Array de villes (filtre optionnel) |
| platforms | jsonb | NOT NULL | Array de plateformes (seek, linkedin, builtin, zeil) |
| seniority | varchar(20) | NULL | junior, mid, senior, lead, indifferent (null = indifferent) |
| sector | varchar(100) | NULL | Filtre secteur |
| min_salary | integer | NULL | Salaire minimum (devise locale) |
| skills | jsonb | NULL | Override compétences profil |
| frequency | varchar(20) | NOT NULL, default 'weekly' | daily, biweekly, weekly, manual |
| is_active | boolean | NOT NULL, default true | |
| last_run_at | timestamp | NULL | |
| next_run_at | timestamp | NULL | |
| created_at | timestamp | NOT NULL | |
| updated_at | timestamp | NOT NULL | |

**Index** : user_id, is_active — filtrage recherches actives
**Index** : next_run_at — scheduling des runs automatiques
**Contrainte CHECK** : frequency IN ('daily', 'biweekly', 'weekly', 'manual')
**Relations** : belongsTo → User, hasMany → JobOffer

#### JobOffer

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | uuid | PK | |
| search_id | uuid | FK → job_searches, NOT NULL | |
| company_cache_id | uuid | FK → company_caches, NULL | Lien vers le cache entreprise |
| title | varchar(500) | NOT NULL | Titre du poste |
| description_raw | text | NULL | Description brute scrapée |
| status | varchar(20) | NOT NULL, default 'new' | |
| relevance_score | integer | NULL | Score IA 0-100 |
| match_summary | text | NULL | Résumé IA du match profil |
| selection_reason | text | NULL | Raison IA de sélection |
| application_advice | text | NULL | Conseils IA, modifiables par l'utilisateur |
| salary_min | integer | NULL | |
| salary_max | integer | NULL | |
| salary_currency | varchar(5) | NULL | NZD, AUD, etc. |
| location | varchar(255) | NULL | |
| remote_type | varchar(10) | NULL | onsite, hybrid, remote |
| publication_dates | jsonb | NOT NULL, default '[]' | Array de dates (détection republication) |
| closing_date | timestamp | NULL | |
| contact_email | varchar(255) | NULL | Email de contact de l'annonce |
| is_republished | boolean | NOT NULL, default false | Signal : republication |
| created_at | timestamp | NOT NULL | |
| updated_at | timestamp | NOT NULL | |

**Index** : search_id, status — filtrage par recherche et statut
**Index** : company_cache_id — jointure entreprise
**Index** : relevance_score DESC — tri par pertinence
**Contrainte CHECK** : status IN ('new', 'interested', 'applied', 'interview', 'proposition', 'accepted', 'rejected', 'excluded', 'expired')
**Relations** : belongsTo → JobSearch, belongsTo → CompanyCache, hasMany → JobOfferLink, hasOne → JobOfferExclusion, hasMany → JobApplication, hasMany → RecruitmentContact

#### JobOfferLink

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | uuid | PK | |
| offer_id | uuid | FK → job_offers, NOT NULL | |
| platform | varchar(30) | NOT NULL | seek, linkedin, builtin, zeil, custom |
| url | varchar(1000) | NOT NULL | URL directe de l'annonce |
| apply_url | varchar(1000) | NULL | URL de candidature directe |
| external_id | varchar(255) | NULL | ID plateforme pour dédup |
| scraped_at | timestamp | NOT NULL | |

**Index** : offer_id
**Index** : (platform, external_id) UNIQUE WHERE external_id IS NOT NULL — déduplication cross-plateforme
**Relations** : belongsTo → JobOffer

#### JobOfferExclusion

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | uuid | PK | |
| offer_id | uuid | FK → job_offers, UNIQUE, NOT NULL | 1-1 avec l'offre |
| user_id | uuid | FK → users, NOT NULL | |
| category | varchar(30) | NOT NULL | salary, sector, seniority, company_type, location, role_mismatch, other |
| reason | text | NOT NULL | Explication libre |
| created_at | timestamp | NOT NULL | |

**Index** : offer_id (UNIQUE)
**Index** : user_id, category — agrégation des patterns d'exclusion par catégorie
**Contrainte CHECK** : category IN ('salary', 'sector', 'seniority', 'company_type', 'location', 'role_mismatch', 'other')
**Relations** : belongsTo → JobOffer, belongsTo → User

#### JobApplication

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | uuid | PK | |
| offer_id | uuid | FK → job_offers, NOT NULL | |
| user_id | uuid | FK → users, NOT NULL | |
| cv_text | text | NULL | Texte CV adapté (remplacements appliqués) |
| cv_replacements | jsonb | NULL | Remplacements IA [{old_text, new_text}] |
| cv_user_instruction | text | NULL | Instructions utilisateur pour CV |
| cover_letter_text | text | NULL | Texte lettre de motivation |
| cover_letter_user_instruction | text | NULL | Instructions utilisateur pour LM |
| application_email_text | text | NULL | Email d'accompagnement (3-4 lignes) |
| status | varchar(20) | NOT NULL, default 'draft' | |
| sent_at | timestamp | NULL | |
| sent_to_email | varchar(255) | NULL | |
| language | varchar(5) | NOT NULL, default 'en' | Langue de génération |
| created_at | timestamp | NOT NULL | |
| updated_at | timestamp | NOT NULL | |

**Index** : offer_id, user_id
**Contrainte CHECK** : status IN ('draft', 'ready', 'sent')
**Relations** : belongsTo → JobOffer, belongsTo → User

#### RecruitmentContact

> Contacts liés à un process de recrutement spécifique. Distincts des contacts leads du pipeline de prospection.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | uuid | PK | |
| offer_id | uuid | FK → job_offers, NOT NULL | |
| name | varchar(255) | NOT NULL | |
| role | varchar(255) | NULL | Rôle dans le process (HR, Team Lead, CEO...) |
| email | varchar(255) | NULL | |
| linkedin_url | varchar(500) | NULL | |
| notes | text | NULL | Notes libres |
| linked_lead_id | uuid | FK → contacts, NULL | Si cette personne était un lead |
| created_at | timestamp | NOT NULL | |

**Index** : offer_id — tous les contacts d'une offre
**Index** : linked_lead_id — lien bidirectionnel avec le pipeline leads
**Relations** : belongsTo → JobOffer, belongsTo → Contact (optionnel, via linked_lead_id)

---

## 4. API Routes

### Auth
| Méthode | Route | Controller | Description |
|---------|-------|------------|-------------|
| POST | /api/auth/register | auth#register | Inscription |
| POST | /api/auth/login | auth#login | Connexion |
| POST | /api/auth/logout | auth#logout | Déconnexion |
| GET | /api/auth/me | auth#me | User courant |

### Profile
| Méthode | Route | Controller | Description |
|---------|-------|------------|-------------|
| GET | /api/profile | profile#show | Récupérer le profil |
| PUT | /api/profile | profile#update | Créer/mettre à jour |
| POST | /api/profile/cv | profile#uploadCv | Upload CV (PDF) |
| POST | /api/profile/complete-onboarding | profile#completeOnboarding | Finaliser wizard |

### Sourcing
| Méthode | Route | Controller | Description |
|---------|-------|------------|-------------|
| POST | /api/sourcing/run | sourcing#run | Lancer une campagne |
| GET | /api/sourcing/runs | sourcing#index | Historique des runs |
| GET | /api/sourcing/runs/:id | sourcing#show | Détail d'un run |
| GET | /api/sourcing/sources | sourcing#sources | Sources disponibles par pays |

### Contacts
| Méthode | Route | Controller | Description |
|---------|-------|------------|-------------|
| GET | /api/contacts | contacts#index | Liste paginée + filtres |
| GET | /api/contacts/:id | contacts#show | Détail contact |
| PATCH | /api/contacts/:id/status | contacts#updateStatus | Changer statut pipeline |
| PUT | /api/contacts/:id/override | contacts#override | Override reco IA |

### Analysis
| Méthode | Route | Controller | Description |
|---------|-------|------------|-------------|
| POST | /api/analysis/run | analysis#run | Lancer analyse IA batch |
| GET | /api/analysis/status | analysis#status | Statut analyse en cours |

### Emails
| Méthode | Route | Controller | Description |
|---------|-------|------------|-------------|
| GET | /api/emails | emails#index | Liste emails (filtrable par statut) |
| POST | /api/emails/generate | emails#generate | Générer emails pour contacts pertinents |
| GET | /api/emails/:id | emails#show | Détail d'un email |
| PUT | /api/emails/:id | emails#update | Modifier avant envoi |
| POST | /api/emails/:id/approve | emails#approve | Approuver un email |
| POST | /api/emails/:id/reject | emails#reject | Rejeter un email |
| POST | /api/emails/approve-batch | emails#approveBatch | Approuver en lot |
| POST | /api/emails/send | emails#send | Envoyer les emails approuvés |

### Pipeline
| Méthode | Route | Controller | Description |
|---------|-------|------------|-------------|
| GET | /api/pipeline | pipeline#index | Contacts groupés par statut + compteurs |
| GET | /api/pipeline/stats | pipeline#stats | Statistiques rapides |

### Settings
| Méthode | Route | Controller | Description |
|---------|-------|------------|-------------|
| GET | /api/settings | settings#show | Paramètres user |
| PUT | /api/settings/follow-up | settings#updateFollowUp | Config séquences relance |
| PUT | /api/settings/locale | settings#updateLocale | Changer langue |

### Job Searches (Recherches d'offres)
| Méthode | Route | Controller | Description |
|---------|-------|------------|-------------|
| POST | /api/job-searches | jobSearches#create | Créer une recherche |
| GET | /api/job-searches | jobSearches#index | Lister les recherches |
| PUT | /api/job-searches/:id | jobSearches#update | Modifier les critères |
| DELETE | /api/job-searches/:id | jobSearches#destroy | Supprimer une recherche |
| POST | /api/job-searches/:id/run | jobSearches#run | Lancer un run manuellement |

### Job Offers (Offres d'emploi)
| Méthode | Route | Controller | Description |
|---------|-------|------------|-------------|
| GET | /api/job-offers | jobOffers#index | Liste paginée + filtres (searchId, status) |
| GET | /api/job-offers/:id | jobOffers#show | Détail offre (entreprise, liens, score) |
| PATCH | /api/job-offers/:id/status | jobOffers#updateStatus | Changer statut suivi |
| POST | /api/job-offers/:id/exclude | jobOffers#exclude | Exclure avec raison catégorisée |
| PUT | /api/job-offers/:id/advice | jobOffers#updateAdvice | Modifier conseils de candidature |
| GET | /api/job-offers/exclusions | jobOffers#exclusions | Patterns d'exclusion de l'utilisateur |
| GET | /api/job-offers/:id/cross-contacts | jobOffers#crossContacts | Vérifier contacts leads existants chez l'entreprise |

### Job Applications (Candidatures)
| Méthode | Route | Controller | Description |
|---------|-------|------------|-------------|
| POST | /api/job-offers/:id/cv/generate | jobApplications#generateCv | Générer CV adapté |
| POST | /api/job-offers/:id/cv/refine | jobApplications#refineCv | Raffiner CV avec instructions |
| PUT | /api/job-offers/:id/cv | jobApplications#updateCv | Modifier CV manuellement |
| GET | /api/job-offers/:id/cv/pdf | jobApplications#cvPdf | Exporter CV en PDF |
| POST | /api/job-offers/:id/cover-letter/generate | jobApplications#generateCoverLetter | Générer lettre de motivation |
| POST | /api/job-offers/:id/cover-letter/refine | jobApplications#refineCoverLetter | Raffiner LM avec instructions |
| GET | /api/job-offers/:id/cover-letter/pdf | jobApplications#coverLetterPdf | Exporter LM en PDF |
| POST | /api/job-offers/:id/apply | jobApplications#send | Envoyer candidature (CV + LM en PJ) |
| POST | /api/job-offers/:id/contacts | jobApplications#addContact | Ajouter contact recrutement |
| GET | /api/job-offers/:id/contacts | jobApplications#listContacts | Lister contacts recrutement |
| POST | /api/job-offers/:id/contacts/:contactId/email | jobApplications#draftEmail | Brouillon email IA (suivi, remerciement) |

### Platforms (Plateformes suggérées)
| Méthode | Route | Controller | Description |
|---------|-------|------------|-------------|
| GET | /api/platforms/suggestions | jobSearches#platformSuggestions | Suggestions plateformes par pays |
| POST | /api/job-searches/:id/platforms | jobSearches#addPlatform | Ajouter plateforme personnalisée |

---

## 5. Architecture des scrapers (Connecteurs pluggables)

### Pattern : Strategy + Registry

```typescript
// base_scraper.ts — Classe abstraite
abstract class BaseScraper {
  abstract readonly name: string
  abstract readonly country: string

  abstract scrape(params: ScrapeParams): Promise<RawContact[]>

  // Méthodes communes
  protected async withAntiDetection(fn: () => Promise<Response>): Promise<Response> {
    // User-agent rotation, random delays (2-10s), proxy support
  }

  protected deduplicateContacts(contacts: RawContact[]): RawContact[] {
    // Déduplication par email + LinkedIn URL
  }
}

// scraper_registry.ts — Registry par pays
class ScraperRegistry {
  private scrapers: Map<string, BaseScraper[]> = new Map()

  register(scraper: BaseScraper): void { ... }
  getForCountry(country: string): BaseScraper[] { ... }
}
```

### Flux scraping
1. `SourcingJob` dispatché en queue
2. `SourcingService` récupère les scrapers pour le pays via `ScraperRegistry`
3. Chaque scraper s'exécute en parallèle (avec concurrency limitée)
4. Les résultats sont agrégés et dédupliqués
5. Les contacts sont persistés, le `SourcingRun` est mis à jour
6. Si un scraper échoue → `ApifyFallback` pour cette source

### Scrapers d'offres d'emploi (Job Offer Scraper Registry)

Le scraping d'offres réutilise le pattern Strategy + Registry existant, mais produit des `JobOffer` au lieu de `Contact`.

```typescript
// job_offer_scraper_registry.ts — Réutilise BaseScraper, spécialisé offres
class JobOfferScraperRegistry {
  private scrapers: Map<string, BaseScraper[]> = new Map()

  register(scraper: BaseScraper): void { ... }
  getForPlatform(platform: string): BaseScraper { ... }
}
```

#### Stratégie de scraping par plateforme

| Plateforme | Méthode primaire | Fallback | Notes |
|------------|-----------------|----------|-------|
| Seek | Playwright in-house | Apify (après 3 échecs consécutifs ou captcha) | |
| BuiltIn | Playwright in-house | Apify (après 3 échecs consécutifs ou captcha) | |
| Zeil | Playwright in-house | Apify (après 3 échecs consécutifs ou captcha) | |
| LinkedIn | Apify uniquement | — | **Jamais de scraping in-house** (risque anti-bot, ban compte) |
| Custom | Apify si acteur disponible | — | Plateformes ajoutées par l'utilisateur |

#### Flux scraping offres
1. `JobScrapingJob` dispatché en queue (via BullMQ)
2. `JobScrapingService` récupère la config `JobSearch` et les plateformes cibles
3. Pour chaque plateforme : exécution du scraper correspondant
4. **Déduplication cross-plateforme** (hybride) :
   - Pré-filtre par règles : même entreprise + même ville + titre similaire → candidat doublon
   - IA pour les cas ambigus (titre reformulé, entreprise avec variantes de nom)
5. Détection de **republication** : offre déjà existante trouvée à nouveau → mise à jour `publication_dates`, flag `is_republished`
6. Création/mise à jour des `JobOffer` + `JobOfferLink` en base
7. Quotas appliqués : free = top 5 (par score IA), premium = illimité
8. L'utilisation Apify est loguée et trackée par utilisateur (contrôle de coûts)

---

## 6. Architecture IA

### Client OpenRouter

```typescript
// openrouter_client.ts
class OpenRouterClient {
  async chat(params: {
    model: string       // Configurable (gpt-4o-mini, claude-3-haiku, etc.)
    messages: Message[]
    temperature?: number
    maxTokens?: number
  }): Promise<string>
}
```

### Flux analyse de pertinence
1. `AnalysisJob` dispatché après sourcing
2. Pour chaque contact non analysé :
   - Construit le contexte : profil candidat + infos contact + infos entreprise
   - Appelle `RelevanceAnalyzer.analyze()` via OpenRouter
   - Parse la réponse structurée (score 0-100, label, reason, recommendation)
   - Met à jour le contact en base
3. Traitement en batch (10 contacts/batch) avec rate limiting
4. Cache des résultats par (contact_id, profile_hash) pour éviter les re-analyses

### Flux génération d'emails
1. Pour chaque contact avec recommandation "contact" :
   - `EmailComposer.compose()` génère sujet + corps
   - Le prompt inclut : profil candidat, profil contact, entreprise, langue cible
   - L'email est sauvé en statut "draft"
2. Les relances utilisent un prompt différent avec contexte de l'email précédent

### Budget IA (Prospection)
- Modèle par défaut : `gpt-4o-mini` (via OpenRouter) — ~0.15$/1M tokens input
- Estimation : ~500 tokens/analyse + ~800 tokens/email
- 100 contacts = ~0.02$ analyse + ~0.02$ emails = ~0.04$ par campagne
- Budget 30$/mois = ~750 campagnes/mois (largement suffisant)

### Flux évaluation IA des offres d'emploi

1. `JobEvaluationJob` dispatché après le scraping d'une recherche
2. Pour chaque offre non évaluée :
   - Construit le contexte : profil candidat + description offre + infos entreprise (CompanyCache)
   - Injecte les **exclusions structurées** de l'utilisateur comme préférences négatives dans le prompt
   - Appelle `JobAiEvaluationService.evaluate()` via OpenRouter
   - Parse la réponse structurée :
     - `relevance_score` (0-100) — pertinence globale
     - `match_summary` — résumé de ce qui matche avec le profil et les attentes
     - `selection_reason` — raison de sélection de cette offre
     - `application_advice` — conseils pour orienter la candidature (modifiables par l'utilisateur)
   - Met à jour l'offre en base
3. Traitement en batch (10 offres/batch) avec rate limiting
4. L'`application_advice` est utilisé comme instruction pour la génération CV et lettre de motivation

### Flux adaptation CV

Approche hybride offrant deux méthodes (cf. CL-014) :

#### Méthode 1 : Google Docs API (recommandée)
1. Copie du template CV de l'utilisateur dans Google Drive
2. Extraction du texte via Google Docs API
3. L'IA génère **max 7 remplacements ciblés** (`[{old_text, new_text}]`) en utilisant :
   - Profil candidat, description de l'offre, infos entreprise, `application_advice`
4. Application des remplacements via `documents.batchUpdate` (méthode `replaceAllText`)
5. L'utilisateur peut affiner via des instructions (avant ET après génération)
6. Édition manuelle du texte possible
7. Export PDF via Google Drive API

#### Méthode 2 : Templates locales DOCX (alternative)
1. Upload DOCX par l'utilisateur
2. Traitement avec `jszip` + `xml-parser` + logique de fusion de runs
3. Même pipeline IA (max 7 remplacements)
4. Application des remplacements dans le XML du DOCX
5. Export PDF via LibreOffice headless (`libreoffice --convert-to pdf`)

**UI** : badge "Meilleurs résultats" sur l'option Google Docs.

### Flux génération lettre de motivation

1. L'IA génère une lettre de motivation en utilisant :
   - CV candidat, description de l'offre, infos entreprise, `application_advice`
   - **Exception agences de recrutement** : si `company_type === 'recruitment_agency'`, les données de recherche entreprise sont ignorées (seules les données de l'annonce sont utilisées)
   - Style adapté au pays cible (style NZ par défaut : direct, concis, orienté résultats)
2. L'utilisateur peut raffiner via des instructions (avant ET après génération)
3. Édition manuelle du texte possible
4. Export PDF

### Flux génération email de candidature

1. L'IA génère un email court (3-4 lignes) pour accompagner le CV et la LM en pièces jointes
2. Le ton est **adapté au pays cible** :
   - NZ/AU : décontracté, direct
   - France : formel
   - Japon : formel, respectueux de la hiérarchie
3. L'email référence le poste spécifique et l'entreprise
4. Ne répète **pas** le contenu de la lettre de motivation
5. Modifiable par l'utilisateur avant envoi

### Flux apprentissage des exclusions

1. Quand l'utilisateur exclut une offre, il fournit :
   - `category` : salary, sector, seniority, company_type, location, role_mismatch, other
   - `reason` : texte libre explicatif
2. Les exclusions sont persistées dans `JobOfferExclusion`
3. Lors de l'évaluation IA de nouvelles offres, toutes les exclusions passées de l'utilisateur sont **injectées dans le prompt** comme préférences négatives
4. L'IA ajuste ses scores en conséquence (ex: si l'utilisateur a exclu 3 offres pour "salary too low < 120k", les offres avec salaire < 120k recevront un score réduit)

### Langue de génération (CV, LM, email)

La langue est déduite du pays cible de l'offre (cf. CL-017) :
- NZ/AU/UK/US → Anglais (défaut)
- France → Français (défaut)
- Japon → Anglais (standard pour expats)
- L'utilisateur peut override via un sélecteur de langue avant chaque génération
- La même langue s'applique au CV adapté et à la lettre de motivation

### Budget IA (Offres d'emploi)
- Évaluation offre : ~600 tokens/offre (profil + offre + entreprise + exclusions)
- Adaptation CV : ~1200 tokens (profil + offre + 7 remplacements)
- Lettre de motivation : ~1000 tokens
- Email candidature : ~300 tokens
- Estimation : 20 offres/semaine = ~0.05$ évaluation + ~0.04$ CV + ~0.03$ LM = ~0.12$/semaine
- Compatible avec le budget 30$/mois global

---

## 7. Plan d'implémentation

### Épiques et ordre d'implémentation

Les features sont regroupées en épiques, ordonnées par dépendances :

#### Épique 0 : Scaffold & Infrastructure
```
0.1 [Setup] Initialiser le monorepo pnpm + packages/shared
0.2 [Setup] Scaffolder apps/api (AdonisJS 6) avec config de base
0.3 [Setup] Scaffolder apps/frontend (Next.js 14, App Router, Tailwind)
0.4 [Setup] docker-compose.yml (PostgreSQL + Redis)
0.5 [Setup] Configurer Biome (linting/formatting)
0.6 [Setup] Configurer les scripts root (dev, build, lint, test)
0.7 [Setup] Design system de base (tokens Tailwind, composants ui/)
0.8 [Setup] i18n infrastructure (next-intl frontend + @adonisjs/i18n backend, fichiers fr.json + en.json)
```
**Dépendances** : aucune
**Livrable** : monorepo fonctionnel, `pnpm dev` lance API + Web, i18n opérationnel

#### Épique 1 : Auth & User (Feature: candidate-profile — partie auth)
```
1.1 [Data] Migration users table
1.2 [Data] Model User
1.3 [Core] Auth AdonisJS (session/token)
1.4 [API] Routes auth (register, login, logout, me)
1.5 [UI] Pages login + register
1.6 [UI] Layout authentifié (sidebar, routing protégé)
1.7 [Test] Tests fonctionnels auth
```
**Dépendances** : Épique 0
**Livrable** : inscription/connexion fonctionnelle, layout avec sidebar

#### Épique 2 : Profil candidat (Feature: candidate-profile)
```
2.1 [Data] Migration candidate_profiles + follow_up_sequences
2.2 [Data] Models CandidateProfile, FollowUpSequence
2.3 [Core] ProfileService + CvParserService
2.4 [Core] AI: CvExtractor (extraction compétences via OpenRouter)
2.5 [API] Routes profile (CRUD + upload CV)
2.6 [UI] ProfileWizard (3 étapes : infos, CV upload, IA conversationnelle)
2.7 [UI] ProfileForm (édition après onboarding)
2.8 [Test] Tests profil + parsing CV
```
**Dépendances** : Épique 1
**Livrable** : onboarding complet, profil éditable, CV parsé par IA

#### Épique 3 : Sourcing (Feature: contact-sourcing)
```
3.1 [Data] Migrations companies, contacts, sourcing_runs, sourcing_sources
3.2 [Data] Models Company, Contact, SourcingRun, SourcingSource
3.3 [Data] Seeder sourcing_sources (NZ + global)
3.4 [Core] BaseScraper + ScraperRegistry
3.5 [Core] SeekScraper (premier scraper concret)
3.6 [Core] ApifyFallback
3.7 [Core] SourcingService (orchestration, déduplication)
3.8 [Core] SourcingJob (background job)
3.9 [API] Routes sourcing (run, status, historique, sources)
3.10 [UI] SourcingLauncher (formulaire assisté IA)
3.11 [UI] SourcingProgress (barre de progression temps réel)
3.12 [UI] SourcingHistory (liste des campagnes)
3.13 [Test] Tests scraping (mocks) + intégration sourcing
```
**Dépendances** : Épique 2 (profil nécessaire pour les suggestions)
**Livrable** : lancer un sourcing, voir la progression, voir les contacts trouvés

#### Épique 4 : Analyse IA (Feature: ai-relevance-analysis)
```
4.1 [Core] OpenRouterClient
4.2 [Core] RelevanceAnalyzer + prompts
4.3 [Core] AnalysisService (batch processing, cache)
4.4 [Core] AnalysisJob (background job)
4.5 [API] Routes analysis (run, status)
4.6 [API] Routes contacts (index avec filtres, show, override)
4.7 [UI] ContactList (liste paginée avec badges pertinence)
4.8 [UI] ContactCard + RelevanceBadge
4.9 [UI] ContactDetail (fiche complète)
4.10 [Test] Tests analyse IA (mock OpenRouter) + contacts
```
**Dépendances** : Épique 3 (contacts nécessaires)
**Livrable** : contacts analysés par l'IA, badges de pertinence, fiches contact

#### Épique 5 : Emailing (Feature: personalized-emailing)
```
5.1 [Data] Migration email_messages
5.2 [Data] Model EmailMessage
5.3 [Core] EmailComposer (génération via OpenRouter)
5.4 [Core] EmailGenerationService (batch)
5.5 [Core] EmailSendingService (envoi via Gmail API / SMTP)
5.6 [Core] EmailSendJob + FollowUpJob (background jobs)
5.7 [Core] OutreachMailer (AdonisJS Mailer)
5.8 [API] Routes emails (CRUD, approve, reject, send)
5.9 [UI] EmailPreview (preview + édition)
5.10 [UI] EmailQueue (validation hybride : 3 un par un + lot)
5.11 [UI] FollowUpConfig
5.12 [Test] Tests emailing (mock SMTP) + génération
```
**Dépendances** : Épique 4 (contacts analysés nécessaires)
**Livrable** : emails générés par l'IA, validés, envoyés, relances planifiées

#### Épique 6 : Pipeline (Feature: pipeline-dashboard)
```
6.1 [Core] PipelineService (agrégation par statut)
6.2 [API] Routes pipeline (index, stats)
6.3 [UI] PipelineBoard (kanban 5 colonnes, drag & drop)
6.4 [UI] PipelineList (vue alternative)
6.5 [UI] PipelineFilters
6.6 [Test] Tests pipeline
```
**Dépendances** : Épiques 3-5 (contacts + emails pour avoir des données)
**Livrable** : vue kanban fonctionnelle, drag & drop, filtres

#### Épique 7 : Dashboard & Settings
```
7.1 [UI] DashboardActions (to-do list d'actions en attente)
7.2 [UI] StatsBar (compteurs rapides)
7.3 [UI] SettingsPage (compte, connecteur email, relances, thème, langue)
7.4 [Core] Intégration complète des notifications dashboard
7.5 [Test] Tests dashboard + settings
```
**Dépendances** : Épiques 1-6 (le dashboard agrège tout)
**Livrable** : dashboard fonctionnel, settings complets

#### Épique 8 : Polish & Audit
```
8.1 [i18n] Audit couverture traductions (vérifier qu'aucun texte n'est en dur)
8.2 [UI] Dark mode (CSS variables, toggle settings)
8.3 [UI] Responsive mobile (sidebar hamburger, kanban horizontal scroll)
8.4 [A11y] Accessibilité WCAG 2.1 AA (focus, aria, skip link, clavier)
8.5 [Test] Tests i18n + a11y
```
**Dépendances** : Épique 7
**Note** : L'infrastructure i18n est mise en place à l'Épique 0.8. Chaque feature ajoute ses traductions au fur et à mesure. Cette épique ne fait qu'auditer la couverture et corriger les oublis.
**Livrable** : couverture i18n complète, dark mode, responsive, accessible

#### Épique 9 : Scrapers additionnels
```
9.1 [Core] MatchstiqScraper
9.2 [Core] ZeilScraper
9.3 [Core] BuiltScraper
9.4 [Core] LinkedInScraper
9.5 [Test] Tests par scraper
```
**Dépendances** : Épique 3 (infrastructure scraping en place)
**Note** : Peut être fait en parallèle des épiques 4-8

---

### Épiques — Pipeline Offres d'emploi (E10-E14)

#### Épique 10 : Recherche & Scraping d'offres (Features: job-search-config + job-scraping-pipeline)
```
10.1  [Data] Migrations company_caches, accreditation_caches, job_searches, job_offers, job_offer_links (009-013)
10.2  [Data] Models CompanyCache, AccreditationCache, JobSearch, JobOffer, JobOfferLink
10.3  [Core] JobSearchService (CRUD, quotas free/premium, scheduling)
10.4  [Core] JobOfferScraperRegistry (réutilise BaseScraper, spécialisé offres)
10.5  [Core] Scrapers offres : Seek, BuiltIn, Zeil (Playwright in-house + Apify fallback)
10.6  [Core] Scraper LinkedIn offres (Apify uniquement)
10.7  [Core] JobScrapingService (orchestration, déduplication cross-plateforme hybride)
10.8  [Core] Détection de republication (publication_dates, is_republished)
10.9  [Core] JobScrapingJob (background job BullMQ)
10.10 [API] Routes job-searches (CRUD, run, platforms)
10.11 [API] Routes job-offers (index, show)
10.12 [UI] Page /recherche-offres (config recherche, sélection plateformes)
10.13 [UI] SearchProgressModal (progression temps réel du scraping)
10.14 [Test] Tests scraping offres (mocks) + intégration recherche + quotas
```
**Dépendances** : Épique 3 (infrastructure scraping), Épique 2 (profil candidat)
**Estimation** : XL
**Livrable** : configurer une recherche, lancer le scraping, voir les offres trouvées, déduplication, quotas

#### Épique 11 : Évaluation & Enrichissement (Features: job-ai-evaluation + job-company-enrichment)
```
11.1 [Core] JobCompanyEnrichmentService (Perplexity + SerpApi + Hunter.io, cache global TTL 1 an)
11.2 [Core] AccreditationCache (vérification immigration NZ/AU)
11.3 [Core] JobAiEvaluationService (score, match_summary, selection_reason, application_advice)
11.4 [Core] JobEvaluationJob (background job batch)
11.5 [Core] JobEnrichmentJob (background job batch)
11.6 [Data] Migration job_offer_exclusions (014)
11.7 [Data] Model JobOfferExclusion
11.8 [Core] Exclusion learning (injection dans le prompt d'évaluation)
11.9 [API] Routes évaluation (exclude, advice, exclusions, cross-contacts)
11.10 [Test] Tests évaluation IA (mock OpenRouter) + enrichissement + exclusions
```
**Dépendances** : Épique 10 (offres nécessaires)
**Estimation** : L
**Livrable** : offres évaluées par l'IA, entreprises enrichies, accréditation immigration, exclusions apprises

#### Épique 12 : Page Offres (Feature: job-offers-page)
```
12.1 [UI] CollapsibleSidebar (menus parents pliables, état persisté localStorage)
12.2 [UI] JobOffersPage (3 onglets : Nouvelles, Postulées, Archivées)
12.3 [UI] JobOfferCard (score, match, badges accréditation, republication, contact croisé)
12.4 [UI] JobOfferDetailPage (fiche complète, liens, entreprise, score breakdown)
12.5 [UI] ExclusionModal (catégorie structurée + raison libre)
12.6 [UI] Cross-pipeline indicators (badge "Vous avez un contact chez cette entreprise")
12.7 [UI] Statuts de suivi (Nouvelle → Intéressée → Postulée → ... → Acceptée / Rejetée)
12.8 [UI] Détection expiration silencieuse (onglet Archivées)
12.9 [API] Route PATCH /api/job-offers/:id/status
12.10 [Test] Tests page offres + composants + interactions
```
**Dépendances** : Épiques 10-11 (offres évaluées + entreprises enrichies)
**Estimation** : L
**Livrable** : page offres fonctionnelle avec filtres, badges, statuts, exclusion, sidebar collapsible

#### Épique 13 : Candidature (Features: job-cv-generation + job-cover-letter + job-application-send)
```
13.1  [Data] Migrations job_applications, recruitment_contacts (015-016)
13.2  [Data] Models JobApplication, RecruitmentContact
13.3  [Core] JobCvGenerationService (Google Docs API + DOCX local, max 7 remplacements)
13.4  [Core] JobCoverLetterService (style NZ, skip agency data)
13.5  [Core] JobApplicationService (envoi email, PJ PDF, contacts recrutement)
13.6  [Core] AI prompts : cv_adaptation, cover_letter, application_email
13.7  [Core] Gestion langue (déduite du pays, modifiable)
13.8  [Core] Quotas génération (1/semaine free, illimité premium)
13.9  [Core] Lien lead ↔ recruitment contact (flag in_recruitment_process, re-prospect)
13.10 [API] Routes candidature (generate CV, refine, cover letter, apply, contacts, email)
13.11 [UI] ApplicationWorkspace (split CV gauche / LM droite)
13.12 [UI] Sélecteur langue + instructions avant/après génération
13.13 [UI] RecruitmentContactCard (ajout, liste, email IA)
13.14 [UI] Badge méthode CV (Google Docs = "Meilleurs résultats")
13.15 [Test] Tests génération CV + LM + envoi candidature + contacts recrutement
```
**Dépendances** : Épique 12 (page offres), Épique 5 (infrastructure email existante)
**Estimation** : XL
**Livrable** : workspace candidature complet, CV adapté, LM, envoi avec PJ, contacts recrutement

#### Épique 14 : Configuration avancée (Features: job-recurring-search + job-custom-platforms + job-notifications)
```
14.1 [Core] Recherche récurrente (fréquence configurable : daily, biweekly, weekly, manual)
14.2 [Core] Scheduling automatique via cron (next_run_at)
14.3 [Core] Plateformes personnalisées (ajout URL, suggestions par pays via Apify actors)
14.4 [UI] Config fréquence dans /recherche-offres
14.5 [UI] Ajout plateforme personnalisée
14.6 [UI] Notifications in-app (badge nouvelles offres sur sidebar)
14.7 [Core] Email digest nouvelles offres (optionnel)
14.8 [Test] Tests récurrence + plateformes custom + notifications
```
**Dépendances** : Épique 10 (recherches d'offres en place)
**Estimation** : M
**Livrable** : recherches récurrentes, plateformes custom, notifications nouvelles offres

---

## 8. Décisions d'architecture (ADR)

### ADR-001 : TypeScript fullstack (Node.js)
- **Contexte** : Le projet est un SaaS fullstack avec scraping, IA, et emailing. Python est souvent proposé par défaut pour l'IA, mais ici l'app est consommatrice d'API LLM, pas un outil ML.
- **Décision** : TypeScript pour tout (backend + frontend)
- **Alternatives** : Python (FastAPI) + TypeScript (frontend) — 2 runtimes, 2 ecosystèmes
- **Conséquences** :
  - Un seul runtime Node.js sur le VPS (30$/mois)
  - Types partagés via `packages/shared`
  - Playwright natif pour le scraping
  - Libs LLM matures (OpenAI SDK, Vercel AI SDK compatibles OpenRouter)
  - Moins de RAM que Python + Celery

### ADR-002 : AdonisJS comme framework backend
- **Contexte** : Le projet nécessite auth, mail, queue, i18n, validation, ORM. Évaluation de NestJS, Hono, Fastify et AdonisJS.
- **Décision** : AdonisJS 6
- **Alternatives** :
  - NestJS : puissant mais ~5 briques externes à câbler (TypeORM, Bull, nodemailer, i18next, class-validator)
  - Hono : ultra-léger mais ~7 briques à assembler
  - Fastify : rapide mais tout est plugin communautaire
- **Conséquences** :
  - 0 briques externes : auth, mail, queue (BullMQ), i18n, validation (VineJS), ORM (Lucid) intégrés
  - Structure MVC imposée : code organisé sans effort
  - Productivité MVP maximale
  - Communauté plus petite que NestJS (risque accepté)

### ADR-003 : Next.js (App Router) + Tailwind CSS pour le frontend
- **Contexte** : Le frontend est un SaaS classique (sidebar, formulaires, kanban, listes). SSR non critique mais SEO optionnel.
- **Décision** : Next.js 14+ avec App Router + Tailwind CSS
- **Alternatives** :
  - Remix : bon pour le SSR mais moins mature côté écosystème
  - SPA pur (Vite + React) : plus simple mais perd le SSR/ISR
- **Conséquences** :
  - App Router pour le routing et les layouts (nested layouts pour sidebar)
  - Server Components là où c'est pertinent (pages statiques, settings)
  - Client Components pour l'interactivité (kanban, forms, real-time)
  - Tailwind pour le design system (tokens CSS, dark mode natif)

### ADR-004 : REST API (pas tRPC)
- **Contexte** : Communication frontend ↔ backend. tRPC offre le type safety end-to-end mais couple fortement les deux apps.
- **Décision** : REST API classique avec types partagés dans `packages/shared`
- **Alternatives** : tRPC, GraphQL
- **Conséquences** :
  - API testable indépendamment (curl, Postman, tests fonctionnels)
  - Réutilisable par une future app mobile (React Native)
  - Types partagés via le package shared (type safety manuelle mais suffisante)
  - Pas de couplage framework entre API et frontend

### ADR-005 : Connecteurs de scraping pluggables (Strategy + Registry)
- **Contexte** : Chaque pays a ses propres sources de données. Le système doit supporter facilement l'ajout de nouvelles sources sans modifier le code existant.
- **Décision** : Pattern Strategy (BaseScraper abstrait) + Registry (ScraperRegistry qui mappe pays → scrapers)
- **Alternatives** :
  - Switch/case par source : simple mais ne scale pas
  - Plugin system complet : overkill pour le MVP
- **Conséquences** :
  - Ajouter un scraper = créer une classe + l'enregistrer dans le registry
  - Chaque scraper gère ses propres spécificités (anti-détection, parsing HTML)
  - ApifyFallback comme dernier recours uniforme
  - Testable unitairement (mock HTTP)

### ADR-006 : Background jobs via BullMQ (@adonisjs/queue)
- **Contexte** : Le scraping et l'analyse IA sont des opérations longues (secondes à minutes). Elles ne doivent pas bloquer les requêtes HTTP.
- **Décision** : BullMQ via le package natif @adonisjs/queue, avec Redis comme broker
- **Alternatives** :
  - Agenda.js (MongoDB) : pas de PostgreSQL
  - Cron + polling : moins réactif, plus fragile
- **Conséquences** :
  - Redis requis (docker-compose + Hostinger VPS)
  - Jobs retry-able, avec backoff exponentiel
  - Dashboard BullMQ optionnel pour le monitoring
  - 4 types de jobs : sourcing, analysis, email_send, follow_up

### ADR-007 : pnpm workspaces (pas Turborepo/Nx)
- **Contexte** : Le projet est un monorepo avec 3 packages (api, web, shared). Turborepo/Nx ajoutent du caching et de l'orchestration.
- **Décision** : pnpm workspaces simples, sans orchestrateur
- **Alternatives** : Turborepo, Nx
- **Conséquences** :
  - Zero config supplémentaire
  - Scripts root dans package.json (`pnpm --filter api dev`, etc.)
  - Suffisant pour un projet à 3 packages
  - Migration vers Turborepo possible plus tard si le build time pose problème

### ADR-021 : Adaptation CV hybride (Google Docs API + templates DOCX locales)
- **Contexte** : L'adaptation du CV à chaque offre nécessite des remplacements ciblés dans un document mis en forme. Deux cas d'usage : utilisateur avec Google Account et utilisateur sans.
- **Décision** : Deux méthodes au choix. (1) Google Docs API comme méthode recommandée : copie template, extraction texte, remplacements IA (max 7) via `replaceAllText`, export PDF. (2) Traitement DOCX local comme alternative : jszip + xml-parser + fusion de runs, export PDF via LibreOffice headless.
- **Alternatives** :
  - Google Docs uniquement : exclut les utilisateurs sans Google Account
  - DOCX uniquement : résultats inférieurs (problèmes de runs XML fractionnés)
  - Markdown / LaTeX : perte de mise en forme originale du CV
- **Conséquences** :
  - Dépendance Google APIs (optionnelle, dégradation gracieuse)
  - LibreOffice headless requis sur le serveur pour la méthode DOCX → PDF
  - UI indique clairement que Google Docs donne de meilleurs résultats (badge)
  - Max 7 remplacements : préserve la structure originale du CV

### ADR-022 : Déduplication cross-plateforme des offres (règles + IA)
- **Contexte** : La même offre peut apparaître sur Seek, LinkedIn, BuiltIn. Il faut éviter les doublons tout en gérant les cas ambigus (titre reformulé, variantes de nom d'entreprise).
- **Décision** : Approche hybride. (1) Pré-filtre par règles : même entreprise (slug normalisé) + même ville + titre similaire (Levenshtein > 0.8). (2) IA pour les cas ambigus qui passent le pré-filtre avec un score intermédiaire.
- **Alternatives** :
  - Règles uniquement : rate les cas ambigus (titres reformulés)
  - IA pour tout : coûteux et lent pour les cas triviaux
  - external_id uniquement : les plateformes n'exposent pas toujours un ID stable
- **Conséquences** :
  - Entité `JobOfferLink` : une offre = N liens plateformes
  - Le pré-filtre traite ~90% des cas sans appel IA
  - Coût IA marginal pour les ~10% ambigus
  - Slug normalisé dans `CompanyCache` (strips Ltd, Inc, NZ, etc.)

### ADR-023 : Cache entreprise global (CompanyCache partagé entre utilisateurs)
- **Contexte** : L'enrichissement entreprise (Perplexity, SerpApi, Hunter.io) consomme des tokens et des API calls. Plusieurs utilisateurs peuvent chercher des offres chez la même entreprise.
- **Décision** : Cache global partagé entre tous les utilisateurs, TTL 1 an, slug normalisé comme clé de dédup.
- **Alternatives** :
  - Cache par utilisateur : duplication des données, coûts multipliés
  - Pas de cache : appels API à chaque offre, coûts prohibitifs
  - TTL plus court (1 mois) : renouvellement trop fréquent, les données entreprise évoluent lentement
- **Conséquences** :
  - Table `company_caches` sans `user_id` (globale)
  - Table `accreditation_caches` séparée (spécifique immigration NZ/AU)
  - Slug normalisé : `"Xero NZ Limited"` → `"xero"` pour dédup
  - Pattern issu du workflow n8n existant (Perplexity + SerpApi + Hunter.io MCP en fallback)
  - Réduction estimée : 80% des appels API économisés après montée en charge

### ADR-024 : Sidebar collapsible avec menus parents (dual mode)
- **Contexte** : L'ajout du pipeline offres d'emploi double le nombre d'entrées dans la sidebar. La navigation doit rester lisible sans surcharger l'interface.
- **Décision** : Menus parents collapsibles regroupant les liens par pipeline (Prospection, Offres d'emploi, Paramètres). État persisté en localStorage. Badges compteurs visibles même quand le menu est fermé.
- **Alternatives** :
  - Sidebar plate (tous les liens visibles) : trop long avec 2 pipelines
  - Tabs en haut de page : perd le contexte de navigation global
  - Sidebar rétractable (icônes uniquement) : perd les labels, moins accessible
- **Conséquences** :
  - Chevron `>` / `v` pour toggle
  - Animation collapse/expand : hauteur 150ms ease-in-out
  - Le menu contenant la page active est automatiquement ouvert au chargement
  - Composant `CollapsibleSidebar` remplace la sidebar actuelle

---

## 9. Infrastructure & Déploiement

### Environnement de développement
- **docker-compose.yml** : PostgreSQL 16 + Redis 7
- **pnpm dev** : lance API (port 3333) + Web (port 3000) en parallèle
- **Variables d'environnement** : `.env` à la racine, chargé par AdonisJS (Env module)

### Environnement de production (VPS Hostinger KVM2)
```
VPS Hostinger KVM2
├── PostgreSQL 16 (service systemd)
├── Redis 7 (service systemd)
├── Node.js 20 LTS
├── apps/api → PM2 (process manager)
├── apps/frontend → PM2 (Next.js standalone)
└── Nginx (reverse proxy, SSL via Let's Encrypt)
```

### CI/CD (GitHub Actions)
```
push → lint (biome) → test (japa + vitest) → build → deploy (SSH + PM2 reload)
```

---

## 10. Shared Component Inventory (UI)

> Reference for refinement agent (component reuse audit) and developer agent (reuse check before creating).
> Directory: `apps/frontend/src/components/ui/`

```yaml
shared_components:
  directory: "apps/frontend/src/components/ui/"
  components:
    - name: "Button"
      path: "button.tsx"
      variants: ["primary", "secondary", "danger", "ghost"]

    - name: "ConfidenceScore"
      path: "confidence-score.tsx"
      purpose: "Display AI confidence score as a visual indicator"

    - name: "ConfirmModal"
      path: "confirm-modal.tsx"
      purpose: "Reusable confirmation dialog with title/message/actions"

    - name: "ContactDetailPanel"
      path: "contact-detail-panel.tsx"
      purpose: "Slide-over panel showing full contact details, emails, and actions"
      note: "Smart component (fetches data internally) — check before duplicating"

    - name: "ContactSourceBadge"
      path: "contact-source-badge.tsx"
      purpose: "Badge indicating contact source (LinkedIn, Hunter, manual)"

    - name: "CountrySelect"
      path: "country-select.tsx"
      purpose: "Searchable country dropdown input"

    - name: "EmailStatusBadge"
      path: "email-status-badge.tsx"
      purpose: "Badge for email delivery/open/click status"

    - name: "EmptyState"
      path: "empty-state.tsx"
      props: ["title", "description", "action"]
      purpose: "Empty state placeholder with optional CTA — use for all empty lists"

    - name: "FakeContactRow"
      path: "fake-contact-row.tsx"
      purpose: "Skeleton row for loading states in contact lists"

    - name: "MarketSnapshot"
      path: "market-snapshot.tsx"
      purpose: "Dashboard card showing key market metrics"

    - name: "NotificationToast"
      path: "notification-toast.tsx"
      purpose: "Ephemeral toast notification"

    - name: "PasswordInput"
      path: "password-input.tsx"
      purpose: "Input with show/hide password toggle"

    - name: "PremiumBadge"
      path: "premium-badge.tsx"
      purpose: "Visual indicator for premium-only features"

    - name: "PremiumGate"
      path: "premium-gate.tsx"
      purpose: "Wrapper that blocks content behind premium paywall"

    - name: "ProactiveTip"
      path: "proactive-tip.tsx"
      purpose: "Contextual coaching tip card"

    - name: "ProgressBarMultiStep"
      path: "progress-bar-multi-step.tsx"
      purpose: "Step-by-step progress bar for multi-phase flows"

    - name: "ScoreBreakdown"
      path: "score-breakdown.tsx"
      purpose: "Detailed breakdown of AI scoring dimensions"

    - name: "SearchProgressModal"
      path: "search-progress-modal.tsx"
      purpose: "Modal showing live sourcing/search progress"
      note: "Being split in sc-599-1 — will likely extract sub-components"

    - name: "SocialAuthButton"
      path: "social-auth-button.tsx"
      purpose: "OAuth provider button (Google, LinkedIn)"

    - name: "TagInput"
      path: "tag-input.tsx"
      purpose: "Multi-value tag input with add/remove"

    - name: "VisaSponsorBadge"
      path: "visa-sponsor-badge.tsx"
      purpose: "Badge indicating company is a known visa sponsor"

    # === Job Offers Pipeline Components ===

    - name: "AccreditationBadge"
      path: "accreditation-badge.tsx"
      purpose: "Badge indicating company has immigration accreditation (NZ/AU)"

    - name: "CollapsibleSidebar"
      path: "collapsible-sidebar.tsx"
      purpose: "Sidebar with collapsible parent menus (Prospection, Offres, Paramètres)"
      note: "Replaces flat sidebar — state persisted in localStorage"

    - name: "CrossContactBadge"
      path: "cross-contact-badge.tsx"
      purpose: "Badge 'You have a contact at this company' shown on job offer cards"

    - name: "ExclusionModal"
      path: "exclusion-modal.tsx"
      purpose: "Modal with structured category + free text reason for excluding an offer"

    - name: "JobOfferCard"
      path: "job-offer-card.tsx"
      purpose: "Card displaying job offer: title, company, AI match, score, badges, links"

    - name: "JobOfferStatusBadge"
      path: "job-offer-status-badge.tsx"
      purpose: "Badge for job offer tracking status (new, interested, applied, interview...)"

    - name: "LanguageSelector"
      path: "language-selector.tsx"
      purpose: "Compact language selector for CV/cover letter generation (deduced from country, overridable)"

    - name: "RecruitmentContactCard"
      path: "recruitment-contact-card.tsx"
      purpose: "Card for recruitment process contacts (distinct from lead contacts)"

    - name: "RepublicationIndicator"
      path: "republication-indicator.tsx"
      purpose: "Visual indicator when an offer has been republished (with dates)"

    - name: "SplitWorkspace"
      path: "split-workspace.tsx"
      purpose: "Split-panel layout for application workspace (CV left, cover letter right)"
```

## 11. Mapping Pipeline UX → Données

| Colonne Kanban | Statuts Contact | Transition |
|----------------|-----------------|------------|
| Trouvé | identified, analyzed | Auto: après sourcing + analyse IA |
| À contacter | to_contact | Auto: IA recommande "contact" / Manuel: override |
| Contacté | contacted | Auto: email envoyé |
| En discussion | replied, interview | Auto: réponse détectée / Manuel: drag & drop |
| Terminé | offer, rejected | Manuel: drag & drop |
