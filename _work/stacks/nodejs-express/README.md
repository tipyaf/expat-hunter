# Stack: nodejs-express (project override for expat-hunter — AdonisJS 6)

Project-level override of the framework's default nodejs-express
template, adapted for our AdonisJS 6 backend. Companion to
`profile.yaml` / `ac-templates.yaml` / `smoke-boot.yaml` in the same
directory.

**Source of truth**: migrated from the v4 `_work/stacks/typescript-adonisjs.md`
profile during the v5 migration. The v4 document is preserved in
`_backup_v4/` for comparison until the migration is validated.

## Scope

Applies to `apps/api/` (AdonisJS 6, Lucid ORM, VineJS validators, Japa
test runner, BullMQ for background jobs).

## Coding best practices (enforced by G3 + G7)

### Project structure

AdonisJS 6 conventions — one controller per resource, one model per
entity, business logic in services, validators per route.

```
apps/api/
├── app/
│   ├── controllers/     # thin: validate → service → response
│   ├── models/          # Lucid models, no business logic
│   ├── services/        # business logic, injectable via @inject()
│   ├── validators/      # VineJS schemas per route
│   └── exceptions/      # custom exception handlers
├── start/               # routes, kernel, env
├── config/              # app / db / auth / cors / ...
├── database/migrations/ # Lucid migrations (reversible)
└── tests/               # Japa tests
```

### Conventions

| Entity | Case | Example |
|---|---|---|
| Files | snake_case (AdonisJS convention) | `candidate_profile.ts`, `sourcing_service.ts` |
| Classes | PascalCase | `CandidateProfile`, `SourcingService` |
| Functions / methods | camelCase | `findByUserId()`, `runAnalysis()` |
| Types / interfaces | PascalCase | `ContactStatus`, `ScrapeParams` |
| Database columns | snake_case | `user_id`, `created_at` |
| Routes | kebab-case | `/api/sourcing/run` |
| Env variables | UPPER_SNAKE_CASE | `DATABASE_URL`, `OPENROUTER_API_KEY` |

### Architecture rules

- **Controllers are thin**: `validate → service → response`. No SQL, no
  business logic.
- **Services own business logic**. Inject via `@inject()` / IoC
  container. Never `new SomeService()` in controllers.
- **Validators are required per route** (VineJS). Input is validated
  BEFORE calling the service.
- **Models are serialisation boundaries** only (no business logic).
  Hide sensitive columns via `$hidden`.
- **No circular imports**: services never import controllers, hooks
  never import pages.

### Anti-patterns (caught by `forbidden_patterns`)

- Raw SQL with `.raw(\`... ${userInput} ...\`)` — use Lucid or
  `.raw(sql, bindings[])`.
- `any` type — use `unknown` + type guard.
- `console.*` in production code — use `import logger from '#core/logger'`.
- `process.env.X` outside `env.ts` / `config/` — use `import env from '#start/env'`.
- Synchronous file I/O (`readFileSync`, etc.) — use `fs/promises` or
  `@adonisjs/drive`.
- `require()` — ESM only (AdonisJS 6).
- `bcrypt` rounds <12.

## Security (G1 + G12)

### Input validation (OWASP A03)

Every `/api/*` route has a VineJS validator. The controller validates
before calling the service. Strings are trimmed; HTML is escaped where
needed. File uploads: whitelist extensions (PDF only for CV), 10 MB
cap.

### Auth & authorisation (OWASP A01, A07)

- AdonisJS Auth (session for web, token for API).
- Every `/api/*` requires `auth` middleware **except** `auth/register`,
  `auth/login`, `health`.
- Passwords hashed with bcrypt (AdonisJS Hash, rounds ≥12).
- Login rate limit: 5 / minute / IP.
- **Every query is scoped to `auth.user.id`** — no cross-user leakage
  possible through id tampering.

### Injection (OWASP A03)

- Lucid ORM for all queries (parameterised).
- Never interpolate user input into raw queries.
- `.raw()` — if absolutely needed — uses the bindings-array form.
- Escape user-provided strings in email subject/body before rendering.

### Data exposure (OWASP A01)

- Never return passwords, tokens, internal IDs.
- Use `$hidden` / `$visible` or explicit DTOs.
- Errors in production: generic messages only, no stack trace.
- Logs: never contain passwords, tokens, PII. Email addresses are
  masked (`a***@***.com`).

### Headers & CORS

- CORS: allow only `WEB_URL` env var.
- Shield middleware: `X-Content-Type-Options: nosniff`, `X-Frame-Options:
  DENY`, `X-XSS-Protection: 1; mode=block`, `Strict-Transport-Security:
  max-age=31536000; includeSubDomains`.
- CSRF protection on state-changing session-based routes.

### Dependencies

- `pnpm audit` monthly.
- Pin major versions.
- Prefer AdonisJS built-ins over third-party alternatives.

## Performance (G10)

| Metric | Target |
|---|---|
| API p95 latency (synchronous endpoints) | ≤ 500 ms |
| Pagination | required on every list (default 20, max 100) |
| Background jobs (scraping / AI / email) | always BullMQ, never request cycle |
| DB connection pool | min 2, max 20 |
| Regression vs baseline | ≤ 5 % |

Avoid N+1 with `preload()` / `has()`. Add indexes on every FK column
and frequently-filtered column.

## Observability (G11)

- Logger: AdonisJS Logger (pino, JSON in production).
- Levels: `error` / `warn` / `info` / `debug`.
- Every log includes: request id, user id (when authenticated), event
  name, error code.
- Never log: passwords, tokens, email bodies, raw PII. Mask emails.

## Testing

- **Framework**: Japa (AdonisJS native).
- **Unit tests**: services + AI modules (mock OpenRouter, SMTP,
  Playwright scrapers).
- **Functional tests**: HTTP endpoints via the AdonisJS test client.
- **Database**: real Postgres (docker-compose test), truncate between
  tests.
- **Coverage targets**: ≥80 % services, 100 % validators.
- **Naming**: `{feature}.spec.ts` (e.g. `sourcing.spec.ts`).
- **No mocking the database** — integration tests hit real Postgres.

## Migrations (G13)

- Engine: Lucid.
- Reversible: `node ace migration:rollback` must restore the prior
  schema byte-for-byte on a seeded DB.
- Seed data per story lives in `_work/data-fixtures/{story_id}/`;
  G13 applies it before running the new migration.

## Maintenance

- When a new coding rule becomes mandatory, amend `profile.yaml`
  (machine-enforced) AND this README (human rationale).
- Every anti-pattern ships with: a regex, a rationale, a clear escape
  hatch.
