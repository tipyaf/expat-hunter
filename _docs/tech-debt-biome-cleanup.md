# Tech debt — Biome baseline cleanup

**Context**: the v5 migration introduced G3 (code-quality gate) as a
hard requirement. Running `pnpm lint` on the v4-era codebase revealed
**1391 errors + 212 warnings across 583 files** — accumulated because
v4's code-quality gate had a reviewer-fallback that let these slide.

**Policy adopted at migration time (2026-04-17)**:

G3 runs in **"new code only"** mode. A `/build` passes G3 when the
files touched by the current story do not ADD new violations. The
historical backlog is paid down via dedicated tech-debt stories.

## Snapshot (2026-04-17)

See `_work/code-quality/biome-baseline.txt`:

```
Checked 583 files in 887ms. No fixes applied.
Found 1391 errors.
Found 212 warnings.
```

## Breakdown (run `pnpm lint 2>&1 | grep -oE 'lint/[a-z/]+' | sort | uniq -c | sort -rn` to refresh)

Top violation categories at migration (order of magnitude, not exact):

- `lint/suspicious/noExplicitAny` — many `: any` in older services
- `lint/correctness/noUnusedImports` — dead imports after v4 refactors
- `lint/style/useConst` — `let` where `const` would do
- `lint/correctness/noUnusedVariables`
- `lint/complexity/useOptionalChain`
- `lint/style/noNonNullAssertion` — `!.` on nullable values

## Cleanup plan

### Phase 1 — auto-fixable (1 day)

```bash
pnpm lint:fix
git diff   # review
```

Biome auto-fixes ~70 % of style and correctness issues (useConst,
noUnusedImports, optional chaining, etc.). Target: drop below 500
errors in one PR.

### Phase 2 — batch `any` removal (~3 days)

Group files by feature. Per feature: replace `any` with proper
types, run tests, commit.

```bash
grep -rn ': any\b' apps/api/app apps/frontend/src | head -20
```

### Phase 3 — remaining warnings (~1 day)

Review remaining warnings case by case. Many `useExhaustiveDependencies`
warnings require actual review of hook dependencies.

### Phase 4 — adjust policy

Once the error count is < 50 and warning count < 100, flip
`specs/code-quality.yaml > primary.must_exit_zero` to `true` and
drop the "new code only" mode. G3 then blocks on any violation.

## Ownership

Tech-debt cleanup is tracked as its own stories (`sc-td-biome-*`) in
`specs/feature-tracker.yaml`. They can be picked up opportunistically
when a feature team has slack, but the framework does NOT force a
cleanup before shipping new features — otherwise every story pays the
historical debt penalty.

## Why not just `--max-warnings 0` from day one?

Because the v4 codebase predates strict Biome. Forcing zero violations
today would mean cleaning up 1603 issues before ANY new code can ship,
which is a worse engineering tradeoff than paying it down incrementally
while the machine guards against further drift (the "new code only"
policy).
