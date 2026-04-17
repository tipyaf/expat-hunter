---
name: refine
description: Break a feature into stories with structured ACs + verify commands + (for UI) an interactions block. Auto-injects AC-SEC/AC-BP from the active stack profiles. Usage: /refine [feature-id]
---

## Instructions

You are executing the `/refine` skill from the SDD framework v5.

**Argument**: $ARGUMENTS (the feature id, e.g. `candidate-profile`, `sc-431-3`). Required.

**Step 1 — Load the skill definition**
Read `framework/skills/refine/SKILL.md`.

**Step 2 — Load context**
- `memory/expat-hunter.md` (project state)
- `memory/LESSONS.md` (known pitfalls)
- `specs/feature-tracker.yaml` (feature states)
- `specs/expat-hunter.yaml` — root spec (contains `type: web-ui`, read for gate selection)
- `specs/expat-hunter-architecture.md` (architecture)
- `specs/constitution.md` (non-negotiable principles)
- `specs/expat-hunter-clarifications.md` (resolved ambiguities)
- `_work/stacks/registry.yaml` → the enabled stacks' `ac-templates.yaml` (the refinement agent injects AC-SEC / AC-BP from these templates automatically)
- `specs/design-system.yaml` — if present (for G9.1 token enforcement)

**Step 3 — Phase guard**
The feature must exist in `feature-tracker.yaml` with `status: pending` (or `refined` if re-refining). If missing, suggest `/spec` first. If `building`/`validated`, warn the user that re-refining an active story can invalidate its gate evidence.

**Step 4 — Execute the workflow**
Dispatch `framework/agents/refinement.md`. The agent:
1. Breaks the feature into stories with explicit `scope`, `acceptance_criteria` (functional / security / best-practices), `verify:` commands, and `definition_of_done`.
2. For UI stories (`spec.type: web-ui` and the story touches `apps/frontend/`), REQUIRES an `interactions:` block: trigger + pre_state + expected (DOM / URL / API / state / console). See `_docs/v5-interactions-policy.md` for the format.
3. Injects AC-SEC + AC-BP from the active stack templates (`_work/stacks/<stack>/ac-templates.yaml`).
4. Presents the breakdown to the user for validation BEFORE writing the story file.

**Step 5 — Write and confirm**
Once the user validates, write `specs/stories/<story-id>.yaml` and update `specs/feature-tracker.yaml` to `status: refined` with `refined_at: <today>` and `refined_by: refinement`.

**Step 6 — Point to the next step**
Suggest `/build <story-id>`.

**Key rules:**
- Every AC MUST have a `verify:` shell command — no exceptions.
- `verify: static` is BANNED. Rewrite until you have a real command.
- AC-SEC-* must be Tier 1 (grep/bash, not runtime). Tier 2/3 security checks go through G12 (runtime security / DAST-lite), not G5.
- UI stories without an `interactions:` block fail G9.4 at `/build` time — enforce at refinement.
- For grandfathered stories (status=validated, touched post-v5), add `interactions:` for the NEW user-facing changes only, not the whole implementation (see `_docs/v5-interactions-policy.md`).
- Update `specs/feature-tracker.yaml` after writing the story file — filesystem-phase gate.
