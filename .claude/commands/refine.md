---
name: refine
description: Refine a feature into actionable stories with structured acceptance criteria and verify commands. Usage: /refine [feature-id]
---

## Instructions

You are executing the `/refine` skill from the SDD framework v2.1.0.

**Argument**: $ARGUMENTS (the feature ID to refine, e.g., "candidate-profile")

**Step 1 — Load the skill definition**
Read `framework/skills/refine/SKILL.md` and follow its instructions exactly.

**Step 2 — Load context**
- Read `memory/expat-hunter.md` (project state)
- Read `memory/LESSONS.md` (known pitfalls)
- Read `specs/feature-tracker.yaml` (feature states)
- Read `specs/expat-hunter.yaml` (full spec)
- Read `specs/expat-hunter-architecture.md` (architecture)
- Read `specs/constitution.md` (principles)
- Read `specs/expat-hunter-clarifications.md` (resolved ambiguities)

**Step 3 — Phase guard**
Verify prerequisites from the skill file. If missing, tell the user what's needed.

**Step 4 — Execute the workflow**
Follow the refinement workflow. Load agents from `framework/agents/[name].md` as needed.

**Key rules:**
- Every AC MUST have a `verify:` shell command — no exceptions
- `verify: static` is BANNED — rewrite until you have a real command
- AC-SEC-* must be Tier 1 (grep/bash, not runtime)
- Present breakdown to user for validation before writing story file
- Update `specs/feature-tracker.yaml` after writing story
