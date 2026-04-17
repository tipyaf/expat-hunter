---
name: scan
description: Code-quality scan. Default = local diff only; `--full` = full codebase; `--report` = JSON output. Fusion of v4's /scan + /scan-full + /sonar. Usage: /scan [--full] [--report]
---

## Instructions

You are executing the `/scan` skill from the SDD framework v5.

**Argument**: $ARGUMENTS (flags: `--full`, `--report`; both optional).

**Step 1 — Load the skill definition**
Read `framework/skills/scan/SKILL.md`.

**Step 2 — Local diff mode (default, no flags)**
Read `specs/code-quality.yaml` to identify the project's G3 primary tool. For this project: **Biome**.

```bash
# Only files changed vs origin/develop
CHANGED=$(git diff --name-only origin/develop...HEAD -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.json')
[ -n "$CHANGED" ] && pnpm exec biome check $CHANGED || echo "No changed files to scan."
```

Report:
- PASS: ✅ clean + file count scanned.
- FAIL: the Biome output + the exact `pnpm lint:fix` command to try auto-fix.

**Step 3 — Full mode (`--full`)**
Run on the whole codebase and compare to the baseline in `_work/code-quality/biome-baseline.txt`:

```bash
pnpm lint 2>&1 | tee /tmp/scan-full.txt
```

Report the DELTA vs baseline (new/fixed violations per file) — not the raw count. The baseline accepts 1391 errors + 212 warnings as historical tech debt; a `/build` only fails G3 when NEW violations appear on touched files.

**Step 4 — SonarQube fallback (`--full --report`)**
If `pnpm sonar:up` has been run and SonarQube is reachable on `http://localhost:9000`, also invoke:

```bash
python3 framework/stacks/hooks/sonar_check.py
```

Merge the Biome and Sonar findings. Sonar is optional-secondary per `specs/code-quality.yaml`; it enriches but does not block.

**Step 5 — `--report` flag**
Emit a structured JSON envelope:
```json
{
  "mode": "diff|full",
  "tool": "biome",
  "files_scanned": <int>,
  "new_errors": <int>,
  "new_warnings": <int>,
  "baseline_errors": 1391,
  "baseline_warnings": 212,
  "details": [ { "file": "...", "line": ..., "rule": "...", "severity": "..." } ]
}
```

**Key rules:**
- Default mode = diff. `/scan` alone should never report on the 1391 legacy errors.
- Never mutate files. `/scan --fix` does NOT exist — the user runs `pnpm lint:fix` manually and reviews.
- SonarQube is optional. If the container is down, don't error — just note it.
