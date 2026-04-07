# Framework Sync

## Current state
- **Framework version**: 4.1.1
- **Sync method**: git submodule
- **Last synced**: 2026-04-07

## Sync history

| Date | From version | To version | Changes |
|------|-------------|------------|---------|
| 2026-04-07 | 4.1.0 | 4.1.1 | Git Flow enforcement hooks (pr-base-branch-guard, push-to-main-guard, branch-origin-guard) |
| 2026-04-07 | 2.1.0 | 4.1.0 | 11 quality gates, wireframe HTML gate, atomic commits, TDD RED/GREEN pipeline, agent model dispatch |
| 2026-03-24 | 2.0.0 | 2.1.0 | Enforcement layer v3: feature tracker, story files, unified AC format, filesystem phase guards |
| 2026-03-17 | — | 2.0.0 | Initial setup via init-project.sh |

## How to sync

```bash
cd framework
git pull origin main
cd ..
git add framework
git commit -m "chore: update framework submodule to vX.Y.Z"
```

## v4.1.1 Migration (2026-04-07)
- Git Flow enforcement hooks installed in `.claude/settings.local.json`
- 3 PreToolUse hooks: pr-base-branch-guard, push-to-main-guard, branch-origin-guard

## v4.1.0 Migration (2026-04-07)
- Build pipeline: 7 gates → 11 gates
- Refine: wireframe gate + WCAG validation + PM integration
- Commit: atomic after ALL gates pass + auto PR/MR
- New script: check_story_commits.py
- New rules: agent-conduct Rules 11-17
