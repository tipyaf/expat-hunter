# CLAUDE.md — Rules for Claude Code

## Context
This project uses the **ai-spec-driven-generator** framework v3.0.0 (in `framework/`).
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
| **Implementation manifest** | Scope control — developer declares files before coding, reviewer verifies git diff matches |
| **Code review hook** | Automated Pass 2 — `stacks/hooks/code_review.py` runs anti-patterns + external checks |
| **Enforcement scripts** | Quality gates — `scripts/check_*.py` block commits on violations |

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
## Context
[Why this story exists, what problem it solves]

## Scope
**Included:** [explicit list]
**Excluded:** [explicit list]

## Acceptance Criteria
- [ ] AC1 — [Given / When / Then]
- [ ] AC2 — [Given / When / Then]
(copy ACs exactly from the story file YAML — check off as you go)

## References
- Story file: specs/stories/[id].yaml
- Epic: [Shortcut link]
```

### Build checklist — add to EVERY story before starting dev
These 14 tasks MUST be present and checked off via `stories-update-task` as each step completes:
1. `[ ]` Refinement validated by user
2. `[ ]` Story file YAML written (specs/stories/)
3. `[ ]` Code implemented (scope respected)
4. `[ ]` Unit tests written and passing
5. `[ ]` Functional / e2e tests written and passing (web projects: see e2e rules below — skip if not web)
6. `[ ]` Security audit (OWASP — injections, secrets, auth)
7. `[ ]` TypeScript: 0 errors (tsc --noEmit)
8. `[ ]` ACs verified (every verify: command executed and passing)
9. `[ ]` Zero console errors/stacktraces (front: browser console, back: server logs)
10. `[ ]` UI validated visually (dark + light mode, login required)
11. `[ ]` E2e specs updated for any modified frontend behaviour (web projects only — see e2e rules below)
12. `[ ]` UX spec updated if new pages/flows introduced (wireframes, sitemap, design doc)
13. `[ ]` PR created on GitHub and linked to Shortcut story
14. `[ ]` feature-tracker.yaml updated → validated

### E2e test rules (web projects only — `spec.type: web`)

> ⚠️ These rules apply **only when `spec.type` is `web` or `fullstack`**. Skip entirely for CLI, API-only, mobile, library, or embedded projects.

| Rule | Detail |
|------|--------|
| **Write specs** | Every story that adds or changes frontend behaviour MUST include a Playwright spec (`e2e/tests/`) covering the new flow. No spec = not done. |
| **Update existing specs** | If a frontend change breaks an existing e2e spec, the spec MUST be updated in the same PR. Broken e2e tests block the merge — they are never "acceptable background noise". |
| **Merge blocker** | A PR with failing e2e tests MUST NOT be merged. Fix the spec or fix the code — never skip, disable, or mark as flaky without a tracked issue. |
| **Coverage minimum** | Every page/flow listed in the UX spec must have at least one e2e spec. New pages added without a spec require a follow-up story created immediately. |

### Labels — apply at each transition
- **scope:** `scope:pending` → `scope:refined` → `scope:building` → `scope:testing` → `scope:validated`
- **type:** `type:feature` | `type:bug` | `type:chore` | `type:tech-debt`
- **area:** `area:frontend` | `area:backend` | `area:fullstack` | `area:infra` | `area:ai`

> ⚠️ Do NOT use `priority:*` labels — use only the native Shortcut **Priority custom field** (Highest / High / Medium / Low / Lowest).

### Estimation — Fibonacci scale (mandatory)
Every story MUST have a point estimate:
- **XS = 1** — trivial change, < 1h
- **S = 2** — small feature or simple fix, < 2h
- **M = 3** — standard feature, half a day
- **L = 5** — complex feature, 1 day
- **XL = 8** — major feature, 2+ days
- **Epic = 13+** — must be split before starting

### Mandatory closure after merge
After each PR is merged, the agent MUST immediately:
1. Move the ticket to `workflow_state_id: 500000010` (Done)
2. Apply label `scope:validated`
3. Verify no other linked ticket remains in "In Review"

Never end a session with a ticket in "In Review" whose PR is already merged.

### Workflow states (ID → name)
- `500000006` Backlog → `500000007` To Do → `500000008` In Progress → `500000009` In Review → `500000010` Done

### Automatic agent rules
| Event | Required Shortcut action |
|-------|--------------------------|
| Session start | Check Shortcut (stories-search) BEFORE any decision |
| Story created | Add 13 build checklist tasks via `stories-add-task` + estimate + labels scope/type/area |
| Start `/refine` | `workflow_state_id: 500000007` (To Do) + label `scope:refined` |
| Start `/build` | `workflow_state_id: 500000008` (In Progress) + label `scope:building` |
| Start `/validate` | `workflow_state_id: 500000009` (In Review) + label `scope:testing` |
| All ACs pass | `workflow_state_id: 500000010` (Done) + label `scope:validated` |
| Each build step done | `stories-update-task isCompleted: true` (check off immediately) |
| PR created | `stories-add-external-link` with GitHub URL + **always output the PR URL to the user** |
| PR merged | `workflow_state_id: 500000010` + check all linked tickets |

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

## Model tier recommendations (token optimization)

| Agent | Recommended model | Rationale |
|-------|-------------------|-----------|
| Developer | Opus | Must reason across files, understand data flows, write correct business logic |
| Tester | Opus | Must understand data flows end-to-end, catch subtle mismatches |
| Refinement | Opus | Reasons across dependency graphs, splits stories, pre-computes oracle values |
| Reviewer (Pass 1+3) | Opus | Must understand architecture (SOLID violations) and evaluate correctness |
| Reviewer (Pass 2) | Automated | `code_review.py` — no model needed |
| Validator | Sonnet | Systematic execution of verify: commands |
| Security | Sonnet (per-feature) / Opus (full audit) | Full audit requires cross-codebase reasoning |
| Product Owner | Sonnet | Structured spec writing, scoping |
| Architect | Opus | Cross-cutting architecture decisions |
| UX/UI | Sonnet | Wireframes, component specs, design system — structured and well-scoped |
| DevOps | Sonnet | Infrastructure config is well-scoped |
| Orchestrator | Opus | Must interpret agent verdicts, manage escalation logic, coordinate dependencies |

**Rule**: Skills SHOULD pass the recommended model tier when dispatching agents. Projects MAY override in their stack profile.

## Coding standards (agnostic — all languages, all projects)

> **Full reference**: `rules/coding-standards.md` (SOLID, CQRS, DRY, YAGNI, readability gates, API design)

| Rule | Why | Example |
|------|-----|---------|
| **No magic strings** | Hardcoded strings buried in logic are invisible, fragile, and impossible to search for. Extract to named constants or config. | ❌ `if (status === 'accredited')` → ✅ `if (status === VISA_STATUS.ACCREDITED)` |
| **No magic numbers** | Same as strings. Raw numbers have no meaning without context. | ❌ `slice(0, 50)` → ✅ `slice(0, BATCH_SIZE)` |
| **Max 400 lines per file** | Files over 400 lines signal poor separation of concerns. Split into smaller, focused modules. | A 800-line service → split into core service + helpers + constants |
| **Max 40 lines per function** | Long functions signal poor decomposition. Split into focused functions. | A 100-line handler → split into validate + process + respond |
| **Max 3 levels of nesting** | Deep nesting is hard to follow and test. Use early returns, guard clauses. | ❌ `if (a) { if (b) { if (c) { ... }}}` → ✅ early returns |
| **Extract constants** | Group related constants in a dedicated file or block at the top of the module. Never scatter literals across business logic. | `const CACHE_TTL_DAYS = 30` at top, not `30` inline |
| **SOLID principles** | SRP, OCP, LSP, ISP, DIP. See `rules/coding-standards.md` for details. | Router = HTTP, Service = business logic, Repository = persistence |
| **Commits in English** | Commit messages, PR titles, and PR descriptions MUST always be in English. Code comments in English. This ensures consistency across international teams and tools. | ❌ `fix: correction du tri` → ✅ `fix: sorting order` |

## Shared rules files

| File | Content | Who must read it |
|------|---------|-----------------|
| `rules/agent-conduct.md` | Cross-agent behavior rules (single source of truth) | ALL agents, BEFORE their playbook |
| `rules/coding-standards.md` | SOLID, CQRS, DRY, YAGNI, readability gates, API design | Developer, reviewer, validator |
| `rules/test-quality.md` | Oracle computation, coverage audit, test anti-patterns, test intentions | Developer, tester, reviewer, validator |

## Git branching model (MANDATORY)

This project uses a **Git Flow** branching model with two long-lived branches:

| Branch | Role | Merges into |
|--------|------|-------------|
| `main` | **Production** — only releases with changelog, version bump, and tag | — |
| `develop` | **Integration** — all feature work merges here first | `main` (at release time) |

### Feature workflow
```
develop → git pull → new branch (feat/sc-XXX) → work → PR targeting develop → merge → delete branch
```

### Release workflow (user-initiated only)
```
develop → release branch → changelog + version bump + tag → PR targeting main → merge → tag
```

### Rules — NEVER violate these
| Rule | Detail |
|------|--------|
| **All feature branches start from `develop`** | `git checkout -b feat/sc-XXX origin/develop` — NEVER from `main` |
| **All PRs target `develop`** | `gh pr create --base develop` — NEVER `--base main` (except release PRs) |
| **`main` is read-only for agents** | Only release PRs merge into `main`. Agents NEVER push directly to `main`. |
| **No cherry-picks between branches** | If something is missing, it means a release is needed — not a cherry-pick. |
| **Worktrees also branch from `develop`** | `git worktree add .worktrees/feat-sc-XXX -b feat/sc-XXX origin/develop` |

### Pre-flight check (before EVERY `gh pr create`)
Before creating any PR, verify:
1. `git log --oneline origin/develop..HEAD` — your commits are ahead of `develop`
2. `--base develop` is set (NOT `main`)
3. If you accidentally created a branch from `main`, rebase onto `develop` first

## Git worktree rule — parallel work isolation

**When a feature branch is checked out**, all unrelated work (refinement, bug fixes, chores, other features) MUST be done in a **git worktree** to avoid mixing changes across branches.

| Situation | Action |
|-----------|--------|
| On `feat/sc-123` and user asks to refine sc-456 | Create worktree: `git worktree add .worktrees/chore-refine-456 -b chore/refine-sc-456 origin/develop` |
| On `feat/sc-123` and a bug is found unrelated to sc-123 | Create worktree: `git worktree add .worktrees/fix-sc-789 -b fix/sc-789 origin/develop` |
| Worktree work is done | Commit, push, create PR **targeting develop** from the worktree. Then `git worktree remove .worktrees/[name]` |

**Rules**:
- Worktrees go in `.worktrees/` (gitignored)
- Branch from `origin/develop` — NEVER from `main` or the current feature branch
- One worktree per task — don't reuse across unrelated tasks
- Clean up after merge: `git worktree remove .worktrees/[name]`
- Never mix changes from different stories/features on the same branch

## Strict rules
1. **Always read memory** at session start — `memory/expat-hunter.md` + `memory/LESSONS.md` + `specs/feature-tracker.yaml`
2. **Always update memory** after each phase
3. **Always update feature-tracker.yaml** after each feature state change
4. **Always follow phase order** — no shortcuts (skills enforce this via filesystem checks)
5. **Never load all agents** — use skills to load only what's needed
6. **Never over-engineer** — follow the spec, nothing more
7. **Never code before** conception phases are complete (spec + arch + tracker must exist)
8. **Never skip verify: commands** — they are the machine contract
9. **Always read `rules/agent-conduct.md`** before any agent work — it overrides playbook rules
10. **Always run enforcement scripts** before committing if the project has `test_enforcement.json`
11. **Never assert computed values without ORACLE blocks** — see `rules/test-quality.md` Rule 2
12. **Never skip test_intentions** from story files — every intention becomes a test
13. **Never mix branches** — unrelated work goes in a worktree (see worktree rule above)
14. **All PRs target `develop`** — NEVER `main`. Only release PRs merge into `main`. See Git branching model above.

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
- **Shared rules**: `framework/rules/agent-conduct.md`, `framework/rules/coding-standards.md`, `framework/rules/test-quality.md`
- **Enforcement scripts**: `framework/scripts/check_*.py`
- **Phase prompts**: `framework/prompts/phases/`
- **Spec templates**: `framework/specs/templates/`
- **Feature tracker**: `specs/feature-tracker.yaml`
- **Story files**: `specs/stories/[feature-id].yaml`
- **Implementation manifests**: `specs/stories/[feature-id]-manifest.yaml`
- **Stack profiles**: `stacks/`
- **Memory**: `memory/expat-hunter.md`
- **Lessons**: `memory/LESSONS.md`
- **Constitution**: `specs/constitution.md`
- **Application code**: `apps/` and `packages/`
