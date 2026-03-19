# ExpatHunter — Phase 1 : Plan d'Architecture

## 1. Vue d'ensemble

### Architecture
- **Pattern** : Layered Architecture (MVC côté API, App Router côté frontend)
- **Monorepo** : pnpm workspaces (`apps/api`, `apps/web`, `packages/shared`)
- **Communication** : REST API (JSON) entre frontend et backend
- **Background jobs** : BullMQ via @adonisjs/queue (Redis)
- **Base de données** : PostgreSQL 16
- **Cache / Queue broker** : Redis 7

### Couches applicatives

```
┌─────────────────────────────────────────────────────┐
│                    apps/web (Next.js)                │
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
│   │   │   │   └── settings_controller.ts
│   │   │   ├── models/
│   │   │   │   ├── user.ts
│   │   │   │   ├── candidate_profile.ts
│   │   │   │   ├── company.ts
│   │   │   │   ├── contact.ts
│   │   │   │   ├── email_message.ts
│   │   │   │   ├── sourcing_run.ts
│   │   │   │   ├── sourcing_source.ts
│   │   │   │   └── follow_up_sequence.ts
│   │   │   ├── services/
│   │   │   │   ├── profile_service.ts
│   │   │   │   ├── sourcing_service.ts
│   │   │   │   ├── analysis_service.ts
│   │   │   │   ├── email_generation_service.ts
│   │   │   │   ├── email_sending_service.ts
│   │   │   │   ├── pipeline_service.ts
│   │   │   │   └── cv_parser_service.ts
│   │   │   ├── validators/
│   │   │   │   ├── profile_validator.ts
│   │   │   │   ├── sourcing_validator.ts
│   │   │   │   ├── contact_validator.ts
│   │   │   │   ├── email_validator.ts
│   │   │   │   └── auth_validator.ts
│   │   │   ├── mailers/
│   │   │   │   └── outreach_mailer.ts
│   │   │   ├── jobs/
│   │   │   │   ├── sourcing_job.ts
│   │   │   │   ├── analysis_job.ts
│   │   │   │   ├── email_send_job.ts
│   │   │   │   └── follow_up_job.ts
│   │   │   ├── scrapers/
│   │   │   │   ├── base_scraper.ts          # Classe abstraite
│   │   │   │   ├── seek_scraper.ts
│   │   │   │   ├── matchstiq_scraper.ts
│   │   │   │   ├── zeil_scraper.ts
│   │   │   │   ├── built_scraper.ts
│   │   │   │   ├── linkedin_scraper.ts
│   │   │   │   ├── apify_fallback.ts
│   │   │   │   └── scraper_registry.ts      # Registry des scrapers par pays
│   │   │   ├── ai/
│   │   │   │   ├── openrouter_client.ts     # Client OpenRouter (modèles interchangeables)
│   │   │   │   ├── relevance_analyzer.ts    # Analyse de pertinence contact/profil
│   │   │   │   ├── email_composer.ts        # Génération d'emails personnalisés
│   │   │   │   ├── cv_extractor.ts          # Extraction compétences depuis CV
│   │   │   │   └── prompts/
│   │   │   │       ├── relevance_prompt.ts
│   │   │   │       ├── email_prompt.ts
│   │   │   │       ├── follow_up_prompt.ts
│   │   │   │       └── cv_extraction_prompt.ts
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
│   │   │   │   └── 008_create_follow_up_sequences_table.ts
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
│   │   │       └── pipeline.spec.ts
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
│       │   │   └── pipeline/
│       │   │       ├── pipeline-board.tsx
│       │   │       ├── pipeline-column.tsx
│       │   │       ├── pipeline-list.tsx
│       │   │       └── pipeline-filters.tsx
│       │   ├── hooks/
│       │   │   ├── use-api.ts              # Fetch wrapper avec auth
│       │   │   ├── use-profile.ts
│       │   │   ├── use-contacts.ts
│       │   │   ├── use-pipeline.ts
│       │   │   └── use-theme.ts
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
│       │   │   └── api-responses.ts
│       │   ├── constants/
│       │   │   ├── pipeline-statuses.ts
│       │   │   ├── relevance-levels.ts
│       │   │   └── countries.ts
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

### Budget IA
- Modèle par défaut : `gpt-4o-mini` (via OpenRouter) — ~0.15$/1M tokens input
- Estimation : ~500 tokens/analyse + ~800 tokens/email
- 100 contacts = ~0.02$ analyse + ~0.02$ emails = ~0.04$ par campagne
- Budget 30$/mois = ~750 campagnes/mois (largement suffisant)

---

## 7. Plan d'implémentation

### Épiques et ordre d'implémentation

Les features sont regroupées en épiques, ordonnées par dépendances :

#### Épique 0 : Scaffold & Infrastructure
```
0.1 [Setup] Initialiser le monorepo pnpm + packages/shared
0.2 [Setup] Scaffolder apps/api (AdonisJS 6) avec config de base
0.3 [Setup] Scaffolder apps/web (Next.js 14, App Router, Tailwind)
0.4 [Setup] docker-compose.yml (PostgreSQL + Redis)
0.5 [Setup] Configurer Biome (linting/formatting)
0.6 [Setup] Configurer les scripts root (dev, build, lint, test)
0.7 [Setup] Design system de base (tokens Tailwind, composants ui/)
```
**Dépendances** : aucune
**Livrable** : monorepo fonctionnel, `pnpm dev` lance API + Web

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

#### Épique 8 : Polish & i18n
```
8.1 [i18n] Traductions backend (fr + en)
8.2 [i18n] Traductions frontend (fr + en)
8.3 [UI] Dark mode (CSS variables, toggle settings)
8.4 [UI] Responsive mobile (sidebar hamburger, kanban horizontal scroll)
8.5 [A11y] Accessibilité WCAG 2.1 AA (focus, aria, skip link, clavier)
8.6 [Test] Tests i18n + a11y
```
**Dépendances** : Épique 7
**Livrable** : app bilingue, dark mode, responsive, accessible

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
├── apps/web → PM2 (Next.js standalone)
└── Nginx (reverse proxy, SSL via Let's Encrypt)
```

### CI/CD (GitHub Actions)
```
push → lint (biome) → test (japa + vitest) → build → deploy (SSH + PM2 reload)
```

---

## 10. Mapping Pipeline UX → Données

| Colonne Kanban | Statuts Contact | Transition |
|----------------|-----------------|------------|
| Trouvé | identified, analyzed | Auto: après sourcing + analyse IA |
| À contacter | to_contact | Auto: IA recommande "contact" / Manuel: override |
| Contacté | contacted | Auto: email envoyé |
| En discussion | replied, interview | Auto: réponse détectée / Manuel: drag & drop |
| Terminé | offer, rejected | Manuel: drag & drop |
