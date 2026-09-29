/**
 * Deterministic seed for the launch docket. Idempotent — fixed document IDs
 * mean re-running just overwrites the same documents. Creates published docs
 * directly (no drafts) so the public reader works immediately after deploy.
 *
 * Usage:
 *   SANITY_TOKEN=... PUBLIC_SANITY_PROJECT_ID=... pnpm -F @bureau/content-model seed
 */
import {createClient, type IdentifiedSanityDocumentStub} from '@sanity/client'
import {seedArtifacts, seedCaseFile, seedIncidents, seedReview} from './seed-data'

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID ?? process.env.SANITY_STUDIO_PROJECT_ID
const dataset = process.env.PUBLIC_SANITY_DATASET ?? process.env.SANITY_STUDIO_DATASET ?? 'production'
const token = process.env.SANITY_TOKEN ?? process.env.SANITY_API_WRITE_TOKEN

if (!token) {
  // No write token — emit NDJSON instead so `sanity dataset import` can apply
  // the seed with the CLI's own session auth. Run:
  //   pnpm -F @bureau/content-model exec tsx src/seed.ts > seed.ndjson
  //   sanity dataset import seed.ndjson --dataset production
  const docs = [...seedArtifacts, ...seedIncidents, seedCaseFile, seedReview]
  for (const doc of docs) process.stdout.write(JSON.stringify(doc) + '\n')
  process.exit(0)
}

if (!projectId) {
  console.error('Missing env: set PUBLIC_SANITY_PROJECT_ID')
  process.exit(1)
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2026-09-01',
  token,
  useCdn: false,
  perspective: 'published',
})

const docs = [...seedArtifacts, ...seedIncidents, seedCaseFile, seedReview]

// createOrReplace keeps this re-runnable: same IDs, latest content wins.
const tx = client.transaction()
for (const doc of docs) tx.createOrReplace(doc as IdentifiedSanityDocumentStub)

const result = await tx.commit()
console.log(`Seeded ${docs.length} documents into ${projectId}/${dataset}`)
console.log(`transactionId: ${result.transactionId}`)
