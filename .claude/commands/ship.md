---
name: ship
description: The ONLY door to PR. Re-runs /review across the whole branch; on pass, pushes + opens a PR tagged `sdd-validated-v5` and attaches the evidence report. Usage: /ship [story-id]
---

## Instructions

You are executing the `/ship` skill from the SDD framework v5.

**Argument**: $ARGUMENTS (the story id, e.g. `sc-431-3`). Required.

**Step 1 — Load the skill definition**
Read `framework/skills/ship/SKILL.md` for the full contract.

**Step 2 — Enforce the contract**
This is the ONLY way a PR leaves this machine. The developer never runs `gh pr create` directly. If a human-created PR has no `sdd-validated-v5` tag, human review MUST reject it.

**Step 3 — Execute**
Invoke the orchestrator in ship mode:

```bash
python3 framework/scripts/orchestrator.py --mode ship --story $ARGUMENTS
```

The orchestrator:
1. Runs `/review` across the whole branch (all G1–G14 applicable gates).
2. If ANY gate fails → refuses to create a PR, surfaces the failure report, and points to the remediation. Return control to the user.
3. If every applicable gate passes → dispatches the `release-manager` agent (`framework/agents/release-manager.md`) which:
   - pushes the current branch to `origin`,
   - runs `gh pr create --base develop` (this project uses Git Flow) with a title + body generated from the story file + manifest,
   - attaches `_work/build/sc-$ARGUMENTS.yaml` as evidence in the PR description,
   - tags the PR `sdd-validated-v5`,
   - reports the final URL as "PR CREATED: <url>".

**Step 4 — Communicate the outcome**
Report back to the user:
- PASS: "PR CREATED: <url> — tagged `sdd-validated-v5`".
- FAIL: a concise gate-by-gate recap + the exact command to unblock.

**Key rules:**
- Base branch is `develop` (Git Flow). Never `main`.
- Never bypass gates.
- If the user asks to skip a gate, refuse and direct them to `/resume <story-id> "<reason>"` — which requires a reason for audit.
