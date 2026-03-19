# Stack Profile: TypeScript + Next.js 14 (App Router)

> Stack profile for ExpatHunter frontend. This is the coding and security contract for all frontend code.

## Coding Best Practices

### Project structure
- Use Next.js App Router (`src/app/` directory)
- Collocate components by feature (`components/sourcing/`, `components/pipeline/`)
- Shared UI primitives in `components/ui/` (design system)
- Custom hooks in `hooks/`
- API client and utilities in `lib/`
- i18n translations in `i18n/`

### Conventions
- **Files**: kebab-case — `sourcing-launcher.tsx`, `use-profile.ts`
- **Components**: PascalCase — `SourcingLauncher`, `ContactCard`
- **Hooks**: camelCase with `use` prefix — `useProfile()`, `useContacts()`
- **Types**: PascalCase — `ContactStatus`, `PipelineColumn`
- **CSS classes**: Tailwind utility classes, no custom CSS unless absolutely necessary
- Import types from `@expat-hunter/shared` package
- One component per file (exceptions for small helper components)
- Export components as named exports, not default

### Server vs Client Components
- **Server Components** (default): pages that mostly display data, settings, static content
- **Client Components** (`'use client'`): forms, kanban drag & drop, modals, real-time updates, theme toggle
- Keep `'use client'` boundary as low as possible in the component tree
- Never import server-only code in client components

### Anti-patterns
- **No `any` type** — use proper types from `@expat-hunter/shared`
- **No inline styles** — use Tailwind classes
- **No direct `fetch` calls** — use the `api-client.ts` wrapper (handles auth, errors, base URL)
- **No prop drilling beyond 2 levels** — use React Context or custom hooks
- **No `useEffect` for data fetching** — use the API client hook pattern
- **No hardcoded strings in UI** — all text through i18n keys
- **No `console.log` in production** — remove or use conditional logging

## Security Rules

### Input validation (OWASP A03)
- Validate all form inputs client-side before submission (UX feedback)
- The API is the source of truth for validation — client-side is for UX only
- Sanitize any user-generated content before rendering (XSS prevention)
- Use `DOMPurify` or equivalent if rendering HTML from user input

### Authentication & Authorization (OWASP A01, A07)
- Store auth token/session in httpOnly cookie (set by the API, not JS-accessible)
- API client automatically includes credentials in requests
- Redirect to `/login` on 401 response
- No sensitive data in localStorage or sessionStorage
- Protected routes via middleware or layout-level auth check

### XSS prevention
- React auto-escapes JSX output by default — never use `dangerouslySetInnerHTML`
- If absolutely needed, sanitize with DOMPurify first
- Never interpolate user input into `href`, `src`, or event handlers without validation
- CSP headers set by the API/Nginx, not the frontend

### Data exposure (OWASP A01)
- Never store tokens, passwords, or API keys in frontend code
- Environment variables: only `NEXT_PUBLIC_*` for non-sensitive values (API URL)
- No sensitive data in URL query parameters

### Dependencies
- Audit with `pnpm audit`
- Minimize third-party dependencies — prefer native browser APIs and Tailwind
- Review bundle size impact before adding new packages

## Performance Rules
- **Code splitting**: Next.js automatic per-route splitting
- **Images**: use `next/image` for optimization
- **Lazy loading**: `React.lazy()` for heavy components (kanban board, rich text editor)
- **Memoization**: `useMemo` / `useCallback` only when measurably needed (profiler first)
- **Pagination**: all lists paginated, infinite scroll or page-based
- **Debounce**: search inputs debounced (300ms)
- **Bundle analysis**: check with `@next/bundle-analyzer` before deploy
- **Fonts**: load Inter via `next/font/google` (automatic optimization)

## Design System Rules

### Tailwind Configuration
- Extend default theme with project tokens (colors, spacing, border radius) from the UX spec
- Colors: primary (teal #0D9488), secondary (orange #F97316), success, error, warning, info
- Dark mode: `class` strategy (`dark:` prefix), toggle via CSS class on `<html>`
- Default to system preference, user override stored in localStorage + settings API

### Component Guidelines
- UI primitives (`components/ui/`): stateless, fully configurable via props
- Feature components: compose UI primitives, manage local state
- Consistent spacing: use Tailwind spacing scale (4px base)
- Consistent border radius: sm(4px), md(8px), lg(12px), full(9999px)
- All interactive elements: visible focus ring (2px primary, offset 2px)

### Accessibility (WCAG 2.1 AA)
- All forms: explicit `<label>` for every input
- Kanban drag & drop: keyboard alternative (context menu "Move to...")
- Color: never rely on color alone — always pair with text/icon
- Focus management: skip link, logical tab order, `aria-live` for dynamic updates
- Contrast: 4.5:1 for normal text, 3:1 for large text and UI elements
- Test with screen reader (VoiceOver) before shipping

### Responsive
- Mobile-first approach
- Breakpoints: mobile (<768px), tablet (768-1024px), desktop (>1024px)
- Sidebar: hidden on mobile (hamburger menu), collapsible on tablet, fixed on desktop
- Kanban: single column on mobile (swipe), 3 columns on tablet (scroll), all on desktop

## Testing Rules
- **Framework**: Vitest + React Testing Library
- **Types**:
  - Component tests: render + user interaction via Testing Library
  - Hook tests: `renderHook` from Testing Library
  - Integration: test pages with mocked API responses
- **Coverage**: 80%+ on components, 100% on hooks and utilities
- **Naming**: `{component}.test.tsx` — `contact-card.test.tsx`
- **Mocking**: mock API responses via MSW (Mock Service Worker) or vitest mocks
- **A11y testing**: use `vitest-axe` for automated accessibility checks in tests

## Auto-generated AC Templates

### For features with UI components
```
AC-A11Y-[FEATURE]-KEYBOARD:
  Given any interactive element in [feature]
  When navigating with keyboard only
  Then all actions are reachable via Tab/Enter/Space with visible focus indicators

AC-A11Y-[FEATURE]-SCREEN-READER:
  Given the UI for [feature]
  When using a screen reader
  Then all content and state changes are announced (aria-labels, aria-live regions)

AC-UI-[FEATURE]-RESPONSIVE:
  Given the UI for [feature]
  When viewed on mobile (<768px)
  Then the layout adapts according to the responsive spec (no horizontal scroll, readable text)

AC-UI-[FEATURE]-DARK-MODE:
  Given the UI for [feature]
  When dark mode is active
  Then all elements use dark mode tokens with proper contrast ratios

AC-UI-[FEATURE]-I18N:
  Given any text displayed in [feature]
  When the locale is changed
  Then all text updates to the selected language (no hardcoded strings)
```

### For features with forms
```
AC-UX-[FEATURE]-VALIDATION:
  Given a form in [feature]
  When the user submits with invalid data
  Then inline error messages appear next to the relevant fields

AC-UX-[FEATURE]-LOADING:
  Given a form submission in [feature]
  When the request is in flight
  Then a loading state is shown and the submit button is disabled
```

### For features with lists/data
```
AC-UX-[FEATURE]-EMPTY:
  Given a list in [feature]
  When there is no data
  Then an empty state is displayed with a clear call to action

AC-UX-[FEATURE]-LOADING:
  Given a data-dependent view in [feature]
  When data is loading
  Then skeleton placeholders are shown (no layout shift)

AC-UX-[FEATURE]-ERROR:
  Given a data fetch in [feature]
  When the API returns an error
  Then a user-friendly error message is displayed with a retry option
```
