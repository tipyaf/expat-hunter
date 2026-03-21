# Changelog

## v0.1.0 (2026-03-21)

Premiere release d'ExpatHunter. Application fonctionnelle avec le flow complet : inscription, profil, sourcing, analyse IA, emailing, pipeline kanban.

### Features

- **Auth & Users** — Inscription, connexion, gestion de session JWT, middleware admin
- **Profil candidat** — Wizard 3 etapes, upload CV avec parsing IA (extraction competences/experience), pays et secteurs cibles
- **i18n** — Infrastructure next-intl avec support francais/anglais, tous les strings traduits
- **Sourcing** — Scraping de contacts par pays/secteur via Apify (Seek), stockage contacts et entreprises en base
- **Analyse IA** — Scoring de pertinence des contacts par IA (very_relevant, relevant, to_review, not_relevant), recommandation de contact
- **Emailing** — Generation d'emails personnalises par IA, interface de validation (approuver/rejeter), envoi individuel
- **Pipeline Kanban** — Board avec colonnes (Found, To Contact, Contacted, In Discussion, Done), drag & drop, badges de statut
- **Dashboard** — Actions en attente, stats rapides, liens directs vers les pages
- **Settings** — Choix de langue, dark mode (auto/clair/sombre), parametres IA (admin)
- **Admin backoffice** — Gestion utilisateurs, parametres IA par feature (modeles, providers)

### Fixes

- Correction du layout sticky header avec contenu scrollable
- Pipeline cards invisibles en dark mode (bg-white remplace par CSS variable)
- Selects illisibles en dark mode (couleur de texte forcee)
- Scroll impossible en viewport mobile (h-screen remplace par h-dvh + overflow)

### Improvements

- **Dark mode complet** — Theme provider avec lazy initializer, toggle dans settings, respect prefers-color-scheme
- **Sidebar responsive** — Hamburger menu mobile, drawer avec backdrop, fermeture auto au clic
- **Accessibilite** — Skip-to-content link, aria-current sur nav active, aria-pressed sur toggles, focus-visible rings, aria-label sur boutons icones
- **Test DB isolation** — Base de donnees de test separee (expat_hunter_test)

### Infrastructure

- Monorepo avec AdonisJS 7 (backend) + Next.js 14 App Router (frontend) + shared types
- PostgreSQL via Lucid ORM, migrations incrementales
- Tests E2E Playwright (auth, profil, sourcing, pipeline, polish)
- Tests integration backend (auth, contacts, emails, pipeline)

### Documentation

- Specs Redesign V2 ajoutees (product, design, implementation plan) pour la suite du developpement
