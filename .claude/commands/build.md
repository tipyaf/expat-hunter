---
name: build
description: Build/implement a refined story. Auto-dispatches the right builder from the manifest, then runs the applicable G1–G14 gates via the orchestrator. Usage: /build [story-id]
---

## Instructions

You are executing the `/build` skill from the SDD framework v5.

**Argument**: $ARGUMENTS (the story id, e.g. `sc-431-3`). Required.

**Step 1 — Load the skill definition**
Read `framework/skills/build/SKILL.md` for the full contract.

**Step 2 — Load context**
- `memory/expat-hunter.md` (project state)
- `memory/LESSONS.md` (known pitfalls — v5 reads this BEFORE any fix)
- `specs/feature-tracker.yaml` (the story must be `status: refined`)
- `specs/stories/$ARGUMENTS.yaml` (the build contract, including `scope`, `acceptance_criteria`, and — for UI stories — the `interactions:` block for G9.4)
- `specs/constitution.md` (non-negotiable principles)
- `specs/code-quality.yaml` (G3 tool: Biome — baseline mode "new code only")
- `_work/stacks/registry.yaml` + the profile YAMLs it points to (`_work/stacks/typescript-react/`, `_work/stacks/nodejs-express/`)

**Step 3 — Phase guard**
If any precondition fails (story missing, status ≠ refined, framework submodule not on v5, code-quality tool not installed), tell the user what's wrong and suggest the precise fix command (`/refine`, `pnpm add -D @biomejs/biome`, etc.). Do NOT start the build.

**Step 4 — Hand off to the orchestrator**
The orchestrator is the single source of truth in v5. It auto-dispatches the right builder from the story's `scope` + `epic`, runs G1 → G14 in order, and owns the cycle counter + escalation.

```bash
python3 framework/scripts/orchestrator.py --mode build --story $ARGUMENTS
```

Agents the orchestrator will load:
- `framework/agents/test-author.md` (mode: `red` then `green`) — TDD phases.
- The right builder: `builder-service`, `builder-frontend`, `builder-infra`, `builder-migration`, or `builder-exchange` (dispatched from the story manifest).
- `framework/agents/code-reviewer.md` (scope: `story` then `code`) — G6 then G7.
- `framework/agents/security.md` — G1 + G12.
- `framework/agents/observability-engineer.md` — G11 if applicable.
- `framework/agents/performance-engineer.md` — G10.

**Step 5 — Handle gate failures**
If a gate fails, the orchestrator reports the failing gate + a remediation. Re-run `/build <story>` after fixing. The cycle counter trips at 3 — after which the story is `status: escalated` and only `/resume <story> "<reason>"` unlocks it.

**Step 6 — After PASS**
The orchestrator writes `_work/build/sc-$ARGUMENTS.yaml` with every gate's evidence and updates `feature-tracker.yaml` to `status: validated`. Suggest `/validate $ARGUMENTS` for independent verification, then `/ship $ARGUMENTS` to open the PR on `develop`.

**Key rules:**
- ONLY touch files listed in the story's `scope`. Out-of-scope edits fail G7.
- TDD is enforced at the git-commit level, not the honour system — `check_test_tampering.py` runs on every push.
- Every interactive UI element MUST carry `data-testid` + `data-action` matching the `interactions:` block (G9.4).
- G3 (Biome) runs in "new code only" mode — see `_docs/tech-debt-biome-cleanup.md` for the baseline + paydown plan.
- Never `--no-verify`. Every bypass is detected by `check_story_commits.py --scan-branch` at the next gate.
