---
name: resume
description: Exit an escalated/tampered state. REQUIRES a reason string (for audit). Usage: /resume <story-id> "<reason>"
---

## Instructions

You are executing the `/resume` skill from the SDD framework v5.

**Arguments**: $ARGUMENTS — must be `<story-id> "<reason>"`. Both required.

**Step 1 — Load the skill definition**
Read `framework/skills/resume/SKILL.md`.

**Step 2 — Parse and validate**
Expect two tokens: the story id, and a QUOTED reason string. If either is missing or the reason is empty, REFUSE with:

> `/resume` requires a reason. Usage: `/resume <story-id> "why was the block resolved?"`

Do not proceed with an empty reason — the reason is the audit trail.

**Step 3 — Confirm the target**
Read `specs/feature-tracker.yaml` and locate the story. Only proceed if:
- The story exists, AND
- Its current `status` is `escalated` or `tampered`.

Otherwise tell the user what the actual status is (e.g. "sc-431-3 is already `refined`, nothing to resume").

**Step 4 — Update state**
- In `specs/feature-tracker.yaml`: flip the story's status from `escalated`/`tampered` → `building`. Reset `cycles: 0`.
- Append a line to `memory/LESSONS.md` with:
  ```
  ## <YYYY-MM-DD> — resume <story-id>
  - Reason: <the reason the user provided>
  - Previous status: escalated|tampered
  - Resumed by: <git config user.name>
  ```

**Step 5 — Tell the user what's next**
Suggest `/build <story-id>` (or `/validate` if the story was mid-validation). Remind them that this resume was logged to `memory/LESSONS.md` for future reviewers.

**Key rules:**
- EMPTY reason → HARD REFUSE. No exceptions.
- Never clear the tamper flag silently — always leave a trail in `LESSONS.md`.
- Do not modify the git history. Resume only touches tracker + LESSONS.
