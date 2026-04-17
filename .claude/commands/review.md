---
name: review
description: Diagnostic READ-ONLY — replays the applicable G1–G14 gates across the branch (or one story). Never creates a PR. Use before /ship. Usage: /review [story-id | --all]
---

## Instructions

You are executing the `/review` skill from the SDD framework v5.

**Argument**: $ARGUMENTS (optional: a story id for single-story scope, `--all` for the whole branch, empty = stories modified on the current branch).

**Step 1 — Load the skill definition**
Read `framework/skills/review/SKILL.md`.

**Step 2 — Understand the contract**
`/review` is DIAGNOSTIC. It:
- Re-runs every applicable G1–G14 gate.
- Reads the current working tree + git log.
- Produces a structured PASS/FAIL report with file:line references.

It NEVER:
- creates a PR (that's `/ship`);
- increments the cycle counter (a `/review` failure is NOT a build cycle);
- mutates any file (including `_work/build/`).

**Step 3 — Load context**
- `memory/expat-hunter.md`
- `memory/LESSONS.md`
- `specs/feature-tracker.yaml`
- `specs/code-quality.yaml` (Biome baseline mode)
- All `specs/stories/*.yaml` referenced by the branch's commits (`git log origin/develop..HEAD --name-only -- specs/stories/`).

**Step 4 — Execute via the orchestrator**
```bash
python3 framework/scripts/orchestrator.py --mode review $ARGUMENTS
```

The orchestrator:
1. Scopes by `$ARGUMENTS` — single story, all validated stories, or the stories modified on the current branch.
2. Executes every G1–G14 applicable per the stacks registry + project-type.
3. Produces a structured report: per-gate PASS/FAIL, evidence paths, and — on FAIL — the exact command to fix.

Agents loaded:
- `framework/agents/code-reviewer.md` (scope: `story` — G6, then `code` — G7).
- `framework/agents/security.md` (G1, G12).
- `framework/agents/performance-engineer.md` (G10).
- `framework/agents/observability-engineer.md` (G11).

**Step 5 — Render the verdict**
Emit the report as-is from the orchestrator. Do NOT paraphrase. End with:
- PASS: "Review green — safe to `/ship <story-id>` on branch `$(git branch --show-current)`."
- FAIL: one-line summary + a pointer to the failing gate's remediation.

**Key rules:**
- READ-ONLY. Never mutate any file.
- Not a cycle counter trigger.
- Works on `develop`-based branches (Git Flow).
