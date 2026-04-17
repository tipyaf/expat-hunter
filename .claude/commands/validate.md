---
name: validate
description: Independent verification — re-runs every verify: command + re-scans gates G1–G14 applicable to this story. Contracted spec check, separate from /build. Usage: /validate [story-id]
---

## Instructions

You are executing the `/validate` skill from the SDD framework v5.

**Argument**: $ARGUMENTS (the story id, e.g. `sc-431-3`). Required.

**Step 1 — Load the skill definition**
Read `framework/skills/validate/SKILL.md`.

**Step 2 — Load context**
- `memory/expat-hunter.md`
- `memory/LESSONS.md`
- `specs/feature-tracker.yaml` (the story must be `status: building`, `testing`, or `validated` — re-validation is idempotent)
- `specs/stories/$ARGUMENTS.yaml` (the contract — every `verify:` command AND the `interactions:` block for G9.4)

**Step 3 — Phase guard**
If the story is `pending` / `refined`, tell the user that `/validate` runs AFTER `/build` — suggest `/build $ARGUMENTS` first. If `escalated` / `tampered`, refuse and point to `/resume`.

**Step 4 — Execute via the orchestrator**
```bash
python3 framework/scripts/orchestrator.py --mode validate --story $ARGUMENTS
```

The orchestrator:
1. Executes EVERY `verify:` command from `specs/stories/$ARGUMENTS.yaml` (G5 — AC validation mechanical).
2. Re-runs G1 through G14 applicable to this story's type (`web-ui` inherits `web-api` + adds G9.x).
3. For G9.4, invokes `framework/scripts/generate-interaction-tests.py` to emit Playwright specs from `interactions:`, then executes them.
4. Produces a structured PASS/FAIL report written to `_work/build/sc-$ARGUMENTS.yaml`.

**Step 5 — Outcome**
- ALL PASS → `specs/feature-tracker.yaml` → `status: validated`, cycle counter reset. Suggest `/ship $ARGUMENTS`.
- ANY FAIL → increment `cycles`, surface the failing gate + remediation. User fixes, re-runs `/build` then `/validate`.
- `cycles >= 3` → do NOT attempt a 4th. Write `status: escalated`, explain to the user, and require `/resume $ARGUMENTS "<reason>"` to unlock.

**Key rules:**
- Execute EVERY `verify:` — no skipping. If a command is unrunnable (wrong tier), fail the gate and point at the refinement that let it through.
- `/validate` is independent of `/build` — the orchestrator runs the checks cold, from the current working tree + git log.
- Cycle counter is mandatory. 3 strikes → escalated.
- Never bypass. `--no-verify` on git commits is detected by `check_story_commits.py --scan-branch` at the next pass.
