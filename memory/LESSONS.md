# Lessons Learned

Recurring failures and lessons learned across sessions. Every agent MUST read this file before starting work.

## How to use
- **Read**: Before starting any task, check if a relevant lesson exists
- **Write**: When the same mistake happens twice, log it here
- **Format**: Each lesson has a category, description, and the rule to follow

## Lessons

### [UI] Hardcoded colors instead of design system
**Problem**: PR #27 used `text-blue-800` instead of CSS variables. The card was unreadable.
**Root cause**: Developer didn't check existing design system reference (market-snapshot.tsx).
**Rule**: Always grep for the design system reference component before writing any UI. Use CSS variables from the design system, never Tailwind color classes directly.

### [Validation] Declaring done without runtime verification
**Problem**: PR #27 and #28 were declared "done" with "0 TS errors" but features didn't work visually or at runtime.
**Root cause**: Developer validated TypeScript compilation but never started the app or took screenshots.
**Rule**: Never declare done without: 1) starting the dev server, 2) visiting the modified page, 3) taking a screenshot, 4) curling modified endpoints.

### [Validation] Always validate both dark mode AND light mode
**Problem**: sc-27 was declared validated with only a dark mode screenshot. Light mode was not checked.
**Root cause**: Validator took one screenshot and assumed the other mode was fine.
**Rule**: Every UI change MUST be validated visually in BOTH dark and light mode. Two screenshots minimum. Never skip one mode.

### [UI] Tailwind prose overrides design system colors
**Problem**: sc-28 chat markdown used `prose` class which overrides text color with its own value, ignoring the parent's `text-[var(--color-text-main)]`. Text was unreadable in light mode.
**Root cause**: `prose` applies its own color scheme that takes precedence over inherited CSS variables.
**Rule**: When using `prose` for markdown rendering, ALWAYS force design system colors via `text-[var(--color-text-main)]`, `prose-strong:text-[var(--color-text-main)]`, `prose-headings:text-[var(--color-text-main)]`. Never rely on prose default colors.

### [Workflow] Shortcut story state not updated during work
**Problem**: sc-57, sc-58, sc-59 were never moved to "In Progress" before starting the research work. They went directly from "To Do" to "Done".
**Root cause**: Agent started working without updating the story state first.
**Rule**: ALWAYS update Shortcut story state in real-time at each transition: To Do → In Progress (500000008, start dev) → In Review (500000009, start review/validation) → Done (500000010, validated). Never skip a state.

### [Workflow] Check off build tasks as you go — real-time updates
**Problem**: Build checklists exist in Shortcut but are never checked off → progress bar stays at 0%, impossible to know where the build stands.
**Root cause**: Agent completes steps without calling `stories-update-task isCompleted: true` at each step.
**Rule**: After each build step, check off the corresponding task IMMEDIATELY via `stories-update-task`. Required sequence for every story in build:
1. Refinement validated → check "Refinement validated"
2. Story file YAML written → check "Story file YAML"
3. Code implemented → check "Code implemented"
4. Unit tests passing → check "Unit tests"
5. e2e tests passing → check "Functional / e2e tests"
6. Security audit done → check "Security audit"
7. TS 0 errors → check "TypeScript: 0 errors"
8. ACs verified → check "ACs verified"
9. UI validated → check "UI validated visually"
10. PR created → check "PR created" + link PR via `stories-add-external-link`
11. feature-tracker.yaml → validated → check "feature-tracker.yaml updated"
Story and parent epic completion % update automatically in Shortcut.

### [Workflow] Always apply phase labels to every story
**Problem**: Stories have no `scope:` label → impossible to filter by phase in the kanban.
**Root cause**: Agent does not update the `scope:` label when the phase changes.
**Rule**: At each phase transition, update the `scope:` label on the story:
- Created → `scope:pending`
- Story file written → `scope:refined`
- Build started → `scope:building`
- Validation started → `scope:testing`
- All ACs pass → `scope:validated`
Use `stories-update labels:[{name: "scope:building"}]` at each transition.

### [Workflow] Break tickets into tasks (checklist)
**Problem**: sc-57/58/59 tickets were completed without tasks — impossible to know what's done vs remaining.
**Root cause**: Agent worked on the ticket without breaking it into traceable sub-tasks.
**Rule**: ALWAYS add tasks (stories-add-task) to a Shortcut ticket BEFORE starting work. Each significant step = one task. Check tasks off as you go (stories-update-task isCompleted). This ensures you always know exactly where things stand, even if the session is interrupted.

### [Shortcut] Story creation rules — mandatory checklist
**Problem**: sc-88 to sc-94 created without a team → invisible in the kanban. Sub-stories not linked to sc-31 → orphaned.
**Root cause**: `stories-create` called without `team` parameter and without linking to parent.
**Rule**: On every `stories-create`, ALWAYS verify:
1. `team`: always pass `ya-bes-team` (or the project team)
2. `epic`: link to epic if applicable
3. Sub-stories: call `stories-add-subtask` immediately after creation to link to parent
4. Tasks: call `stories-add-task` for each step BEFORE starting dev
5. Description: include context, scope, acceptance criteria, references

### [Workflow] NEVER code without refinement first
**Problem**: sc-82 — bug identified, story created, but agent jumped to coding immediately without presenting the story for refinement. The framework requires a refinement step before any development.
**Root cause**: Agent confused "story created" with "refinement done".
**Rule**: Creating the story is NOT enough. The workflow is: 1) Create the story, 2) Present it to the user for refinement/validation, 3) Wait for explicit agreement, 4) ONLY THEN move to In Progress and start dev. Never skip the refinement step, even for a simple bug.

### [Quality] Unit tests alone are not enough — test the END-TO-END FLOW
**Problem**: sc-88 to sc-94 — 64 unit tests passing but the orchestrator was not wired into the controller. The real flow returned "Hiring Manager" entries with no name or email. Declared Done without testing a real user journey.
**Root cause**: Agent validated each service in isolation (unit tests) without ever testing the full integration: "I launch a search → I get named contacts with emails".
**Rule**: After writing unit tests, ALWAYS test the complete flow: call the API or navigate the app like a user and verify the result is useful. A service wired to nothing is a service that does not exist.

### [Env] Japa tests require Node >= 22
**Problem**: `pnpm test` fails with Node 20 (`SyntaxError: The requested module 'node:fs/promises' does not provide an export named 'glob'`).
**Root cause**: Japa 5.3.0 uses `fs/promises.glob` which is only available from Node 22.
**Rule**: ALWAYS run tests with Node >= 22 (`~/.nvm/versions/node/v22.22.1/bin/node`). Check `node --version` before declaring tests as failed.

### [Validation] Log in before verifying a protected page
**Problem**: UI validation declared without verifying the actual page — the preview redirects to /login if not authenticated.
**Root cause**: Agent took a screenshot without checking whether the page was accessible (authentication required).
**Rule**: ALWAYS log in via the preview BEFORE attempting to visit a protected page. Required sequence: 1) Navigate to /login, 2) Fill email + password (use TEST_USER_EMAIL / TEST_USER_PASSWORD from .env.test, defaults: profile-unit@example.com / password123), 3) Click submit, 4) THEN navigate to the target page. Never declare UI validated without a real screenshot taken after login.

### [Workflow] Always close the Shortcut ticket after merge
**Problem**: sc-30 — PR merged, story left in "In Review". Detected in the next session.
**Root cause**: The Shortcut "In Review → Done" transition was not in the story file verify: commands. The session ended mid-merge-conflict, the closing step was never executed.
**Rule**: The story template now includes an `AC-BP-[FEATURE]-DONE` (closing_ac) that verifies the PR is merged. The validator MUST run this AC last and call `stories-update` (workflow_state_id: 500000010) immediately after. Without this, the story is not "done".

### [Build] Never manually edit an auto-generated file
**Problem**: sc-205 — the story asked to modify `database/schema.ts` manually. This file carries a "DO NOT EDIT manually" notice and is regenerated automatically on every `migration:run`. Our change was overwritten by `--dry-run`.
**Root cause**: The refinement agent listed `schema.ts` in `files_to_modify` without knowing it was auto-generated.
**Rule**: Before including a file in a story's scope, ALWAYS check whether it carries an "auto-generated / DO NOT EDIT" notice. If yes: do NOT include it in `files_to_modify`. Instead: create the corresponding migration → run `migration:run` → the file regenerates automatically with the right data. Same rule for any generated file (OpenAPI, GraphQL schema, etc.).

### [Validation] Pre-existing errors found during validation must be fixed or tracked
**Problem**: sc-216 — validator found console errors (`MISSING_MESSAGE: chat`, `auth.forgotPassword`) during the preview check and noted them as "pre-existing, not related to sc-216" without taking any action.
**Root cause**: Agent treated pre-existing errors as acceptable background noise instead of actionable issues.
**Rule**: ANY error found during validation (console errors, TypeScript errors, test failures) MUST result in one of two outcomes: 1) Fix it immediately in the current PR if small (< 30 min), 2) Create a Shortcut story for it if out of scope or complex. There is NO third option of "noting it and moving on". Ignoring an error is never acceptable.

### [Quality] ALWAYS write unit tests before declaring done
**Problem**: sc-60 — 4 services modified (visa_sponsor_registry, email_enricher, company_enricher, sourcing_service) with no unit tests. Caught in review by the user.
**Root cause**: Agent implemented the code and declared "done" without writing tests, even though the framework requires it (Phase 4: Test).
**Rule**: EVERY code change MUST be accompanied by unit tests BEFORE pushing. This is in the framework spec (Phase 4). NEVER declare done without: 1) unit tests written and passing for every modified function, 2) e2e verified if there is frontend impact. Unit tests are NOT optional.
