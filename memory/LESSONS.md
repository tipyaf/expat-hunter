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
9. Zero console errors → check "Zero console errors/stacktraces"
10. UI validated → check "UI validated visually"
11. UX spec updated if new pages/flows → check "UX spec updated"
12. PR created → check "PR created" + link PR via `stories-add-external-link`
13. feature-tracker.yaml → validated → check "feature-tracker.yaml updated"
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

### [Git] NEVER target main with PRs — all work merges into develop
**Problem**: sc-431 to sc-550 — ~40 PRs were merged directly into `main` while sc-549 went to `develop`. The two branches diverged massively, requiring a painful cherry-pick session (10 commits, 8 conflict resolutions) just to reunify them.
**Root cause**: No branching model was defined. The agent defaulted to `--base main` for PRs. Some features went to `develop`, others to `main`, creating an unsynchronizable split.
**Rule**: This project uses Git Flow. `main` = production (releases only). `develop` = integration (all feature work). EVERY PR MUST target `develop` via `gh pr create --base develop`. NEVER `--base main` except for release PRs. EVERY feature branch MUST start from `origin/develop`. See CLAUDE.md "Git branching model" section.

### [Quality] ALWAYS write unit tests before declaring done
**Problem**: sc-60 — 4 services modified (visa_sponsor_registry, email_enricher, company_enricher, sourcing_service) with no unit tests. Caught in review by the user.
**Root cause**: Agent implemented the code and declared "done" without writing tests, even though the framework requires it (Phase 4: Test).
**Rule**: EVERY code change MUST be accompanied by unit tests BEFORE pushing. This is in the framework spec (Phase 4). NEVER declare done without: 1) unit tests written and passing for every modified function, 2) e2e verified if there is frontend impact. Unit tests are NOT optional.

### [Quality] CRITICAL — NEVER validate without e2e + unit tests executed and passing
**Problem**: sc-431 epic (5 stories) — all 5 stories validated and merged without writing e2e tests for frontend changes. Only sc-431-2 had unit tests. User caught the violation and was extremely frustrated.
**Root cause**: Agent treated e2e tests as optional, rubber-stamped the build checklist tasks "Functional / e2e tests written and passing" without actually writing or running them. Prioritized speed over correctness.
**Rule**: Before ANY story can be marked validated: 1) Unit tests MUST exist and PASS for every new/modified service, 2) E2e tests MUST exist and PASS for every frontend-impacting change (CLAUDE.md e2e rules), 3) Tests MUST be EXECUTED (show output) — not just "written". 4) If tests fail, FIX before validating. NEVER skip, NEVER rubber-stamp. This is the #1 priority — violating this erodes all trust.

### [Validation] NEVER validate with console errors or stacktraces
**Problem**: Multiple stories validated while MISSING_MESSAGE errors, JavaScript stacktraces, or backend exceptions were visible in the console. These were dismissed as "pre-existing" or "not related" without being fixed or tracked.
**Root cause**: Validator checked TypeScript compilation and screenshots but never inspected the browser console or server logs for runtime errors.
**Rule**: Before ANY story can be marked validated: 1) Check browser console via preview_console_logs — zero errors allowed, 2) Check backend server logs — zero stacktraces or unhandled exceptions, 3) Warnings are noted but do not block. 4) Pre-existing errors MUST be fixed (<30 min) or tracked in a new Shortcut story. Console errors are a BLOCKING validation gate — a page with a console error is NOT validated, period.

### [Shortcut] Always include the Shortcut story link when presenting refinement
**Problem**: Refinement proposals presented without a link to the Shortcut ticket. User has to search for it manually.
**Root cause**: Agent focuses on technical content and forgets the project management link.
**Rule**: When presenting a refinement, ALWAYS include the Shortcut story URL (e.g., https://app.shortcut.com/expat-hunter/story/XXX) so the user can review the ticket directly.

### [Git] Always commit memory and tracker files before finishing a story
**Problem**: memory/expat-hunter.md and _work/spec/*.yaml left uncommitted multiple times. User had to catch it manually.
**Root cause**: Agent updates memory/tracker files but forgets to stage and commit them with the rest of the changes.
**Rule**: Before declaring a story done or pushing a PR, ALWAYS run `git status` and verify that ALL modified files are committed — especially: 1) `memory/expat-hunter.md`, 2) `_work/feature-tracker.yaml`, 3) `_work/spec/*.yaml` story files. These are project artifacts, not throwaway notes. If they are modified, they MUST be in the commit.

### [Workflow] ALL 11 validation gates MUST pass BEFORE commit/PR — no exceptions
**Problem**: sc-810 — commit and PR created while E2E tests (gate 4-7) and wireframe conformity (gate 5) were still `pending`. Had to add a second commit with E2E + testid fixes after the PR was already created.
**Root cause**: Agent hit dev environment issues (API port mismatch) and decided to commit/PR anyway to "move forward", treating pending gates as acceptable.
**Rule**: NEVER create a commit or PR while any applicable validation gate is still `pending`. The correct sequence is: 1) Write ALL tests (unit + functional + E2E), 2) Verify wireframe conformity (data-testid alignment), 3) Run ALL gates, 4) Fix failures, 5) ONLY THEN commit and create PR. If the dev environment blocks a gate, fix the environment first — don't skip the gate. A PR with pending gates is a broken PR.

### [Shortcut] Story description must use real newlines, not literal \n
**Problem**: Shortcut story descriptions rendered as a single block of text with no formatting. ACs, scope, and context were unreadable.
**Root cause**: Agent passed the description string with `\n` escape sequences instead of real newlines. The Shortcut API renders them literally.
**Rule**: ALWAYS use real multi-line strings when calling `stories-update` or `stories-create` for the description field. Never use `\n` in description strings — use actual line breaks.

### [Quality] ALWAYS run SonarQube before commit/PR — it's configured in .devtools
**Problem**: sc-810 — PR created and merged without running SonarQube. 17 issues (4 Major) found only after the user asked. Required a follow-up fix PR.
**Root cause**: Agent skipped Gate 3 (Code Quality) tool check. SonarQube is configured in `.devtools/docker-compose.yml` and `.env` but the agent used "reviewer fallback" instead of the actual tool.
**Rule**: This project has SonarQube configured. ALWAYS run it via `docker run sonarsource/sonar-scanner-cli` (not local Java) BEFORE creating a commit. The command: `source .env && docker run --rm --network host -e SONAR_HOST_URL -e SONAR_TOKEN -v $(pwd):/usr/src sonarsource/sonar-scanner-cli -Dsonar.projectKey=$SONAR_PROJECT_KEY -Dsonar.sources=. -Dsonar.inclusions="<changed-files>" -Dsonar.exclusions="node_modules/**,dist/**" -Dsonar.projectBaseDir=/usr/src`. Fix all Major issues before committing. Minor issues should be fixed too when feasible.

### [Infra] SonarQube Docker — start properly and never assume token is expired
**Problem**: sc-825 — SonarQube started with `docker compose --profile sonar up -d` without `--env-file ../.env`, creating new volumes instead of using existing `devtools_*` ones. All data (credentials, token, project) was lost. Agent wrongly concluded "token expired" and regenerated everything.
**Root cause**: Agent didn't read the reference memory for SonarQube setup. Started SonarQube without the correct env file, which caused Docker to create new named volumes instead of reusing existing ones.
**Rule**: 
1. ALWAYS start SonarQube with: `cd .devtools && docker compose --env-file ../.env --profile sonar up -d`
2. If token validation fails, FIRST check `docker volume ls | grep sonar` to verify the correct `devtools_*` volumes are mounted
3. NEVER assume "token expired" — check volumes, credentials, and server status first
4. NEVER delete or recreate SonarQube volumes — data must persist across restarts
5. Read `memory/reference_sonarqube_setup.md` before any SonarQube operation

### [Git] After squash merge, ALWAYS verify the result compiles
**Problem**: PR #172 squash-merged into develop, creating a duplicate `import { useAuth }` line in `use-offer-notifications.ts`. The build broke immediately. Required an emergency follow-up PR #173.
**Root cause**: PR #172 and PR #170 both modified `use-offer-notifications.ts` (adding the same `useAuth` import). Git's squash merge resolved textual conflicts but created a semantic duplicate — two identical import lines. The agent never checked the merge result.
**Rule**: After EVERY squash merge, ALWAYS: 1) `git pull` the target branch, 2) Run `tsc --noEmit` or the build command, 3) Open the browser and verify the app loads. Squash merges can create subtle duplication when multiple PRs touch the same file. Never assume the merge is clean — verify it compiles before moving on.

### [Quality] Use sonar-project.properties — don't duplicate config in CLI
**Problem**: sc-1053 — SonarQube scan passed all `-D` params manually, ignoring the existing `sonar-project.properties` at project root. This caused noisy WARN logs (symlink traversal in node_modules) and duplicated config.
**Root cause**: Agent didn't check for an existing `sonar-project.properties` before building the scan command.
**Rule**: This project has a `sonar-project.properties` at the root with `projectKey`, `sources`, and `exclusions` already configured. When running SonarQube, ONLY pass `-Dsonar.inclusions="<changed-files>"` and env vars — let the scanner pick up everything else from the properties file. NEVER duplicate `projectKey`, `sources`, or `exclusions` in CLI args when the properties file exists.
