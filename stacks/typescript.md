# Stack Profile: TypeScript (shared conventions)

> Read by both [typescript-adonisjs.md](./typescript-adonisjs.md) and [typescript-nextjs.md](./typescript-nextjs.md).
> This file consolidates all TypeScript-specific rules that apply to both frontend and backend.

## Type System Rules

### Optional (?:) vs Nullable (| null)

- Use `field?: T` ONLY when the property can be genuinely ABSENT from the object (undefined).
  Examples: optional input parameters, conditional API response fields.
- Use `field: T | null` when the property is ALWAYS PRESENT but its value can be null.
  Examples: nullable DB columns (always serialized, even as null).
- NEVER use `field?: T | null` — this conflates both concepts.

**Rule of thumb:**
- DB column that can be null → `field: T | null`
- API response field absent in some variants → `field?: T`
- Optional function parameter → `param?: T`

### No `any`

- Never use `: any` — use `unknown` if the type is genuinely unknown, then narrow with type guards.
- All functions must have explicit return types.
- Prefer `Record<string, unknown>` over `object` or `{}` for dynamic key-value shapes.

### Named constants (no magic strings/numbers)

- Extract magic strings into named constants or enums.
- Extract magic numbers into named constants with meaningful names.
- Group related constants in a dedicated block at the top of the module or in a constants file.

## Naming Conventions

- **Types / Interfaces / Classes / Enums**: PascalCase — `ContactStatus`, `CandidateProfile`
- **Functions / methods / variables**: camelCase — `findByUserId()`, `contactsFound`
- **Env variables and module-level constants**: UPPER_SNAKE_CASE — `DATABASE_URL`, `BATCH_SIZE`
- **Files (backend)**: snake_case — `candidate_profile.ts`, `sourcing_service.ts`
- **Files (frontend)**: kebab-case — `contact-card.tsx`, `use-profile.ts`

## Import Patterns

- Import shared types from `@expat-hunter/shared` package.
- Use `import type` for type-only imports to avoid runtime overhead.
- Avoid circular imports — services should not import controllers, hooks should not import pages.
- **No duplicate imports**: NEVER import the same module or symbol twice. After any merge or edit, verify there are no duplicate import lines.
- **No unused imports**: Every import MUST be used. Remove any import that is not referenced in the file. Run `tsc --noEmit` to catch unused imports.
- **No broken import paths**: Every import path MUST resolve. Use `@/` aliases for frontend, `#` aliases for backend. Never use relative paths that go up more than 2 levels (`../../..` is a code smell — use an alias).

## Anti-patterns

| Anti-pattern | Correct alternative |
|---|---|
| `field?: T \| null` | `field: T \| null` (nullable DB column) or `field?: T` (optional param) |
| `: any` | `: unknown` + type guard, or a proper named type |
| Magic string `'identified'` | Enum member `ContactStatus.IDENTIFIED` |
| Magic number `50` | Named constant `BATCH_SIZE` |
| Implicit return type | Explicit `: ReturnType` on every function/method |
| Duplicate import `import { X } from 'y'` twice | Single import per module — merge symbols into one line |
| Unused import left after refactor | Delete it — dead imports are noise and can cause build errors |
| Broken relative path `../../../foo` | Use path alias `@/foo` (frontend) or `#foo` (backend) |
