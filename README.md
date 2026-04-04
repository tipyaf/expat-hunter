# expat-hunter

ExpatHunter is a recruitment intelligence platform that helps identify and contact expatriate candidates for international job opportunities. It scrapes public sources to build candidate profiles, uses AI to assess relevance, and automates personalized email outreach through a pipeline dashboard.

Generated with [ai-spec-driven-generator](https://github.com/tipyaf/ai-spec-driven-generator).

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- Docker (for SonarQube)
- PostgreSQL (for the application database)

## Quick start

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment variables and fill in values
cp .env.example .env

# 3. Run database migrations
pnpm db:migrate

# 4. Start everything (frontend + backend + SonarQube)
pnpm dev:all
```

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start frontend + backend only |
| `pnpm dev:all` | Start frontend + backend + SonarQube |
| `pnpm dev:api` | Start backend only |
| `pnpm dev:frontend` | Start frontend only |
| `pnpm sonar:up` | Start SonarQube (Docker) |
| `pnpm sonar:down` | Stop SonarQube |
| `pnpm test` | Run all tests |
| `pnpm test:e2e` | Run end-to-end tests |
| `pnpm lint` | Run Biome linter |

## Structure

```
expat-hunter/
├── apps/
│   ├── backend/         # AdonisJS API
│   └── frontend/        # Next.js (React)
├── packages/
│   └── shared/          # Shared types and constants
├── .devtools/           # Docker compose for local dev services (SonarQube)
├── framework/           # Git submodule — AI framework (agents, prompts, rules)
├── specs/               # Project specs (YAML, UX, architecture)
├── memory/              # Project memory (decisions, phase status)
├── stacks/              # Stack profiles (coding & security contracts)
├── CLAUDE.md            # AI instructions (generated from framework template)
└── .cursorrules         # Cursor rules (generated from framework template)
```

## Update framework

```bash
git submodule update --remote framework
```
