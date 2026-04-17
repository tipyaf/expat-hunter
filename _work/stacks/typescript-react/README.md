# Stack: typescript-react (project override for expat-hunter)

Project-level override of the framework's default typescript-react
template, adapted for our Next.js 14 App Router + Biome + Vitest
+ Playwright stack. This file is the human-readable companion to
`profile.yaml` / `ac-templates.yaml` / `smoke-boot.yaml` in the same
directory.

**Source of truth**: migrated from the v4 `_work/stacks/typescript-nextjs.md`
profile during the v5 migration. The v4 document is preserved in
`_backup_v4/` for historical comparison until the migration is
validated end-to-end.

## Scope

Applies to `apps/frontend/` (Next.js 14 App Router) and any UI
published from `packages/` that consumes React.

## Coding best practices (enforced by G3 code-quality + G7 code-review)

### Project structure

- Next.js App Router under `src/app/`.
- Feature-scoped components (`components/sourcing/`, `components/pipeline/`).
- Shared UI primitives in `components/ui/` (design system).
- Custom hooks in `hooks/`.
- HTTP client + utilities in `lib/`.
- Translations in `i18n/`.

### Conventions

| Entity | Case | Example |
|---|---|---|
| Files | kebab-case | `sourcing-launcher.tsx`, `use-profile.ts` |
| Components | PascalCase | `SourcingLauncher`, `ContactCard` |
| Hooks | camelCase with `use` | `useProfile()`, `useContacts()` |
| Types | PascalCase | `ContactStatus`, `PipelineColumn` |
| CSS | Tailwind utilities only | — (no custom CSS unless strictly necessary) |

Import shared types from `@expat-hunter/shared`. Prefer named exports
for components and hooks; Next.js route files (`page.tsx`, `layout.tsx`,
`loading.tsx`, `error.tsx`, `not-found.tsx`) are the only exceptions —
they require `export default`.

### Server vs Client Components

Default to **Server Components**; mark with `'use client'` only when
the browser is required (forms, drag & drop, modals, realtime,
theme/locale toggle). Keep the client boundary as low as possible in
the tree. Never import server-only code in client components.

### Anti-patterns (caught by `forbidden_patterns` in `profile.yaml`)

- `any` type — use `unknown` + type guard.
- Inline styles — use Tailwind.
- Direct `fetch(...)` — use `lib/api-client.ts` (auth / errors / base URL).
- Prop drilling >2 levels — use React context or a custom hook.
- `useEffect` for data fetching — use the API client hook pattern.
- Hardcoded UI strings — pull from i18n.
- `console.log` in production — use a scoped logger.
- `dangerouslySetInnerHTML` without sanitization — XSS.

## Security rules (G1 + G12)

### Input validation (OWASP A03)

Client-side validation is for UX only; the **API is the source of
truth**. Sanitize any user-generated content before rendering (XSS
prevention). Use DOMPurify if HTML rendering is unavoidable.

### Auth & session (OWASP A01, A07)

- Session in an HttpOnly cookie set by the API (not JS-accessible).
- API client automatically includes credentials.
- Redirect to `/login` on 401.
- **Zero sensitive data in localStorage / sessionStorage.**
- Protected routes enforced in middleware or layout-level auth check.

### XSS prevention

- React auto-escapes JSX output — never `dangerouslySetInnerHTML`
  without a sanitizer + a `// safe:` comment.
- Never interpolate user input into `href`, `src`, or event handlers
  without validation.
- CSP headers set by the API / Nginx (not the frontend).

### Data exposure (OWASP A01)

- Zero tokens, passwords, API keys in frontend code.
- Environment: only `NEXT_PUBLIC_*` exposed (non-sensitive by
  convention).
- Zero sensitive data in URL query parameters.

### Dependencies

- `pnpm audit` monthly.
- Minimise third-party deps; prefer browser APIs + Tailwind.
- Review bundle-size impact before adding any package.

## Performance (G10)

| Metric | Target | Notes |
|---|---|---|
| LCP | ≤ 2500 ms | Largest Contentful Paint |
| FID | ≤ 100 ms | First Input Delay |
| CLS | ≤ 0.1 | Cumulative Layout Shift |
| Bundle size (per route, gzipped) | ≤ 500 KB | measured via `@next/bundle-analyzer` |
| Regression vs baseline | ≤ 5 % | enforced by G10 |

Guidelines: code split per route (Next.js default), `next/image` for
images, `React.lazy()` for heavy components, `useMemo` /
`useCallback` only when profiler-justified, debounce search inputs
(300 ms), load Inter via `next/font/google`.

## Design system (G9.1)

- Tailwind tokens: primary (teal `#0D9488`), secondary (orange
  `#F97316`), success, error, warning, info.
- Dark mode via `class` strategy (`dark:` prefix); toggle writes to
  `<html class="dark">`.
- Default follows system preference; user override persisted in
  localStorage + settings API.
- Spacing scale: 4 px base.
- Border radius: `sm(4)`, `md(8)`, `lg(12)`, `full(9999)`.
- All interactive elements: visible focus ring (2 px primary, 2 px
  offset).

## Accessibility (G9.5, WCAG 2.1 AA)

- Every form field has an explicit `<label>`.
- Kanban drag & drop exposes a keyboard alternative (context menu
  "Move to…").
- Never rely on colour alone — pair with text or icon.
- Skip link, logical tab order, `aria-live` for dynamic updates.
- Contrast: 4.5:1 normal, 3:1 large / UI components.
- Smoke-tested with VoiceOver before shipping.

## Responsive

- Mobile-first.
- Breakpoints: mobile `<768`, tablet `768–1024`, desktop `>1024`.
- Sidebar: hamburger on mobile, collapsible on tablet, fixed on
  desktop.
- Kanban: single column on mobile (swipe), 3 on tablet (scroll), all
  on desktop.

## Testing

- **Unit**: Vitest + React Testing Library (≥80 % on components,
  100 % on hooks/utilities).
- **A11y**: `vitest-axe` on component tests where applicable.
- **E2E**: Playwright, with projects for `smoke`, `a11y`,
  `keyboard-navigation`, `responsive`, `locale-switch`, `error-retry`.
- **Mocking**: MSW (Mock Service Worker) for API responses.

## Maintenance

- When a new coding rule becomes mandatory, amend `profile.yaml`
  (machine-enforced) AND this README (human-readable rationale).
- Anti-patterns should always ship with:
  - A regex in `profile.yaml#forbidden_patterns`.
  - A human explanation in this README.
  - A clear escape hatch (e.g. an `exclude:` entry for test files).
