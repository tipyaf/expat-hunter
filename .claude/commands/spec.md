---
name: spec
description: Define or extend a project spec. Auto-detects spec.type (web-ui here), drives Constitution → Scoping → Clarify → UX → Architecture. Use when starting a project or adding a major feature.
---

## Instructions

You are executing the `/spec` skill from the SDD framework v5.

**Step 1 — Load the skill definition**
Read `framework/skills/spec/SKILL.md`.

**Step 2 — Load context**
- `memory/expat-hunter.md` (project state)
- `memory/LESSONS.md` (known pitfalls)
- `specs/feature-tracker.yaml` (if it exists)
- `specs/expat-hunter.yaml` — root spec. Read the top-level `type:` value (`web-ui` for this project) to know which gates apply.
- `specs/constitution.md` — non-negotiable principles.

**Step 3 — Auto-detect `spec.type` (first-run only)**
If the root spec lacks a `type:` at the top level, detect it from project files (`package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`) and ASK the user to confirm before writing. The priority when multiple surfaces exist: `mobile` > `web-ui` > `web-api` > `cli` > `library`.

**Step 4 — Execute the workflow**
Phases (load ONE agent at a time — never all at once):

| Phase | Agent | Output |
|---|---|---|
| Constitution | `framework/agents/product-owner.md` | `specs/constitution.md` |
| Scoping | `framework/agents/product-owner.md` | feature list in tracker |
| Clarify | `framework/agents/product-owner.md` | `specs/expat-hunter-clarifications.md` |
| UX | `framework/agents/ux-ui.md` | `specs/expat-hunter-ux.md` + wireframes with `data-testid` / `data-action` / `data-state` (required for G9.x) |
| Architecture | `framework/agents/architect.md` | `specs/expat-hunter-architecture.md` + `specs/expat-hunter-manifest.yaml` |
| Design system | `framework/agents/ux-ui.md` | `specs/design-system.yaml` (tokens) — required for G9.1 |

Wait for explicit human validation at each phase boundary. Write artefacts to `specs/` and update `memory/expat-hunter.md` after each phase.

**Step 5 — Finalise**
Update `specs/feature-tracker.yaml` with the new features at `status: pending`. Suggest `/refine <feature-id>` as the next step.

**Key rules:**
- Load ONE agent at a time.
- Wait for human validation at each phase boundary.
- UI wireframes MUST carry `data-testid`, `data-action`, `data-state`, `data-role` (contract for G9.2, G9.3, G9.4).
- `spec.type` drives which gates apply — it MUST be a valid v5 value (`web-ui`, `web-api`, `cli`, `library`, `ml-pipeline`, `mobile`, `embedded`).
