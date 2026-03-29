# Web Standards — Foundational Frontend Principles

> Framework-agnostic web best practices applicable to all frontend work in this project.
> Complements [stacks/typescript-nextjs.md](./typescript-nextjs.md) (Next.js/React-specific conventions).

## HTML Semantics

- Use semantic elements over generic `<div>` / `<span>`: `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`, `<aside>`
- Heading hierarchy MUST be sequential: h1 → h2 → h3 — never skip levels
- Every `<img>` MUST have an `alt` attribute (empty string `alt=""` for purely decorative images)
- Every form `<input>` MUST have an associated `<label>` (explicit `for=` or wrapping element)
- Use `<button>` for actions, `<a>` for navigation — never invert these roles

## CSS

- Separation of concerns: HTML = structure, CSS = style — no inline styles
- **Mobile-first**: write base styles for small screens, progressively enhance with `min-width` media queries
- Prefer classes over IDs for styling — IDs have high specificity and cannot be reused
- Avoid `!important` — it signals a specificity problem; fix the root cause instead
- Use modern layout: Flexbox for 1D layouts, CSS Grid for 2D — no float-based hacks
- Relative units over fixed pixels for typography and spacing: `rem`, `em`, `%`

## JavaScript

- `const` by default, `let` when reassignment is needed — never `var`
- Functions have a single responsibility and stay short (see: coding-standards.md 40-line limit)
- Always handle errors for async operations: `try/catch` around `await`, `.catch()` on promises
- Never manipulate the DOM directly when using a component framework — the framework owns the DOM
- ES6+ features: destructuring, template literals, `async/await`, optional chaining (`?.`), nullish coalescing (`??`)

## Performance

- Minimize HTTP requests — bundle assets, avoid unnecessary network round trips
- Lazy-load below-the-fold images and non-critical components
- Use modern image formats (WebP/AVIF) — always set `width`/`height` to prevent layout shift (CLS)
- Defer non-critical JavaScript: `defer` or `async` attributes, or dynamic `import()`
- Leverage browser cache: set appropriate `Cache-Control` headers for static assets
- Measure before optimizing — use Lighthouse/Web Vitals (LCP, INP, CLS) as a baseline before any perf work

## Accessibility (a11y)

> See component-level a11y rules in [stacks/typescript-nextjs.md — Accessibility section](./typescript-nextjs.md).

- Keyboard navigation: every interactive element must be reachable and operable via keyboard
- Color contrast: minimum **4.5:1** for normal text, **3:1** for large text (18px+ or 14px bold) and UI components — WCAG 2.1 AA
- Never rely on color alone to convey meaning — always pair with text or an icon
- Use ARIA attributes when HTML semantics are insufficient — but always prefer semantic HTML first
- Test with a screen reader periodically (VoiceOver on macOS, NVDA on Windows) before shipping

## Security

> See full security rules in [stacks/typescript-nextjs.md — Security Rules section](./typescript-nextjs.md).

- Never trust user input client-side — escape and sanitize before rendering
- No sensitive data (tokens, API keys, passwords) in frontend code, URL params, or `localStorage` without encryption
- React auto-escapes JSX — never use `dangerouslySetInnerHTML` without explicit sanitization (e.g., DOMPurify)
- Configure security headers at the server/CDN level (CSP, HSTS, X-Frame-Options, Permissions-Policy)

## Architecture & Tooling

- Organize by feature, not by file type (see project structure in typescript-nextjs.md)
- ESLint + Prettier configured from day one — code style is a tooling decision, not a review discussion
- TypeScript for any project beyond prototype stage — types prevent entire classes of runtime bugs
- Keep components small and focused (see: Smart vs Dumb component architecture in typescript-nextjs.md)

## Responsive Design

- Mobile-first: design for the smallest screen first, enhance progressively
- Relative units: `rem` for font sizes, `%` / `vw` / `vh` for layout — avoid hard-coded `px` for sizes
- Test on real devices — DevTools simulations miss touch behavior and real-world performance constraints
- Standard breakpoints: mobile (<768px), tablet (768–1024px), desktop (>1024px)
