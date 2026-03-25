# Framework Sync

## Current state
- **Framework version**: 2.1.0
- **Sync method**: git submodule
- **Last synced**: 2026-03-24

## Sync history

| Date | From version | To version | Changes |
|------|-------------|------------|---------|
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
