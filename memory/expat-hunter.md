# Mémoire du projet : ExpatHunter

## Metadata
- **Projet**: expat-hunter
- **Démarré le**: 2026-03-17
- **Phase courante**: Phase 3 — Implement (Épique 1 Auth terminée)
- **Dernière mise à jour**: 2026-03-20
- **Prochaine épique**: Épique 2 — Profil candidat
- **Repo GitHub**: https://github.com/tipyaf/expat-hunter (public)
- **Branches**: main (protégée, défaut), develop (protégée, base dev), feature/* → PR vers develop

## Spec
- **Fichier**: `specs/expat-hunter.yaml`
- **Type**: fullstack TypeScript
- **Stack**: AdonisJS + Lucid, Next.js (React), Tailwind CSS, PostgreSQL, OpenRouter, Playwright (scraping), Shortcut.com (gestion projet)

## Décisions prises

### Architecture
| # | Décision | Raison | Phase |
|---|----------|--------|-------|
| 1 | Connecteurs pluggables par source/pays | Scalabilité multi-pays | 0 |
| 2 | OpenRouter comme provider IA | Modèles interchangeables, low-cost | 0 |
| 3 | Scraping maison + Apify fallback | Réduire dépendances externes, maîtriser coûts | 0 |
| 4 | Mono-user MVP, architecturé multi-user | Livrer vite, scaler ensuite | 0 |
| 5 | Pas de n8n, tout dans le SaaS | Centraliser, simplifier | 0 |
| 6 | Fullstack TypeScript (Node.js + Next.js) — Python écarté | Un seul runtime, types partagés, moins de RAM, stack de confort | 1 |
| 10 | Next.js + Tailwind CSS pour le frontend | React plus mature web, drag&drop kanban, SEO optionnel, bundle léger | 1 |
| 11 | AdonisJS comme backend framework | Batteries-included (auth, mail, queue, i18n, validation), 0 briques à câbler | 1 |
| 12 | Lucid comme ORM (natif AdonisJS) | Cohérent avec l'écosystème, migrations, seeds intégrés | 1 |
| 13 | Biome pour linting/formatting | Remplace ESLint + Prettier, ultra rapide | 1 |
| 14 | Vitest pour les tests | Rapide, compatible TypeScript natif | 1 |
| 15 | pnpm comme package manager | Rapide, économe en disque, workspace natif | 1 |
| 7 | Shortcut.com comme outil de gestion de projet (via MCP) | Suivi des tickets, refinement | 0 |
| 8 | Agent refinement avant chaque feature | Détailler/découper avant d'implémenter | 0 |
| 9 | Shortcut.com bidirectionnel (créer, refiner, déplacer tickets) | Vision temps réel sur l'avancement | 0 |
| 16 | REST API (pas tRPC/GraphQL) | Testable indépendamment, réutilisable mobile, pas de couplage | 1 |
| 17 | Scrapers pluggables (Strategy + Registry) | Ajouter un pays/source = 1 classe + 1 ligne | 1 |
| 18 | Background jobs BullMQ (@adonisjs/queue) | Scraping + IA + email en async, retry automatique | 1 |
| 19 | pnpm workspaces simples (pas Turborepo/Nx) | Suffisant pour 3 packages, zero config | 1 |
| 20 | Japa (backend) + Vitest (frontend) | Natif AdonisJS côté API, rapide côté frontend | 1 |

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

### Phase 0 — Cadrage (PO)
- **Statut**: [x] Validée
- **Résumé**: Spec YAML complète générée avec 5 features must-have, 2 should-have, 6 nice-to-have. Modèle de données avec 6 entités.

### Phase 0.5 — Design (UX/UI)
- **Statut**: [x] Validée
- **Résumé**: Design complet produit (sitemap, 5 user flows, design system, 10 composants, 5 layouts de pages). Décisions : sidebar fixe, dashboard actions en attente, wizard + CV + IA conversationnelle, sourcing assisté IA, validation emails hybride, pipeline 5 colonnes, badges pertinence couleur + explication, tonalité moderne/chaleureuse (teal/orange), dark mode préférences système + toggle.
- **Fichier**: `specs/expat-hunter-ux.md`

### Phase 1 — Plan (Architect)
- **Statut**: [x] Validée
- **Résumé**: Architecture complète produite. Layered architecture, monorepo pnpm (apps/api + apps/frontend + packages/shared). 8 entités Lucid détaillées (User, CandidateProfile, Company, Contact, EmailMessage, SourcingRun, SourcingSource, FollowUpSequence). 9 épiques d'implémentation ordonnées. 7 ADRs (TypeScript fullstack, AdonisJS, Next.js App Router, REST API, scrapers pluggables, BullMQ jobs, pnpm workspaces). Stack profiles créés pour AdonisJS et Next.js.
- **Fichier**: `specs/expat-hunter-architecture.md`
- **Stack profiles**: `stacks/typescript-adonisjs.md`, `stacks/typescript-nextjs.md`

### Phase 2 — Scaffold (Developer)
- **Statut**: [x] Validée
- **Résumé**: Monorepo pnpm créé via init-project.sh (framework en git submodule). AdonisJS 7 (core, lucid, auth access_tokens, mail, i18n, cors, shield, drive) scaffoldé avec User model UUID, env validation, configs complètes. Next.js 14 (App Router) + Tailwind CSS v4 avec design system tokens, sidebar, login, dashboard placeholder. Package shared avec tous les types (User, CandidateProfile, Company, Contact, EmailMessage, SourcingRun) + constantes (pipeline, relevance, countries). Docker-compose (PostgreSQL 16 + Redis 7), Biome, .env.example.
- **Repo**: `/Volumes/Samsung_T5/dev/expat-hunter/`
- **Note**: AdonisJS v7 (pas v6 comme prévu initialement — les packages nécessitaient v7)

### Phase 3 — Implement (Developer)
- **Statut**: [ ] Non démarré

### Phase 4 — Test (Tester)
- **Statut**: [ ] Non démarré

### Phase 5 — Review (Reviewer)
- **Statut**: [ ] Non démarré

### Phase 6 — Deploy (DevOps)
- **Statut**: [ ] Non démarré

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
| `specs/expat-hunter-ux.md` | Design UX/UI complet (Phase 0.5) |
| `specs/expat-hunter-architecture.md` | Plan d'architecture complet (Phase 1) |
| `stacks/typescript-adonisjs.md` | Stack profile backend AdonisJS |
| `stacks/typescript-nextjs.md` | Stack profile frontend Next.js |
| `memory/expat-hunter.md` | Ce fichier — état du projet |

## Notes libres
- Budget strict : 30$/mois max
- Le VPS Hostinger KVM2 peut être limité pour Ollama — OpenRouter d'abord
- L'utilisateur a un pipeline existant LinkedIn + Hunter.io + n8n qui ne donne pas de résultats probants (mauvais ciblage + messages génériques)
- Sources par pays (configurables). Exemple NZ : Seek, Matchstiq, Zeil, built.com. Global : LinkedIn, Hunter.io
- L'outil n'est PAS limité à la NZ — chaque utilisateur choisit son pays cible, les sources s'adaptent
- **Framework en anglais** pour les prochains projets (garder français pour ExpatHunter)
- **Réutilisation du framework** : script init-project.sh recommandé, puis migration vers git submodule quand le repo est prêt
