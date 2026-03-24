# Mémoire du projet : ExpatHunter

> Last updated by **user** — 2026-03-24

## Metadata
- **Projet**: expat-hunter
- **Démarré le**: 2026-03-17
- **Phase courante**: Phase 2 — Construction (features pending refinement)
- **Dernière mise à jour**: 2026-03-24
- **Framework version**: 2.1.0
- **Repo GitHub**: https://github.com/tipyaf/expat-hunter (public)
- **Branches**: main (protégée, défaut), develop (protégée, base dev), feature/* → PR vers develop

## Spec
- **Fichier**: `specs/expat-hunter.yaml`
- **Type**: fullstack TypeScript
- **Stack**: AdonisJS + Lucid, Next.js (React), Tailwind CSS, PostgreSQL, OpenRouter, Playwright (scraping), Shortcut.com (gestion projet)

## Feature Status

| Feature | Priority | Status | Story file | Cycles |
|---------|----------|--------|------------|--------|
| candidate-profile | must-have | pending | — | 0 |
| contact-sourcing | must-have | pending | — | 0 |
| ai-relevance-analysis | must-have | pending | — | 0 |
| personalized-emailing | must-have | pending | — | 0 |
| pipeline-dashboard | must-have | pending | — | 0 |
| signal-detection | should-have | pending | — | 0 |
| multi-country | should-have | pending | — | 0 |
| linkedin-messaging | nice-to-have | pending | — | 0 |
| multi-users | nice-to-have | pending | — | 0 |
| expat-assistance | nice-to-have | pending | — | 0 |
| interview-prep | nice-to-have | pending | — | 0 |
| mobile-app | nice-to-have | pending | — | 0 |
| analytics | nice-to-have | pending | — | 0 |

**Summary**: 13 features total — 0 refined, 0 validated, 0 escalated — next: `/refine` candidate-profile

## Décisions prises

### Architecture
| # | Décision | Alternatives considered | Raison | Phase |
|---|----------|------------------------|--------|-------|
| 1 | Connecteurs pluggables par source/pays | Scraping monolithique | Scalabilité multi-pays | 0 |
| 2 | OpenRouter comme provider IA | OpenAI direct, Ollama | Modèles interchangeables, low-cost | 0 |
| 3 | Scraping maison + Apify fallback | Apify only, Scrapy | Réduire dépendances externes, maîtriser coûts | 0 |
| 4 | Mono-user MVP, architecturé multi-user | Multi-user from start | Livrer vite, scaler ensuite | 0 |
| 5 | Pas de n8n, tout dans le SaaS | n8n orchestration | Centraliser, simplifier | 0 |
| 6 | Fullstack TypeScript (Node.js + Next.js) | Python + FastAPI | Un seul runtime, types partagés, moins de RAM, stack de confort | 1 |
| 10 | Next.js + Tailwind CSS pour le frontend | Remix, SvelteKit | React plus mature web, drag&drop kanban, SEO optionnel, bundle léger | 1 |
| 11 | AdonisJS comme backend framework | NestJS, Hono, Fastify | Batteries-included (auth, mail, queue, i18n, validation), 0 briques à câbler | 1 |
| 12 | Lucid comme ORM (natif AdonisJS) | Prisma, Drizzle | Cohérent avec l'écosystème, migrations, seeds intégrés | 1 |
| 13 | Biome pour linting/formatting | ESLint + Prettier | Ultra rapide, remplace deux outils | 1 |
| 14 | Vitest pour les tests | Jest | Rapide, compatible TypeScript natif | 1 |
| 15 | pnpm comme package manager | npm, yarn, bun | Rapide, économe en disque, workspace natif | 1 |
| 16 | REST API (pas tRPC/GraphQL) | tRPC, GraphQL | Testable indépendamment, réutilisable mobile, pas de couplage | 1 |
| 17 | Scrapers pluggables (Strategy + Registry) | Hardcoded scrapers | Ajouter un pays/source = 1 classe + 1 ligne | 1 |
| 18 | Background jobs BullMQ (@adonisjs/queue) | Cron, Bull | Scraping + IA + email en async, retry automatique | 1 |
| 19 | pnpm workspaces simples (pas Turborepo/Nx) | Turborepo, Nx | Suffisant pour 3 packages, zero config | 1 |
| 20 | Japa (backend) + Vitest (frontend) | Jest everywhere | Natif AdonisJS côté API, rapide côté frontend | 1 |

### Fonctionnel
| # | Décision | Raison | Phase |
|---|----------|--------|-------|
| 1 | Cibler responsables d'équipes opérationnelles, PAS les RH | Les RH publient les offres, on veut le marché caché | 0 |
| 2 | Persona configurable (pas fixé à Yannick) | Pour que l'outil soit utilisable par tous | 0 |
| 3 | LinkedIn messaging en nice-to-have avec étude préalable | Risque de ban, nécessite recherche | 0 |
| 4 | Mail comme canal principal du MVP | Moins risqué, plus simple | 0 |
| 5 | Pas limité au secteur tech pour les utilisateurs | Le candidat définit son secteur, le système s'adapte | 0 |
| 6 | Préparation entretiens (langue du pays, culture locale) en nice-to-have | Valeur ajoutée forte pour expatriés | 0 |

### UX/UI
| # | Décision | Raison | Phase |
|---|----------|--------|-------|
| 1 | Simplicité extrême malgré complexité technique | Requirement utilisateur | 0 |
| 2 | Sidebar fixe à gauche (style SaaS) | Navigation toujours visible | 0.5 |
| 3 | Dashboard = actions en attente (to-do style) | L'utilisateur sait quoi faire immédiatement | 0.5 |
| 4 | Onboarding wizard + upload CV + IA conversationnelle | Guidé, rapide, intelligent | 0.5 |
| 5 | Sourcing assisté par l'IA (suggestions pré-remplies) | Simplicité + pertinence | 0.5 |
| 6 | Validation emails hybride (3 premiers un par un, puis lot) | Contrôle qualité + efficacité | 0.5 |
| 7 | Pipeline 5 colonnes MVP (Trouvé/À contacter/Contacté/En discussion/Terminé) | Lisibilité, pas de surcharge | 0.5 |
| 8 | Badges pertinence : couleur + explication courte (pas de score brut) | Plus compréhensible qu'un chiffre | 0.5 |
| 9 | Tonalité moderne/chaleureuse (teal/orange, style Linear) | Convivial, pro sans être corporate | 0.5 |
| 10 | Dark mode : préférences système par défaut + toggle settings | Confort + contrôle utilisateur | 0.5 |
| 11 | i18n : EN + FR au MVP, langue navigateur par défaut, extensible | Valider l'i18n dès le départ, cible internationale | 0.5 |
| 12 | Design system partagé web + mobile | Cohérence visuelle, un seul jeu de tokens | 0.5 |

## Historique des phases

### Phase 0 — Conception
- **Statut**: ✅ Validée
- **Artefacts**: `specs/expat-hunter.yaml`, `specs/expat-hunter-ux.md`, `specs/expat-hunter-architecture.md`
- **Résumé**: Spec YAML complète (5 must-have, 2 should-have, 6 nice-to-have, 6 entités). Design complet (sitemap, 5 flows, design system, 10 composants, 5 layouts). Architecture layered monorepo pnpm, 8 entités Lucid, 9 épiques, 7 ADRs. Stack profiles AdonisJS + Next.js.
- **Missing v2.1.0 artefacts**: constitution.md, clarifications.md (phases did not exist at v2.0.0)

### Phase 1 — Scaffold
- **Statut**: ✅ Validée
- **Résumé**: Monorepo pnpm créé. AdonisJS 7 scaffoldé (core, lucid, auth, mail, i18n, cors, shield, drive). Next.js 14 (App Router) + Tailwind CSS v4. Package shared (types + constantes). Docker-compose (PostgreSQL 16 + Redis 7). Biome, .env.example.
- **Note**: AdonisJS v7 (pas v6 comme prévu initialement)

### Phase 2 — Construction
- **Statut**: 🔄 En cours — all features pending refinement
- **Features**: 5 must-have (0/5 refined), 2 should-have, 6 nice-to-have
- **Next**: `/refine` candidate-profile

### Phase 3 — Review
- **Statut**: ⬜ Non démarré

### Phase 4 — Deploy
- **Statut**: ⬜ Non démarré

### Phase 5 — Release
- **Statut**: ⬜ Non démarré

## Problèmes rencontrés
| # | Problème | Solution | Phase |
|---|----------|----------|-------|
| - | - | - | - |

## Feedback utilisateur (cumulatif)
| Phase | Feedback | Action prise |
|-------|----------|-------------|
| 0 | Pas limiter au tech, cibler responsables opérationnels | Mis à jour spec |
| 0 | Persona configurable, pas fixe | Mis à jour spec |
| 0 | LinkedIn messaging risqué, étude préalable nécessaire | Mis en nice-to-have avec condition |
| 0 | Scraping anti-détection important | Ajouté dans contraintes spec |
| 0 | Arrêter n8n, tout centraliser | Architecture full SaaS |
| 0 | built.com pas BuiltWith | Corrigé |
| 0 | Vision long terme : aide expatriation complète | Documenté en nice-to-have |
| 0 | OpenRouter pour IA (modèles interchangeables) | Mis à jour stack |
| 0 | VPS Hostinger KVM2 existant | Mis à jour déploiement |
| 1 | Python proposé en premier alors que TS suffisait | Framework amélioré : évaluer techniquement d'abord, confort en tiebreaker |
| 1 | AdonisJS pas proposé initialement (biais popularité) | Framework amélioré : anti-bias rules + evaluation checklist ajoutés |

## Fichiers clés
| Fichier | Rôle |
|---------|------|
| `specs/expat-hunter.yaml` | Spec complète du projet |
| `specs/expat-hunter-ux.md` | Design UX/UI complet |
| `specs/expat-hunter-architecture.md` | Plan d'architecture complet |
| `specs/feature-tracker.yaml` | État de chaque feature (v2.1.0) |
| `specs/stories/` | Story files — build contracts (v2.1.0) |
| `stacks/typescript-adonisjs.md` | Stack profile backend AdonisJS |
| `stacks/typescript-nextjs.md` | Stack profile frontend Next.js |
| `memory/expat-hunter.md` | Ce fichier — état du projet |
| `memory/LESSONS.md` | Erreurs passées, lues par tous les agents |
| `memory/SYNC.md` | Version du framework |

## Notes libres
- Budget strict : 30$/mois max
- Le VPS Hostinger KVM2 peut être limité pour Ollama — OpenRouter d'abord
- L'utilisateur a un pipeline existant LinkedIn + Hunter.io + n8n qui ne donne pas de résultats probants (mauvais ciblage + messages génériques)
- Sources par pays (configurables). Exemple NZ : Seek, Matchstiq, Zeil, built.com. Global : LinkedIn, Hunter.io
- L'outil n'est PAS limité à la NZ — chaque utilisateur choisit son pays cible, les sources s'adaptent
- **Framework v2.1.0**: Enforcement layer actif — feature-tracker + story files + verify: commands
- **Migration note**: constitution.md et clarifications.md n'existaient pas en v2.0.0 — à créer lors du prochain `/refine` si nécessaire
