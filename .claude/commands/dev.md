---
name: dev
description: Start the ExpatHunter dev environment — Docker (Postgres + Redis), API (AdonisJS port 3333), and frontend (Next.js port 3000). Usage: /dev
---

## Instructions

Start all services needed for ExpatHunter local development.

**Project root**: `/Volumes/Samsung_T5/dev/expat-hunter`

### Step 1 — Infrastructure (Docker)
Run `docker compose up -d` from the project root to start:
- **Postgres 16** (container: `expat-hunter-db`, port 5432, user: `expathunter`, db: `expat_hunter_dev`)
- **Redis 7** (container: `expat-hunter-redis`, port 6379)

Wait for containers to be healthy before proceeding.

### Step 2 — Database migrations
Run `pnpm db:migrate` from the project root to apply any pending migrations.

### Step 3 — Backend API (AdonisJS)
Run `pnpm dev:api` in the background from the project root.
The API listens on **http://localhost:3333**.
Wait until you see the API is listening before proceeding.

### Step 4 — Frontend (Next.js)
Run `pnpm dev:frontend` in the background from the project root.
The frontend listens on **http://localhost:3000**.

### Step 5 — Confirm
Verify all services are running:
- `docker compose ps` — Postgres and Redis should be "Up"
- curl `http://localhost:3333/health` or equivalent to confirm API responds
- curl `http://localhost:3000` to confirm frontend responds

Report status to the user.
