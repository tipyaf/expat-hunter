---
name: migrate
description: Apply a framework migration script. Supports v4 → v5.0 (and future v5.x → v6). Always use --dry-run first. Usage: /migrate [--to VERSION]
---

## Instructions

You are executing the `/migrate` skill from the SDD framework v5.

**Argument**: $ARGUMENTS (optional: `--to 5.0`, `--to 6.0`, etc.). Default = next available migration.

**Step 1 — Load the skill definition**
Read `framework/skills/migrate/SKILL.md`.

**Step 2 — Identify the right migration script**
Migration scripts live in `framework/scripts/migrate-*.sh`. Pick by source and target:

- v4.x → v5.0: `framework/scripts/migrate-v4-to-v5.sh` (already applied on this project, idempotent if re-run)
- v5.x → v6.0: `framework/scripts/migrate-v5-to-v6.sh` (if it exists)

If `$ARGUMENTS` is empty, list the available scripts and ask which one.

**Step 3 — Mandatory dry run first**
Always invoke `--dry-run` first and surface the plan to the user:

```bash
./framework/scripts/migrate-v<N>-to-v<N+1>.sh --dry-run
```

Show:
- the files the migration would create / modify / move,
- any warnings (unknown stacks, orphan references, tamper signals),
- the SHA range the script would inspect.

**Step 4 — Ask before applying**
Do NOT run the real migration without explicit user confirmation. When they confirm:

```bash
./framework/scripts/migrate-v<N>-to-v<N+1>.sh --backup
```

`--backup` creates `_backup_v<N>/` (already gitignored) for one-command rollback via
`--rollback`.

**Step 5 — Post-migration verification**
After the script reports success, verify before committing:

1. `git diff HEAD` — only the files the script said it would touch should be modified.
2. `grep -nE "framework v<N>\.|11 gates|\btester\b|\bstory-reviewer\b" CLAUDE.md` — must be empty for an upgrade.
3. Read `_backup_v<N>/MIGRATION_REPORT.md` — check the warnings and the manual follow-ups list.

**Step 6 — Commit split**
Produce two commits on a dedicated branch (Git Flow: branch from `develop`):

1. `chore: bump framework submodule v<N>.x → v<N+1>.0`
2. `chore: migrate framework v<N>.x → v<N+1>.0`

Then open a PR with `gh pr create --base develop`.

**Key rules:**
- `--dry-run` BEFORE `--backup`, always.
- Never commit `_backup_v<N>/` — it's gitignored.
- If the script reports `Git working tree is dirty`, stop and ask the user to stash/commit first — do NOT pass `--force` unless the user explicitly requests it.
- If something looks off post-migration, `./framework/scripts/migrate-v<N>-to-v<N+1>.sh --rollback` restores the backup.
