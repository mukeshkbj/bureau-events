# Build log — Bureau of Almost-Happened Events

An honest account of the build, including the failures. Written alongside the
code, per the challenge's "the writeup is judged too" rule.

## What this is

A counterfactual story archive. Each case is a branching graph of incident
reports; a visitor reads by choosing what happened next. The authoring surface
is a custom App SDK board — not the Studio form — because the interesting part
of the content *is* the graph.

## Stack decisions

- **pnpm monorepo**: `apps/web` (Astro 7 static), `apps/editor` (App SDK,
  React 19), `apps/studio` (Studio v6), `packages/content-model` (schemas,
  GROQ, graph validator, seed), root `sanity.blueprint.ts` + `functions/`.
- **Astro over Next.js**: the public reader is a static archive; Astro's
  islands fit a mostly-HTML site with one interactive reader script.
- **Simple review workflow over native Workflows**: Workflows is early access
  and needs an operated runtime; `review` documents + a Function model the
  same process with less infrastructure. (Stretch goal, not a dependency.)
- **BFS shortest-path layering** for the board layout — see failure #1.

## The workflow loop

```
Author edits graph in App SDK board ──► "Submit for review" creates review doc
                                            │
                              Curator approves / requests changes (publishes review)
                                            │
                    Sanity Function patches caseFile.reviewStatus (idempotent)
                                            │
              Studio "Publish case graph" ──► one transaction publishes
              case + all child incident/artifact drafts ──► Astro rebuild
```

## What broke, and the fix

### 1. Graph layering ran forever on cycles

`computeLayers` started as longest-path relaxation. Any cycle (`a → b → a`)
keeps relaxing each node's depth — the test expecting layers `0,1,2` got `6`
and would have diverged on bigger graphs. Replaced with BFS shortest-path from
the entry node; cycles are now reported as diagnostics (cyclic incidents get
flagged `warning`) instead of crashing the layout.

### 2. App SDK code was written against imagined APIs

First pass at `apps/editor` guessed hook signatures. The actual SDK 3.5.0
declarations differ:

- `usePaginatedDocuments` has no `hasMore`/`loadMore` — those belong to
  `useDocuments`. Switched the case list to `useDocuments`.
- `useDocumentEvent` takes `{onEvent}`, not a bare callback.
- `useQuery` / `useDocument` / `useEditDocument` take a single options object
  (`{query, params}` / `{...handle}`), not positional args.
- `useCreateDocument({documentType})` returns a *create function* that
  resolves to a `DocumentHandle`; you then `apply(publishDocument(handle))`.
- `useEditDocument` updaters receive the whole document and must return a
  full document shape — `(prev) => ({...prev, field})`, not partial patches.

Fix: read the installed `.d.ts` files under `node_modules/.pnpm` instead of
guessing, then rewrote `CaseList`, `IncidentEditor`, `ReviewPanel`,
`CaseBoard`, `ActivityToast` against the real signatures.

### 3. The public site crashed at build time without credentials

Two layers: the placeholder project ID `MISSING_PROJECT_ID` contains
underscores/uppercase and fails `@sanity/client`'s `a-z0-9-` validation at
module init — before any fetch could be caught. Changed the placeholder to
`'unconfigured'` (valid format), so client construction succeeds and only the
network call fails. That failure is caught by a `safeFetch` wrapper that logs
a warning and renders the designed empty-archive state. The site now builds
and previews correctly with zero credentials — and the empty state was
designed anyway, so the fallback exercises real UI.

### 4. Missing `sanity.cli.ts` for the Studio app

`sanity build` fails with `NotFoundError: No CLI config found` unless each
app has `sanity.cli.ts`. The editor had one (it needs `app.organizationId`
for App SDK deploy); the studio needed `api.projectId/dataset` for build and
deploy.

### 5. Type environment mismatches

- `vite/client` types referenced in tsconfigs that don't install vite types —
  removed; the editor got a local `env.d.ts` for `import.meta.env`.
- `@types/node` missing in `packages/content-model` and `apps/studio`.
- Studio custom actions: `DocumentActionProps` exposes `SanityDocument | null`
  for both `draft` and `published` — helper typing had to be widened.
- Root `functions/` and `sanity.blueprint.ts` sat outside the workspace
  globs and weren't typechecked; added a root `tsconfig.json` wired into
  `pnpm typecheck`.

## Peer warnings to keep an eye on

- `@sanity/blueprints@0.27.0` wants `vite >= 8`; workspace resolves `7.3.6`.
  Blueprint validation/deploy is a CLI-time operation — builds pass; revisit
  if deploy misbehaves.
- `@sanity/visual-editing@5.7.3` wants `@sanity/client ^7.24`; workspace has
  `8.8.0`. Visual editing isn't used in v1.

### 6. The entire public site was silently empty — dotted `_id`s

After seeding, the site rendered the empty-archive state despite 16 documents
existing. Debugging ladder: `sanity documents query` saw everything, `curl`
saw zero — because the CLI's `--anonymous` flag still attaches your session
token (verified via `DEBUG=sanity*` request logging). The anonymous API
returned `omitted: [{reason: "permission"}]` per document.

Root cause: **document `_id`s containing `.` are namespaced and invisible to
anonymous reads**, even in a public dataset. Every seed id was dotted
(`incident.clk-00`). Renamed all seed ids to hyphenated form, recreated the
dataset, re-imported — public queries immediately returned content.

### 7. The review Function missed a decision — stale-read + idempotency

First end-to-end test: publish `changesRequested` (round 2) → status flipped
in ~10s. Publish `approved` (round 3) → nothing. The function fired but
patched nothing: the document event arrives **before the new doc is visible
in the query index**, so `order(round desc)[0]` returned the *older* review —
whose decision already matched the stored status → the idempotency check
skipped the patch permanently. No retry heals a stale-read no-op.

Fix: union the firing document (`event.data`) into the decided-review set —
the event payload is authoritative even when the index lags. Added
`console.log` lines since invocation logs otherwise show only "started".
Verified: round-4 publish flipped `reviewStatus` back to `approved` and the
patch log line appears in `sanity functions logs`.

## Environment reality check

This machine shipped Node 20.16; Sanity tooling needs ≥22.12 and Functions
target Node 24. Used a standalone Node 24.21.0 distribution
(`~/.local/node24`) since no version manager was installed.

## What's verified vs. pending

Verified: content-model tests (11), `tsc` across all packages incl.
blueprint/function, `astro check` (0/0/0), `astro build`, `sanity build`
(studio + editor).

Pending real credentials: seeding, live App SDK sync in two windows,
review round-trip through the deployed Function, hosted URLs.

## Representative prompts

The schema was designed up front (the plan in `docs/plans/`), so prompts went
to: scaffold monorepo; write schema + validator + seed docket; build the
Studio actions; build the Astro reader; build the App SDK board; then a long
tail of "typecheck fails with X — here's the real signature, fix it."
