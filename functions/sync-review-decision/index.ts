/**
 * sync-review-decision — watches published `review` documents and mirrors the
 * latest decided outcome onto the parent `caseFile`. A decision only counts
 * when committed: the trigger fires on publish, not drafts.
 *
 * Idempotent by construction: the patch is skipped when the stored status
 * already matches the latest decided review, so replays and re-publishes are
 * no-ops. The Function writes caseFile, never review, so it cannot retrigger
 * itself (the blueprint filter matches `_type == "review"`).
 */
import {createClient} from '@sanity/client'
import {documentEventHandler} from '@sanity/functions'

const STATUS_BY_DECISION: Record<string, 'approved' | 'changesRequested'> = {
  approved: 'approved',
  changesRequested: 'changesRequested',
}

interface ReviewEvent {
  _id: string
  caseId?: string
  decision?: string
  decidedAt?: string
  round?: number
}

export const handler = documentEventHandler<ReviewEvent>(async ({context, event}) => {
  const {caseId, decision} = event.data
  if (!caseId || !(decision && decision in STATUS_BY_DECISION)) return

  const client = createClient({
    ...context.clientOptions,
    apiVersion: '2026-09-01',
    useCdn: false,
    perspective: 'published',
  })

  // Trust the newest decided review, not just the firing document — a curator
  // may republish an older round.
  const latest = await client.fetch<{
    _id: string
    decision: keyof typeof STATUS_BY_DECISION
    decidedAt?: string
  } | null>(
    `*[_type == "review" && caseFile._ref == $caseId && decision in ["approved", "changesRequested"]]
      | order(round desc)[0]{_id, decision, decidedAt}`,
    {caseId},
  )
  if (!latest) return

  const status = STATUS_BY_DECISION[latest.decision]
  const current = await client.fetch<{reviewStatus?: string; latestReview?: string} | null>(
    `*[_id == $id][0]{reviewStatus, "latestReview": latestReview._ref}`,
    {id: caseId},
  )
  if (current?.reviewStatus === status && current.latestReview === latest._id) return

  await client
    .patch(caseId)
    .set({
      reviewStatus: status,
      latestReview: {_type: 'reference', _ref: latest._id},
      reviewedAt: latest.decidedAt ?? new Date().toISOString(),
    })
    .commit()
})
