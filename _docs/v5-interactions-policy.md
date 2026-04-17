# v5 `interactions:` policy for expat-hunter

## What is the `interactions:` block?

In v5, **G9.4 — Interaction verification** asserts that every
interactive UI element of a story does exactly what the story says
when triggered. The story file declares expected behaviour:

```yaml
interactions:
  - action: click-upgrade-cta-sidebar
    description: "Free user clicks the upgrade button in the sidebar"
    pre_state: [{ plan: free }]
    trigger: click data-testid=sidebar-upgrade-cta
    expected:
      - url: /upgrade
      - dom: data-testid=upgrade-page-pricing-table is visible
      - no_console_errors: true
```

`generate-interaction-tests.py` reads the block and emits a Playwright
spec that asserts every `expected` item. If any assertion misses, G9.4
fails and `/ship` refuses to create a PR.

## Policy (adopted 2026-04-17, at the v5 migration)

### Mandatory from now on

Any **new or re-opened** UI story (web-ui stack, status ≠ validated)
MUST have an `interactions:` block before `/build`. `/refine` will
refuse to mark the story `refined` without one.

### Grandfathered: 56 retrospectively-validated stories

The 56 stories already in `status: validated` at migration time were
retrospectively validated when the framework was first adopted — their
implementations predate any `interactions:` expectation. We **do not**
retro-fit those stories today because:

- Filling them would be documentation archaeology, not verification.
- The running app already embodies their behaviour; any drift would be
  caught by G9.6 (behavioural regression on previously-validated
  interactions — which naturally starts empty and grows as new stories
  ship).
- Fake filler hurts more than it helps: agents would trust stubs that
  have never been tested.

### When a grandfathered story is modified

If you touch a grandfathered story (add ACs, change scope, reopen via
`/refine`), you MUST also add `interactions:` for the user-facing
changes you are making. The `refinement` agent enforces this.

### Already scaffolded at migration

Three non-validated UI stories received their `interactions:` blocks
during the v5 migration:

| Story | Interactions | Notes |
|---|---|---|
| `sc-431-3` | 12 | Premium/Free: badges, gated UI, upgrade page |
| `sc-431-4` | 6 | Premium/Free: chat quota + commercial tone |
| `sc-431-5` | 6 | Premium/Free: admin user panel |

## How to write a good `interactions:` block

### Required fields

- `action`: kebab-case label that matches `data-action` on the
  rendered element.
- `description`: one-sentence user perspective.
- `trigger`: the gesture that fires the interaction.
- `expected`: a list of assertions. At least one of them must be
  behavioural (DOM / URL / API / state). `no_console_errors: true` is
  almost always included.

### Optional fields

- `pre_state`: anything the test must set up before the trigger
  (plan, fixture, user_state, dom).

### Trigger vocabulary

| Form | Example |
|---|---|
| `navigate <path>` | `navigate /upgrade` |
| `click data-testid=<id>` | `click data-testid=admin-save-btn` |
| `type "<value>" in data-testid=<id>, submit` | `type "alice@ex.com" in data-testid=email-input, submit` |
| `drag data-testid=<src> to data-testid=<dst>` | `drag data-testid=card-1 to data-testid=col-done` |
| `fetch <METHOD> <path> [body=<json>]` | `fetch POST /api/chat body={messages:[...]}` |
| `focus <selector>` / `hover <selector>` | `focus data-testid=input-email` |

### Expected vocabulary

| Form | Example |
|---|---|
| `url: <path>` | `url: /upgrade` |
| `url_is_not: <path>` | `url_is_not: /admin/users` |
| `dom: <selector> is visible\|absent` | `dom: data-testid=toast is visible` |
| `dom_count: "<selector>=<n>"` | `dom_count: "data-testid=row=5"` |
| `dom_count_min: "<selector>=<n>"` | `dom_count_min: "data-testid=row=3"` |
| `dom_attr: <selector> has <attr>="<value>"` | `dom_attr: data-testid=btn has disabled="true"` |
| `dom_contains: <selector> matches /regex/` | `dom_contains: ... matches /upgrade/i` |
| `api_status: <code>` | `api_status: 403` |
| `api_matches: <METHOD> <path>` | `api_matches: PATCH /api/plan` |
| `api_body_contains: <token>` | `api_body_contains: quota_exhausted` |
| `href_starts_with: "<prefix>"` | `href_starts_with: "mailto:"` |
| `no_console_errors: true` | — |

### Required DOM attributes on the implementation

For `generate-interaction-tests.py` to map `action`/`expected` onto
real elements, the implementation must add these data attributes:

- `data-testid` on every referenced element (stable across re-renders)
- `data-action` on every clickable/draggable/submittable that matches
  an `interactions[].action`
- `data-state` on elements whose expected behaviour inspects their
  state (e.g. `data-plan`, `data-column`, `data-blurred`)
- `data-role` on semantic wrappers (e.g. `data-role="row"`)

These attributes are stripped from the production bundle by Biome or
Next's production build unless configured otherwise — keep them in
dev and test environments.

## Tooling cheat-sheet

```bash
# Preview what Playwright specs would be generated
framework/scripts/generate-interaction-tests.py --story sc-431-3 --dry-run

# Actually generate specs into apps/frontend/tests/generated/
framework/scripts/generate-interaction-tests.py --story sc-431-3

# Run G9.4 locally against the latest build
pnpm --filter @expat-hunter/e2e test -- tests/generated/sc-431-3.spec.ts

# G9.6 — replay every previously-validated interaction
pnpm --filter @expat-hunter/e2e test -- --project=behavioural-regression
```

## FAQ

**Q — Do I have to fill `interactions:` for a pure backend story?**
No. G9.4 only runs when the story's scope touches `apps/frontend/`
or a `packages/ui-*/` package. Backend-only stories skip it.

**Q — What if my UI change is a one-liner label tweak?**
Still add one interaction if the label is user-facing (tests that the
new label is visible). If it's purely internal (comment, doc), skip.

**Q — How do I test an interaction I haven't built yet?**
That's the point. Write the `interactions:` block first during
`/refine`. `generate-interaction-tests.py` emits failing specs before
you implement the UI — the RED phase of TDD now covers UI behaviour
too.
