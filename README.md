# Bureau of Almost-Happened Events

A counterfactual story archive built on Sanity. Visitors walk branching incident
reports — each choice is a document reference, each ending a stamp on a case file.
Editors work in a custom real-time board (App SDK) rather than the Studio form.

DEV × Sanity Challenge — Path Two submission.

## Layout

```
apps/web         Astro 7 static site — the public reader
apps/editor      App SDK app ("Bureau Board") — live graph editor, review queue
apps/studio      Sanity Studio v6 — structure, validation, publish actions
packages/        content-model — schemas, queries, graph validation, seed
functions/       Sanity Function syncing review decisions to caseFile
```

## Setup

Requires Node 24+ and pnpm.

```sh
pnpm install
cp .env.example .env   # fill in projectId/dataset/tokens
pnpm typecheck
pnpm test
```

Run the apps:

```sh
pnpm dev:web       # http://localhost:4321
pnpm dev:editor    # http://localhost:3333 (open via Sanity Dashboard link it prints)
pnpm dev:studio    # http://localhost:3333/studio or deploy with `npx sanity deploy`
```

Seed the launch docket — either with a write token, or via `dataset import`
which reuses your `sanity login` session (no token needed):

```sh
# Option A: token
SANITY_TOKEN=... pnpm seed

# Option B: CLI session
cd packages/content-model && npx tsx src/seed.ts > seed.ndjson && cd ../../apps/studio
npx sanity dataset import ../../packages/content-model/seed.ndjson --dataset production
```

Important: document `_id`s must not contain `.` — dotted IDs are namespaced
and invisible to anonymous reads, which silently empties the public site.

## Content model

`caseFile` — a docket: title, premise, slug, review state.
`incident` — one node in the branching report; `order == 0` is the entry point;
`choices[]` hold `next` references to sibling incidents; empty choices must be
`ending.isEnding`.
`artifact` — evidence rendered as generated SVG in the reader.
`review` — append-only approval trail. A Sanity Function watches published
reviews and syncs `decision` back to `caseFile.reviewStatus`.

Publish rule: only `reviewStatus == 'approved'` cases (and their published
incidents) reach the public site. `PublishCaseGraphAction` publishes the whole
graph in one transaction.

## Deploy

After `npx sanity login` and filling `.env`:

```sh
pnpm -F @bureau/studio deploy       # Studio → bureau-events.sanity.studio
pnpm -F @bureau/editor deploy      # Bureau Board → Sanity dashboard app
npx sanity blueprints init --project-id <id> --stack-name bureau-events  # once
npx sanity blueprints deploy       # provisions the sync-review-decision Function
# then seed (see above)
```

Add the app origins (`http://localhost:3333`, `http://localhost:4321`, deployed
hosts) under **API → CORS** in the project settings so the App SDK app can
authenticate.

The static site is pre-rendered: rebuild `apps/web` on publish (webhook →
deploy hook) to pick up newly approved dockets.
