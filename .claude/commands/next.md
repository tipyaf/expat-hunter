---
name: next
description: Morning action list — <2s priority report (BLOCKING / IN PROGRESS / READY / PENDING SHIP / SUGGESTIONS). Usage: /next [--scope blocked|in-progress|ready|ship|suggestions] [--json]
---

## Instructions

You are executing the `/next` skill from the SDD framework v5.

**Argument**: $ARGUMENTS (optional flags passed through to the report script, e.g. `--json`, `--scope blocked`)

**Step 1 — Load the skill definition**
Read `framework/skills/next/SKILL.md` for the full contract.

**Step 2 — Invoke the report**
Run the backing script with any flags the user passed:

```bash
python3 framework/scripts/next_report.py $ARGUMENTS
```

The script produces the five canonical sections — you must NOT paraphrase them; display the output as-is:

| Section | Meaning |
|---|---|
| 🚨 BLOCKING | Stories flagged `escalated` or `tampered`. Fix these first. |
| ⏸ IN PROGRESS | Stories with `status: building` — resume where you left off. |
| ▶ READY | Stories with `status: refined` — safe to `/build`. |
| 🚢 PENDING SHIP | Stories with `status: validated` — run `/ship [story-id]`. |
| 💡 SUGGESTIONS | Non-blocking signals (unread `memory/LESSONS.md`, perf drift, baseline missing). |

**Step 3 — Each item carries an explicit command**
The script already attaches the exact command to run (`/resume <id> "<reason>"`, `/build <id>`, `/ship <id>`, etc.). Do not invent alternatives.

**Step 4 — Exit semantics**
- Default: exit 0 (informational).
- `--strict`: exit 1 if BLOCKING is non-empty (for CI use).

**Key rules:**
- Fast path — NO gate execution, NO file mutation. This is a read-only report.
- Pass `$ARGUMENTS` straight through to the script — don't filter.
- If the project is not a v5 SDD project (no `specs/feature-tracker.yaml`), tell the user and suggest running `/spec` first.
