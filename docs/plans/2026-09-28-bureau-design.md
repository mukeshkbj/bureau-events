# Bureau of Almost-Happened Events — Design & Implementation Plan

A DEV × Sanity Challenge (Path Two) submission: an interactive counterfactual story archive — a public Astro reader, a real-time App SDK editorial board, a customized Studio, a review pipeline backed by a Sanity Function, and an honest build writeup.

**Deadline:** October 4, 2026, 11:59 PM PDT (6 days from planning date).

## Locked decisions

| Decision | Choice |
|---|---|
| Concept | Almost-Happened Events (branching incident reports) |
| Deliverable | Working app + deployment + submission writeup |
| Sanity | New project, from scratch |
| Review model | Simple review as data + Function sync (native Workflows = stretch only) |
| Repo shape | pnpm monorepo |
| Public frontend | Astro 7, static |
| Visual language | Archive noir: case files, warm paper, one red accent |
| Media | Code-made visuals (generated SVG/CSS evidence, no image service) |

## Why this concept wins

- **Sanity is load-bearing, not decorative.** The story is a directed graph of documents; the app only works because content is structured. Judges explicitly reward "thoughtfulness of the schema."
- **App SDK is the star.** The editorial interface is an investigation board where incident nodes update live — a genuinely custom app, not a read-only frontend.
- **Workflow as data.** `review` documents + a Document Function model a real process (submit → approve/reject → publish) next to the content. It's honest about being a lightweight model, not the early-access Workflows engine — the writeup gains credibility for knowing the difference.
- **Original + strange.** A counterfactual archive beats every blog template on creativity.

## Environment prerequisites

Verified on this machine:

| Tool | Present | Required | Action |
|---|---|---|---|
| Node | v20.16.0 | ≥22.12 (sanity 6, astro-portabletext), 24 for Functions | Install Node 24 via fnm/nvm-windows/Volta; `.nvmrc` = `24`, `engines.node` = `>=24` |
| pnpm | 9.15.9 | — | `packageManager: "pnpm@9.15.9"` |
| git | 2.46 | — | `git init` at `D:\Sanity Devto` |
| Sanity account | none | org + project + deploy rights | Human step: `npx sanity login` (browser auth) |

Package versions verified on npm (2026-09-28): `sanity 6.16.0`, `@sanity/astro 3.5.1`, `@sanity/sdk`/`@sanity/sdk-react 3.5.0` (already resolves `@sanity/mutate ^0.18.2` — **no mutate override needed**), `@sanity/client 8.8.0`, `@sanity/blueprints 0.27.0`, `@sanity/functions 1.8.0`, `astro 7.3.5`. React `^19.2.2` + `styled-components ^6.1.15` required by `sanity` peers.

## Repo layout

```
D:\Sanity Devto\
  package.json              private root, workspace scripts, engines>=24
  pnpm-workspace.yaml       apps/*, packages/*
  .nvmrc  .gitignore  .env.example  README.md
  sanity.blueprint.ts       Function definitions
  functions/
    sync-review-decision/index.ts
  apps/
    web/                    Astro 7 static site
    editor/                 App SDK app ("Bureau Board")
    studio/                 Sanity Studio v6
  packages/
    content-model/          schemas, GROQ queries, types, seed, graph validation
  docs/
    plans/2026-09-28-bureau-design.md   (this file)
    build-log.md            dated build journal for the writeup
```

## Content model (`packages/content-model`)

### `caseFile` (document)

| Field | Type | Notes |
|---|---|---|
| `title` | string | required |
| `slug` | slug | required, unique |
| `docketNumber` | string | required, e.g. `BAH-0001` |
| `dek` | string | one-line premise for cards |
| `premise` | text | the counterfactual |
| `reviewStatus` | string list | `draft` / `inReview` / `changesRequested` / `approved`; `readOnly` in Studio — set by actions + Function |
| `latestReview` | reference → review | `readOnly` |
| `reviewedAt` | datetime | `readOnly` |
| `sigil` | string list | `orbit` / `seal` / `wave` — drives generated SVG cover mark |
| `publishedAt` | datetime | set by publish action |

### `incident` (document)

| Field | Type | Notes |
|---|---|---|
| `title` | string | required |
| `incidentCode` | string | required, e.g. `CLK-01` |
| `caseFile` | reference → caseFile | required |
| `report` | text | narrative (plain text — see trade-off note) |
| `evidence` | reference → artifact | optional |
| `choices` | array of objects | `{label: string (req), consequenceNote: string, next: reference → incident}` max 4 |
| `ending` | object | `{isEnding: boolean, designation: string, epilogue: text}` |
| `order` | number | required; `order == 0` = entry point |

### `artifact` (document)

`title`, `artifactCode`, `kind` (`photograph`/`instrument`/`memo`/`specimen`), `caption` text, `spec` text, `caseFile` reference. Rendered as generated SVG evidence cards keyed by `kind` + `artifactCode` — no image service needed.

### `review` (document)

| Field | Type | Notes |
|---|---|---|
| `caseFile` | reference → caseFile | required |
| `round` | number | required, increments per submission |
| `authorNote` | text | why it's ready |
| `decision` | string list | `pending` / `approved` / `changesRequested`, default `pending` |
| `decisionNote` | text | curator feedback |
| `decidedAt` | datetime | set on decision |
| `reviewer` | string | curator name (no user model in v1) |

**Why `review` is a separate document:** append-only audit trail, unlimited rounds, and a clean Function trigger. It demos "process modeled as data next to content" without betting the deadline on early-access Workflows (pre-1.0, self-hosted runtime required, guards not lake-enforced yet — all cited in the writeup).

**`report` as `text`, not Portable Text:** the App SDK live-edit demo needs reliable per-field editing. A textarea edits `text` trivially; Portable Text needs the SDK Value Plugin and more surface. Trade-off recorded honestly in the writeup.

## Graph rules + validation (`validate-graph.ts`)

Pure TS, unit-tested, reused by editor Diagnostics panel and a build-time check:

- Exactly one `order == 0` incident per case (entry point).
- `choices` empty ⇔ `ending.isEnding == true`.
- Every `next` reference resolves to an incident in the same case.
- All incidents reachable from entry; at least one terminal ending exists.
- Duplicate `incidentCode`s and duplicate choice labels flagged.
- Cycles allowed (time-loop narratives) — reader caps at 24 steps then offers restart.

## App: `apps/web` — public reader (Astro 7, `output: 'static'`)

- `astro.config.mjs`: `sanity({projectId, dataset, apiVersion: '2026-09-01', useCdn: false})` — `useCdn: false` is correct for static builds (freshest data at build time). No `react()` needed; Studio is deployed separately, not embedded.
- `src/env.d.ts`: `/// <reference types="@sanity/astro/module" />`
- Routes:
  - `/` — approved case index: `*[_type=="caseFile" && reviewStatus=="approved"] | order(publishedAt desc)`.
  - `/case/[slug]` — `getStaticPaths` over approved cases; fetch full graph in one query:

```groq
*[_type == "caseFile" && slug.current == $slug && reviewStatus == "approved"][0]{
  title, docketNumber, dek, premise, slug,
  sigil, publishedAt,
  "incidents": *[_type == "incident" && caseFile._ref == ^._id]
    | order(order asc){
      _id, incidentCode, title, report, order,
      choices[]{label, consequenceNote, "nextId": next._ref},
      ending,
      "artifact": evidence->{artifactCode, kind, caption, spec}
    }
}
```

  Drafts excluded automatically (published perspective).
  - `/about` — "How the Bureau files reality": renders the schema/model story for judges.

- Reader: one `.astro` component serializes the graph JSON into `<script type="application/json">`; a small vanilla TS module (no framework) runs the state machine — incident panel, choice buttons, path breadcrumbs, ending card with designation stamp, restart, `#i=<incidentId>` hash for shareable position.
- Design tokens: `--paper: #f4efe6`, `--ink: #17150f`, `--accent: #a33b2a`; serif display, mono for codes/labels, ruled-paper texture via CSS gradients, rubber-stamp styles for designations. Entrance fades only; `prefers-reduced-motion` honored.
- Generated evidence: `EvidenceCard.astro` renders SVG per `artifact.kind` (photograph frame, instrument dial, memo paper, specimen jar).

## App: `apps/editor` — Bureau Board (App SDK)

Scaffold with `npx sanity@latest init --template app-quickstart` or hand-write the three config files (contents in plan below, from docs).

- `sanity.cli.ts`: `app.organizationId` (filled after org creation), `app.entry: './src/App.tsx'`, `app.title: 'Bureau Board'`, `deployment.appId` after first deploy.
- `src/App.tsx`: `<SanityApp config={[{projectId, dataset: 'production'}]} fallback={<Loading/>}>`.
- Components:
  - `CaseList` — `usePaginatedDocuments({documentType: 'caseFile'})`; each row uses `useDocumentProjection` `{title, docketNumber, reviewStatus}` inside its own `<Suspense>` (per SDK best practices: handles first, per-item fetches, liberal Suspense).
  - `CaseBoard` — incident nodes for the selected case laid out as a branching diagram (computed layering from entry). Each `IncidentNode` = `useDocumentProjection` `{incidentCode, title, 'isEnding': ending.isEnding, 'choiceTargets': choices[].next._ref}` + CSS/SVG edges.
  - `IncidentEditor` — selected node's detail drawer: `useDocument` + `useEditDocument` per field (title, incidentCode, report textarea, evidence ref, ending). Live, optimistic, multiplayer by construction.
  - `ChoicesEditor` — edit choice labels live; `next` as dropdown of the case's incident handles; "New incident" via `useCreateDocument` (pre-fills `caseFile` ref, appended as choice target via functional `useEditDocument`).
  - `Diagnostics` — runs `validate-graph.ts` against live projections; stamps nodes red/amber.
  - `ReviewPanel` — reviews for the case via `useQuery`; author action "Submit for review" → `useCreateDocument` (`{caseFile, round: max+1, decision: 'pending'}`) + `useEditDocument` sets `caseFile.reviewStatus = 'inReview'`; curator buttons "Approve" / "Request changes" → edit review draft fields then `useApplyDocumentActions(publishDocument(reviewHandle))`.
  - `ActivityToast` — `useDocumentEvent` flashes "Case updated" when another editor's mutation lands (cheap, visible real-time proof in the demo video).
- Auth: Dashboard stamped-token flow (automatic inside the Dashboard iframe; Safari caveat → develop in Chrome).
- Deploy: `npx sanity deploy --title "Bureau Board"` — needs org admin/Developer role or org robot token with "Manage SDK Apps".

## App: `apps/studio` — Sanity Studio v6

- `sanity.config.ts`: `structureTool` with custom structure —
  - "Active dockets": caseFile lists bucketed by `reviewStatus` (`S.documentTypeList('caseFile').filter('reviewStatus == $s')`).
  - "Case contents": selecting a case shows its incidents/artifacts via `S.documentTypeList('incident').filter('caseFile._ref == $caseId').params({caseId})`.
  - "Review queue": `review` where `decision == 'pending'`.
  - `S.initialValueTemplate('incident-in-case')` pre-fills `caseFile._ref` when creating an incident from inside a case.
- Custom document actions on `caseFile`:
  - `SubmitForReviewAction` — visible when `reviewStatus in ('draft','changesRequested')`; creates the `review` doc and sets `reviewStatus = 'inReview'`.
  - `PublishCaseGraphAction` — visible when `reviewStatus == 'approved'`; in one Actions API transaction publishes the caseFile draft **plus every `drafts.*` incident and artifact belonging to it** plus the approved review — single click, all-or-nothing. Implemented with `useClient({apiVersion: '2026-09-01'})`, GROQ for draft IDs, `client.request({uri: '/data/actions/...', body: {actions: [...]}})` (`sanity.action.document.publish` per doc). Prevents the classic failure where a published case references still-draft incidents.
- Validation per schema table; document-level validation for graph rules that are single-doc (choices empty ⇔ ending).

## Function: `sync-review-decision`

`sanity.blueprint.ts`:

```ts
defineBlueprint({
  resources: [
    defineDocumentFunction({
      name: 'sync-review-decision',
      event: {
        on: ['create', 'update'],
        filter: '_type == "review" && defined(decision) && decision != "pending"',
        projection: '{_id, "caseId": caseFile._ref, decision, decidedAt, round}',
      },
    }),
  ],
})
```

`functions/sync-review-decision/index.ts`:

- `documentEventHandler` → `createClient(context.clientOptions)` (auto editor token).
- Fetch latest decided review for the case: `*[_type=="review" && caseFile._ref==$id && decision!="pending"] | order(round desc)[0]`.
- Patch `caseFile` only when values differ (idempotent, no recursion churn): `reviewStatus` ← `decision`, `latestReview._ref`, `reviewedAt` ← `decidedAt`.
- Fires on published docs only (no `includeDrafts`) — **a decision only counts when committed; that is the approval gate.**
- Local test: `npx sanity functions test sync-review-decision --dataset production --with-user-token`. Deploy: `npx sanity blueprints deploy` (Node 24, `deployStudio` role).

## Seed content (`packages/content-model/seed.ts`)

Deterministic fixed IDs — re-runnable without duplicates. One launch docket:

**BAH-0001 "The Town That Arrived One Minute Late"** — every clock in Marrow's End slips 61 seconds. 10 incidents, 3 endings:
- `CLK-00` entry → 3 branches: Stationmaster investigates / Clockmaker repairs / Prefect exploits.
- Converging paths to endings: `REPRIEVE` (the town resets), `ANOMALY` (Marrow's End stays a minute late forever — tourist attraction), `CATASTROPHE` (the missing minute resurfaces somewhere worse).
- 3 artifacts: "Stopwatch of the Second Son" (instrument), "Timetable CL-4" (memo), "Prefectural Memo 61-B" (memo).
- 1 seeded `review` (decision `approved`, round 1).

Run: `SANITY_TOKEN=... pnpm -F @bureau/content-model seed`.

## TypeGen

`sanity schema extract --enforce-required-fields` in `apps/studio` → `schema.json`; `sanity typegen generate` produces `sanity.types.ts` covering schema types + `defineQuery` GROQ results. Shared by web and editor via `packages/content-model`. Typecheck: `pnpm -r typecheck`.

## Execution sequence

1. **Env + skeleton** — Node 24 active; `git init`; workspace files; `.env.example` (`PUBLIC_SANITY_PROJECT_ID`, `PUBLIC_SANITY_DATASET`, `SANITY_API_READ_TOKEN`, `SANITY_TOKEN`); README.
2. **Sanity project** — human step: `npx sanity login`; `npx sanity init` inside `apps/studio` → record `projectId` in `.env` + all configs. Create `production` dataset; add CORS origins `http://localhost:4321`, `http://localhost:3333`, production web URL (credentials ON — only our domains).
3. **content-model** — schemas, queries, `validate-graph.ts` + Vitest tests (orphan, missing target, no terminal, duplicate codes), seed script.
4. **Studio** — structure, validation, `SubmitForReviewAction`, `PublishCaseGraphAction`; `npx sanity deploy` → `bureau.sanity.studio`.
5. **Seed** — run seed, verify docs in Studio, TypeGen.
6. **Web** — Astro site, case index, `[slug]` graph fetch, reader module, archive-noir CSS, EvidenceCard SVGs; `astro build` green.
7. **Editor** — App SDK scaffold, CaseList → CaseBoard → IncidentEditor → ChoicesEditor → Diagnostics → ReviewPanel → ActivityToast; `npx sanity deploy --title "Bureau Board"`.
8. **Function** — blueprint + handler + local test + deploy.
9. **End-to-end matrix** (below) — fix what breaks.
10. **Polish** — mobile pass, a11y (focus, contrast, reduced motion), 404/empty states, build-log entries, screenshots/GIF of live edit + approve → publish flow.
11. **Submit** — DEV post.

## End-to-end verification matrix

| # | Test | Expected |
|---|---|---|
| 1 | Open editor in two windows; edit title in A | B updates live without refresh |
| 2 | Create incident via editor, link as choice | Appears on board, diagnostics clean |
| 3 | Submit for review | `review` doc pending, `reviewStatus=inReview` |
| 4 | Approve + publish review | Function patches caseFile → `approved` |
| 5 | Reject path | `changesRequested` + note visible in editor; resubmit → round 2 |
| 6 | PublishCaseGraphAction | Case + all incident/artifact drafts publish in one transaction |
| 7 | `astro build` + open case | All 10 incidents traversable, 3 endings render, restart works |
| 8 | Mobile 360px reader | Readable, choices tappable |
| 9 | Delete a `next` target mid-draft | Diagnostics flags it before publish |
| 10 | `pnpm -r typecheck` | Clean |

## Submission checklist

- DEV post via Path Two template, tag `#sanitychallenge`.
- **Sanity project ID** in the post (required — incomplete without it).
- Public site URL + repo link.
- Editor/Studio access note: private by design (Dashboard auth); include demo video/GIF + offer judge invite or test credentials.
- Honest build log: prompts used, what broke (Node engines, real errors), schema iterations, why `review`-as-data over early-access Workflows.
- Optional: exported agent-session transcript, checked for secrets, made public before linking.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Node 20 → 24 on Windows | `.nvmrc`, `engines`, document Volta/fnm; `npx node@24` fallback for one-offs |
| App SDK init is interactive | Hand-write `sanity.cli.ts`/`App.tsx` from docs (exact contents known) |
| Publish gap: case live, incidents draft | Single-transaction `PublishCaseGraphAction` |
| Function needs Node 24 + role | Deploy only after Node switch; test locally first |
| Scope creep (native Workflows, PTE, images) | Explicit stretch list; ship core first |
| Embedding an app transcript | Optional; only if export is clean of tokens/keys |

## Stretch (only after E2E green)

1. Portable Text `report` + SDK Value Plugin live editing.
2. Native Workflows definition replacing `review` docs (document migration honestly).
3. Sanity Function → external API call (e.g. POST artifact card to an image/social endpoint).
4. Generated PNG artifact uploads via `client.assets.upload` in seed.
