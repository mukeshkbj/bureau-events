# Bureau of Almost-Happened Events

A counterfactual story archive built on Sanity. Visitors walk branching incident
reports — each choice is a document reference, each ending a stamp on a case file.
Editors work in a custom real-time board (App SDK) rather than the Studio form.

DEV × Sanity Challenge — Path Two submission.

**DEV post:** https://dev.to/mukeshkbj/bureau-of-almost-happened-events-a-counterfactual-archive-on-a-document-graph-2dc1

## How it works, end to end

The story is a document graph. A `caseFile` is a docket; each `incident` is a
node whose `choices[]` are document references to sibling incidents; `artifact`
and `review` documents hang off the same graph.

```
Author opens Bureau Board ──► + File new docket (auto BAH-XXXX)
        │
        ├──► Docket details: title, slug, premise, sigil
        ├──► + Incident → nodes appear on the graph board
        │       ├── edit report / incident code / order (0 = entry)
        │       ├── wire choices → references to sibling incidents
        │       ├── attach or + New artifact (evidence)
        │       └── mark endings (REPRIEVE / ANOMALY / CATASTROPHE)
        │
        ├──► Graph check flags unreachable nodes, missing targets, no endings
        ├──► Reviews → "Submit for review" creates a review doc (round N)
        ├──► Curator approves or requests changes
        │       └── Function fires → patches caseFile.reviewStatus
        └──► Studio "Publish case graph" → whole graph published in one tx
                     │
        apps/web rebuilds ──► approved dockets appear on the index
                     │
        Reader opens /case/<slug> → picks choices → stamped ending
```

## Using it

**As a reader** — open the site, click a docket card, read the incident report,
press a choice. Evidence cards appear taped into reports; the ROUTE trail shows
the path taken; endings stamp down and offer another path. `#i=<incident-id>`
URLs deep-link into a specific incident.

**As an author** (Bureau Board, via the Sanity dashboard app):

1. `+ File new docket` in the left rail creates and selects a docket.
2. **Docket details** sets title, slug, dek, premise, sigil (the slug is what
   makes the public `/case/<slug>` route work).
3. **+ Incident** creates a published node; on an empty graph it auto-becomes
   the entry (`order: 0`). Click a node to edit it in the drawer — or use
   **+ New incident linked from here** to grow a branch with the choice already
   wired.
4. **Evidence** attaches an existing artifact or creates one inline.
5. **Danger zones** strike cleanly: deleting an incident unthreads every
   choice pointing at it in the same transaction; destroying a docket removes
   its incidents, artifacts, and reviews together.
6. **Reviews** submits a round; a curator decides; the Function flips
   `reviewStatus` automatically.

**As a curator** — Studio or the Board's review panel: read the author's note,
walk the graph, Approve or Request changes. Approval plus the
**Publish case graph** action ships it; the next static build picks it up.

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

The static site is pre-rendered. A Sanity webhook fires on any published
change to `caseFile`/`incident`/`artifact`/`review`, dispatches
`repository_dispatch` to GitHub, and `.github/workflows/rebuild-on-sanity.yml`
rebuilds `apps/web` and deploys to Cloudflare Pages. Manual fallback:
`npx wrangler pages deploy apps/web/dist --project-name bureau-events`.
