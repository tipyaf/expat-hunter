# Stack Profile: TypeScript + AdonisJS 6

> Stack profile for ExpatHunter backend. This is the coding and security contract for all backend code.
> See also: [stacks/typescript.md](./typescript.md) for shared TypeScript conventions (type system rules, naming, anti-patterns).

## Coding Best Practices

### Project structure
- Follow AdonisJS 6 conventions: `app/controllers/`, `app/models/`, `app/services/`, `app/validators/`
- One controller per resource, one model per entity
- Business logic in Services, never in Controllers or Models
- Controllers only handle: validate input → call service → return response
- Use AdonisJS providers for dependency injection

### Conventions
- **Files**: snake_case (AdonisJS convention) — `candidate_profile.ts`, `sourcing_service.ts`
- **Classes**: PascalCase — `CandidateProfile`, `SourcingService`
- **Functions/methods**: camelCase — `findByUserId()`, `runAnalysis()`
- **Types/interfaces**: PascalCase — `ContactStatus`, `ScrapeParams`
- **Database columns**: snake_case — `user_id`, `created_at`
- **Routes**: kebab-case — `/api/sourcing/run`, `/api/contacts/:id/status`
- **Env variables**: UPPER_SNAKE_CASE — `DATABASE_URL`, `OPENROUTER_API_KEY`
- All functions must have explicit return types (see [typescript.md](./typescript.md))
- Use `const` by default, `let` only when reassignment is needed
- Prefer early returns over deep nesting

### Import patterns
- Use AdonisJS IoC container for service resolution
- Use `@inject()` decorator for constructor injection in controllers
- Import types from `@expat-hunter/shared` package

### Anti-patterns
- **No raw SQL** — always use Lucid query builder or model methods
- **No business logic in controllers** — controllers are thin
- **No direct `console.log`** — use AdonisJS Logger
- **No `any` type** — see [typescript.md](./typescript.md) for the full rule
- **No circular imports** — services should not import controllers
- **No synchronous file I/O** — always use async/await
- **No hardcoded config values** — use AdonisJS Env module

## Security Rules

### Input validation (OWASP A03)
- Every route MUST have a VineJS validator
- Validate at the controller level before calling any service
- Use VineJS schemas for all request bodies, query params, and route params
- Sanitize strings: trim, escape HTML where needed
- File uploads: whitelist extensions (PDF only for CV), limit size (10MB)

### Authentication & Authorization (OWASP A01, A07)
- Use AdonisJS Auth module (session-based for web, token for API)
- All `/api/*` routes require auth middleware except `/api/auth/register` and `/api/auth/login`
- Passwords hashed with bcrypt (AdonisJS Hash module, rounds: 12)
- Rate limit login attempts (5/min per IP)
- Every data query MUST scope to `auth.user.id` — no cross-user data access

### Injection prevention (OWASP A03)
- Use Lucid ORM for all queries (parameterized by default)
- Never interpolate user input into raw queries
- If raw queries are absolutely needed, use `.raw()` with bindings array
- Escape all user-provided strings in email subjects/bodies before rendering

### Data exposure (OWASP A01)
- Never return passwords, tokens, or internal IDs to the frontend
- Use DTOs or Lucid serialization (`$hidden`, `$visible`) to control output
- Error responses: generic messages only, no stack traces in production
- Logs: never log passwords, tokens, or PII (mask email addresses)

### Headers & CORS
- CORS: allow only the frontend origin (`WEB_URL` env var)
- Security headers via AdonisJS Shield middleware:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- CSRF protection on state-changing routes (if session-based)

### Dependencies
- Audit dependencies monthly: `pnpm audit`
- Pin major versions in package.json
- Prefer AdonisJS built-in packages over third-party alternatives
- Review changelogs before updating AdonisJS or its packages

### Logging
- Use AdonisJS Logger (pino-based)
- Log levels: error (production incidents), warn (degraded), info (business events), debug (dev only)
- Structured logs (JSON format in production)
- Never log: passwords, tokens, full email bodies, PII
- Log: request IDs, user IDs (for audit), error codes, scraping outcomes

## Performance Rules
- **Database**: use eager loading (`preload()`) to avoid N+1 queries
- **Database**: add indexes on all FK columns and frequently filtered columns
- **Pagination**: all list endpoints must be paginated (default 20, max 100)
- **Background jobs**: scraping, IA, emailing ALWAYS in BullMQ jobs, never in request cycle
- **API response target**: < 500ms for all synchronous endpoints
- **Connection pooling**: Lucid default pool (min: 2, max: 20)
- **Redis**: use for BullMQ queue only (no custom caching layer for MVP)
- **File uploads**: stream to disk, don't buffer in memory

## Testing Rules
- **Framework**: Japa (AdonisJS native test runner)
- **Types**:
  - Unit tests: services, AI modules (mock external APIs)
  - Functional tests: HTTP endpoints via `supertest`-like AdonisJS test client
  - Database: use test database, run migrations before test suite, truncate between tests
- **Coverage**: aim for 80%+ on services, 100% on validators
- **Naming**: `{feature}.spec.ts` — `sourcing.spec.ts`, `auth.spec.ts`
- **Mocking**: mock OpenRouter responses, mock SMTP, mock Playwright scrapers
- **No mocking the database** — tests hit a real PostgreSQL instance (docker-compose test)

## Auto-generated AC Templates

### For features with API endpoints
```
AC-SEC-[FEATURE]-INPUT:
  Given any API endpoint for [feature]
  When receiving user input
  Then all fields are validated through VineJS validators

AC-SEC-[FEATURE]-AUTH:
  Given a protected endpoint for [feature]
  When a request is made without valid authentication
  Then a 401 response is returned with no data leakage

AC-SEC-[FEATURE]-AUTHZ:
  Given a protected endpoint for [feature]
  When a user tries to access another user's data
  Then a 403 response is returned

AC-SEC-[FEATURE]-ERRORS:
  Given any API endpoint for [feature]
  When an unexpected error occurs
  Then a generic error message is returned (no stack trace) and the error is logged via AdonisJS Logger

AC-BP-[FEATURE]-TYPING:
  Given all functions in [feature]
  When reviewing the code
  Then all functions have explicit return types and VineJS validation schemas
```

### For features with database operations
```
AC-BP-[FEATURE]-QUERIES:
  Given database queries for [feature]
  When loading related data
  Then Lucid preload() is used to prevent N+1 queries

AC-SEC-[FEATURE]-INJECTION:
  Given database operations for [feature]
  When building queries
  Then only Lucid ORM methods are used (no raw string interpolation)

AC-SEC-[FEATURE]-SCOPE:
  Given any data query for [feature]
  When fetching or modifying data
  Then the query is scoped to auth.user.id
```

### For features with file uploads
```
AC-SEC-[FEATURE]-UPLOAD:
  Given the CV upload endpoint
  When a file is uploaded
  Then file type is validated (PDF only), size is limited (10MB), and file is stored via AdonisJS Drive
```

### For features with background jobs
```
AC-BP-[FEATURE]-ASYNC:
  Given a long-running operation for [feature]
  When triggered by the user
  Then the operation runs as a BullMQ job and returns immediately with a job/run ID

AC-BP-[FEATURE]-RETRY:
  Given a background job for [feature]
  When the job fails
  Then it retries with exponential backoff (max 3 retries) and logs the failure
```
