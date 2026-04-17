---
name: help
description: Contextual help. `/help` lists every v5 command with a one-liner; `/help <command>` drills into the skill. Suggests "did you mean X" on typos. Usage: /help [command]
---

## Instructions

You are executing the `/help` skill from the SDD framework v5.

**Argument**: $ARGUMENTS (optional: a command name, with or without leading `/`).

**Step 1 — Load the skill definition**
Read `framework/skills/help/SKILL.md`.

**Step 2a — No argument: list every command**
Scan `framework/skills/*/SKILL.md` and extract the frontmatter `name` + `description` of each. Render a table grouped by category:

- **Pipeline**: /spec, /refine, /ux, /build, /validate, /review, /ship
- **Operations**: /next, /status, /resume, /scan
- **Meta**: /help, /migrate

Mirror that pipeline order in the main list.

**Step 2b — Argument given: deep help for one command**
Read `framework/skills/<name>/SKILL.md` fully and render it. Also surface:
- The wrapper in `.claude/commands/<name>.md` if it differs from the framework default.
- The related `framework/agents/*.md` that this command loads.
- An example invocation with a real story id from `specs/stories/`.

**Step 3 — Typo handling**
If `$ARGUMENTS` is non-empty and doesn't match any command, compute the Levenshtein distance against the known list. If the closest match is ≤2, suggest `Did you mean /<closest>?`. Otherwise, print the full command list.

**Key rules:**
- READ-ONLY.
- Keep the default list ≤25 lines — it's a glance reference, not a tutorial.
- Sort skills by the pipeline order above, not alphabetically.
