# CLAUDE.md — Rules for Claude Code

## Context
This project uses the **ai-spec-driven-generator** framework v2.1.0 (in `framework/`).
You must follow a structured, phase-based process with human validation, persistent memory, and machine-verifiable acceptance criteria.

## Fundamental Principles

These three principles apply to EVERY action, EVERY agent, EVERY phase:

| Principle | Rule |
|-----------|------|
| **Agnostic** | Adapt to the project type. Never assume web. Check `spec.type` before applying platform-specific rules (WCAG, Playwright, CSS, responsive). |
| **Autonomous** | Humans decide (product, architecture, infra), machines verify (tests, review, security). Auto-proceed when automated gates pass. Escalate to human after 3 failures only. |
| **Accompaniment** | Guide and challenge the user. Every human-validated phase ends with clear options, trade-offs, and next steps. Never leave the user without guidance. |

## Skills (primary entry points)

Use skills to dispatch to the right agent(s). Each skill loads ONLY the agents it needs — never load all agents at once.

| Skill | When to use | Agents loaded |
|-------|-------------|---------------|
| `/spec` | Start a new project or define a feature | product-owner, ux-ui, architect |
| `/refine` | Break a feature into actionable stories | refinement, product-owner |
| `/build` | Implement a refined story | developer, validator |
| `/validate` | Verify implementation against story file | validator |
| `/review` | Review all validated features before PR | reviewer, security, tester |

**Default workflow**: `/spec` → `/refine` (per feature) → `/build` (per feature) → `/validate` (per feature) → `/review` (all features)

## Loading agents (IMPORTANT)

When you need an agent, read ONLY its core file:
- `framework/agents/[name].md` — core instructions (always read this)
- `framework/agents/[name].ref.md` — templates and examples (read only when you need a specific template)

**NEVER read all agent files at once.** Load the minimum needed for the current task.

## On session start

### New project (no memory file exists)
When a user describes a project idea or asks to build something:
1. Tell the user: "We'll define your project together before writing any code. I'll guide you through: Constitution → Scoping → Clarify → Design → Architecture → then we build."
2. Launch `/spec` — this guides through all conception phases with human validation at each step
3. After `/spec` is complete: launch `/refine` for the first feature
4. Only then: `/build` for each refined story

**NEVER jump to code.** Always start with `/spec`.

### Existing project (memory file exists)
1. Read `memory/expat-hunter.md` to restore context
2. Read `memory/LESSONS.md` for known pitfalls
3. Read `specs/feature-tracker.yaml` to know feature states
4. **Check Shortcut** — query pending/in-progress stories before deciding what to do next (MANDATORY)
5. Summarize the project state to the user: what's done, what's next, which features are pending/refined/validated
6. Resume where it left off — use the appropriate skill

## Phase workflow

```
═══════════════════════════════════════════════════════════
PHASE 0 — CONCEPTION (/spec) — Human validation at each step
═══════════════════════════════════════════════════════════
  0.0 Constitution    → specs/constitution.md
  0.1 Scoping (PO)    → specs/expat-hunter.yaml
  0.2 Clarify         → specs/expat-hunter-clarifications.md
  0.3 Design (UX/UI)  → specs/expat-hunter-ux.md
  0.5 Ordering        → features ordered in arch doc
  1.0 Architecture    → specs/expat-hunter-architecture.md
  → Initialize        → specs/feature-tracker.yaml

═══════════════════════════════════════════════════════════
PHASE 1 — SCAFFOLD (/build first run) — Auto
═══════════════════════════════════════════════════════════
  Init project, deps, structure, hooks → project compiles/starts

═══════════════════════════════════════════════════════════
PHASE 2 — CONSTRUCTION (per feature loop)
═══════════════════════════════════════════════════════════
  State tracked in: specs/feature-tracker.yaml
  Build contract in: specs/stories/[feature-id].yaml

  For each feature [pending → refined → building → testing → validated]:

  /refine  → Refinement  → ✅ Human   → story file written
  /build   → Developer   → 🤖 Auto    → code + tests
  /validate → Validator   → 🤖 Auto    → verify: commands executed
    Gate 1: Security (OWASP + stack forbidden patterns)
    Gate 2: Tests (TU + e2e)
    Gate 3: UI (WCAG + wireframe conformity)
    Gate 4: AC Validation (every verify: command)
    Gate 5: Review (code quality + scope check)
  → PASS: status → validated
  → FAIL: cycles++ → fix → re-validate (max 3, then escalate)

═══════════════════════════════════════════════════════════
PHASE 3 — REVIEW (/review) — Auto
═══════════════════════════════════════════════════════════
  Prerequisites: ALL features status=validated in tracker
  Full code review + security audit + test quality check

═══════════════════════════════════════════════════════════
PHASE 4 — DEPLOY — ✅ Human
═══════════════════════════════════════════════════════════

═══════════════════════════════════════════════════════════
PHASE 5 — RELEASE — ✅ Human
═══════════════════════════════════════════════════════════
```

## Validation model

| Phase | Skill | Agent | Validation | Gate (file must exist) |
|-------|-------|-------|------------|------------------------|
| 0: Constitution | /spec | — | Human | `specs/constitution.md` |
| 0.1: Scoping | /spec | PO | Human | `specs/expat-hunter.yaml` |
| 0.2: Clarify | /spec | PO | Human | `specs/expat-hunter-clarifications.md` |
| 0.3: Design | /spec | UX/UI | Human | `specs/expat-hunter-ux.md` |
| 0.5: Ordering | /spec | PO+Arch | Human | Features ordered in arch doc |
| 1: Plan | /spec | Architect | Human | `specs/expat-hunter-architecture.md` |
| 2: Scaffold | /build | Developer | Auto | Project compiles/starts |
| 2.5: Refine | /refine | Refinement | Human | `specs/stories/[feature].yaml` |
| 3: Implement | /build | Developer | Auto | Code + tests written |
| 3.5: Validate | /validate | Validator | Auto | ALL `verify:` commands PASS |
| 4: Review | /review | Reviewer+Security+Tester | Auto | Quality + security PASS |
| 5: Deploy | — | DevOps | Human | Infrastructure decision |
| 6: Release | — | — | Human | Go/no-go decision |

## Enforcement mechanisms

| Mechanism | What it enforces |
|-----------|-----------------|
| **Filesystem existence** | Phase gates — a phase is "done" when its artefact file exists on disk |
| **feature-tracker.yaml** | Per-feature state management (pending → refined → building → testing → validated) |
| **Story files** | Build contracts with `verify:` commands — persists between sessions |
| **verify: commands** | Machine-verifiable ACs — the validator executes these literally |
| **Cycle counter** | Max 3 validation cycles per feature before human escalation |

## Phase guards

Before executing a skill, verify its prerequisites exist **on the filesystem**:

| Skill | Prerequisites (files must exist) | If missing |
|-------|----------------------------------|------------|
| `/spec` | None — starting point | — |
| `/refine` | `specs/expat-hunter.yaml` + `specs/expat-hunter-architecture.md` + `specs/feature-tracker.yaml` | → "Let's define the project first" → `/spec` |
| `/build` | `specs/stories/[feature-id].yaml` + feature status=`refined` in tracker | → "This story needs refinement" → `/refine` |
| `/validate` | Feature status=`building` or `testing` in tracker | → "Nothing to validate yet" → `/build` |
| `/review` | ALL features status=`validated` in tracker | → "Some features still need validation" → list them |

## Shortcut workflow rules (MANDATORY)

### Story template — every story MUST have this structure
```
## Contexte
[Pourquoi cette story existe, quel problème elle résout]

## Scope
[Ce qui est inclus / exclu explicitement]

## Critères d'acceptation
[Liste reprise des ACs du story file YAML, cochée au fur et à mesure]

## Références
- Story file: specs/stories/[id].yaml
- Epic: [lien Shortcut]
```

### Build checklist — à ajouter sur TOUTE story avant de démarrer le dev
Ces 11 tâches DOIVENT être présentes et cochées au fur et à mesure via `stories-update-task`:
1. `[ ]` Refinement validé par l'utilisateur
2. `[ ]` Story file YAML écrit (specs/stories/)
3. `[ ]` Code implémenté (scope respecté)
4. `[ ]` Tests unitaires écrits et passants
5. `[ ]` Tests fonctionnels / e2e écrits et passants
6. `[ ]` Audit sécurité (OWASP — injections, secrets, auth)
7. `[ ]` TypeScript : 0 erreurs (tsc --noEmit)
8. `[ ]` ACs vérifiés (chaque verify: command exécuté et passant)
9. `[ ]` UI validée visuellement (dark + light mode, login requis)
10. `[ ]` PR créée sur GitHub et liée à la story Shortcut
11. `[ ]` feature-tracker.yaml mis à jour → validated

### Labels — à appliquer à chaque transition
- **scope:** `scope:pending` → `scope:refined` → `scope:building` → `scope:testing` → `scope:validated`
- **type:** `type:feature` | `type:bug` | `type:chore` | `type:tech-debt`
- **area:** `area:frontend` | `area:backend` | `area:fullstack` | `area:infra` | `area:ai`
- **priority:** `priority:critical` | `priority:high` | `priority:medium` | `priority:low`

### Workflow states (ID → nom)
- `500000006` Backlog → `500000007` To Do → `500000008` In Progress → `500000009` In Review → `500000010` Done

### Règles automatiques agent
| Événement | Action Shortcut obligatoire |
|-----------|----------------------------|
| Début `/build` | `workflow_state_id: 500000008` + label `scope:building` |
| Début `/validate` | `workflow_state_id: 500000009` + label `scope:testing` |
| Tous ACs passent | `workflow_state_id: 500000010` + label `scope:validated` |
| Chaque étape build complétée | `stories-update-task isCompleted: true` |
| PR créée | `stories-add-external-link` avec l'URL GitHub |

## Acceptance criteria format (unified)

**ONE format everywhere** — in spec, story files, and validation reports:

```yaml
acceptance_criteria:
  - id: "AC-FUNC-AUTH-01"              # AC-[TYPE]-[FEATURE]-[NUMBER]
    type: "FUNC"                       # FUNC | SEC | BP
    description: "Given a valid email and password / When user submits login / Then session is created"
    verify: "curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/auth/login -d '{\"email\":\"test@test.com\",\"password\":\"pass123\"}'"
    tier: 2                            # 1 (grep/bash) | 2 (curl/playwright) | 3 (runtime-only)
```

**Rules**:
- `verify: static` is **BANNED** — rewrite until you have a shell command
- AC-SEC-* MUST be Tier 1 (check code artefacts, not runtime behavior)
- No AC without `verify:` — unverifiable ACs are wishes, not criteria

## Coding standards (agnostic — all languages, all projects)

| Rule | Why | Example |
|------|-----|---------|
| **No magic strings** | Hardcoded strings buried in logic are invisible, fragile, and impossible to search for. Extract to named constants or config. | ❌ `if (status === 'accredited')` → ✅ `if (status === VISA_STATUS.ACCREDITED)` |
| **No magic numbers** | Same as strings. Raw numbers have no meaning without context. | ❌ `slice(0, 50)` → ✅ `slice(0, BATCH_SIZE)` |
| **Max 400 lines per file** | Files over 400 lines signal poor separation of concerns. Split into smaller, focused modules. | A 800-line service → split into core service + helpers + constants |
| **Extract constants** | Group related constants in a dedicated file or block at the top of the module. Never scatter literals across business logic. | `const CACHE_TTL_DAYS = 30` at top, not `30` inline |
| **Commits in English** | Commit messages, PR titles, and PR descriptions MUST always be in English. Code comments in English. This ensures consistency across international teams and tools. | ❌ `fix: correction du tri` → ✅ `fix: sorting order` |

## Strict rules
1. **Always read memory** at session start — `memory/expat-hunter.md` + `memory/LESSONS.md` + `specs/feature-tracker.yaml`
2. **Always update memory** after each phase
3. **Always update feature-tracker.yaml** after each feature state change
4. **Always follow phase order** — no shortcuts (skills enforce this via filesystem checks)
5. **Never load all agents** — use skills to load only what's needed
6. **Never over-engineer** — follow the spec, nothing more
7. **Never code before** conception phases are complete (spec + arch + tracker must exist)
8. **Never skip verify: commands** — they are the machine contract

## Agent role guards

| Agent | CAN do | CANNOT do |
|-------|--------|-----------|
| Product Owner | Write specs, challenge scope | Write code, make technical decisions |
| UX/UI Designer | Design UI, specify flows | Write code, choose frameworks |
| Architect | Plan architecture, create manifest | Write implementation code |
| Refinement | Break features into stories, write story files | Write code, make architecture decisions |
| Developer | Write code, create files | Self-validate, skip story scope |
| Validator | Run verify: commands, take screenshots | Modify source code, fix bugs |
| Tester | Write tests, run suites | Modify feature code |
| Reviewer | Audit quality, flag issues | Modify files directly |
| Security | Audit security, flag vulns | Modify files directly |
| DevOps | Configure CI/CD, deployment | Modify feature code |

## File locations
- **Framework agents**: `framework/agents/*.md` (core) + `framework/agents/*.ref.md` (templates)
- **Phase prompts**: `framework/prompts/phases/`
- **Spec templates**: `framework/specs/templates/`
- **Feature tracker**: `specs/feature-tracker.yaml`
- **Story files**: `specs/stories/[feature-id].yaml`
- **Stack profiles**: `stacks/`
- **Memory**: `memory/expat-hunter.md`
- **Lessons**: `memory/LESSONS.md`
- **Constitution**: `specs/constitution.md`
- **Application code**: `apps/` and `packages/`
