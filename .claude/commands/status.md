---
name: status
description: Passive dashboard — stats, gates, escalations, history. Includes a condensed "Actions recommandées" block from /next. Usage: /status [story-id]
---

## Instructions

You are executing the `/status` skill from the SDD framework v5.

**Argument**: $ARGUMENTS (optional: a specific story id for per-story detail; empty = global dashboard).

**Step 1 — Load the skill definition**
Read `framework/skills/status/SKILL.md`.

**Step 2 — Gather signals**
Read (never mutate):
- `specs/feature-tracker.yaml` — count stories per status (pending / refined / building / testing / validated / escalated / tampered / shipped).
- `_work/build/*.yaml` — gate states per story in flight.
- `_work/perf-baseline/` — perf drift on latest vs baseline (if present).
- `_work/visual-baseline/` — visual regression status.
- `memory/LESSONS.md` — modified-since timestamp.
- `git log --oneline -5` and `git status --short` — current local state.
- `gh pr list --state open --json number,title,labels` — open PRs, flag those without `sdd-validated-v5`.

**Step 3 — Render**
Output four blocks:

1. **Global counts**: stories per state; open PRs; escalations (if any).
2. **In-flight stories**: per story currently `building`, show the last gate passed / failed.
3. **Historical signals**: last release, last validated story, flaky tests seen in the last runs (if known).
4. **Actions recommandées**: invoke `python3 framework/scripts/next_report.py --scope blocked` and render its output as a sub-block. Refer the user to `/next` for the full action list.

**Step 4 — Per-story mode (`$ARGUMENTS` non-empty)**
Render the full lifecycle of the single story:
- ACs (from `specs/stories/$ARGUMENTS.yaml`) with their `verify:` PASS/FAIL.
- Gate status with timestamps (from `_work/build/sc-$ARGUMENTS.yaml`).
- Commits referencing the story on the current branch.
- Any escalations / tamper notes.

**Key rules:**
- READ-ONLY. Never alter any file.
- Stay concise — if the global dashboard would exceed ~50 lines, elide older history and tell the user to use `--story` for depth.
