/**
 * sync-review-decision — watches published `review` documents and mirrors the
 * latest decided outcome onto the parent `caseFile`. A decision only counts
 * when committed: the trigger fires on publish, not drafts.
 *
 * Delivery is at-least-once AND the query index can lag the event. Folding the
 * firing document (event.data) into the round comparison keeps a stale read
 * from being mistaken for an idempotent no-op — the classic failure mode where
 * the newest review hasn't hit the index yet and the patch is skipped forever.
 * The Function writes caseFile, never review, so it cannot retrigger itself
 * (the blueprint filter matches `_type == "review"`).
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

interface DecidedReview {
  _id: string
  decision: keyof typeof STATUS_BY_DECISION
  decidedAt?: string
  round?: number
}

export const handler = documentEventHandler<ReviewEvent>(async ({context, event}) => {
  const {caseId, decision, _id: firingId, decidedAt, round} = event.data
  if (!caseId || !(decision && decision in STATUS_BY_DECISION)) return

  const client = createClient({
    ...context.clientOptions,
    apiVersion: '2026-09-01',
    useCdn: false,
    perspective: 'published',
  })

  const seen = await client.fetch<DecidedReview[]>(
    `*[_type == "review" && caseFile._ref == $caseId && decision in ["approved", "changesRequested"]]
      {_id, decision, decidedAt, round}`,
    {caseId},
  )

  // The firing doc may not be indexed yet — union it in so it can't be missed.
  const firing: DecidedReview = {
    _id: firingId,
    decision: decision as DecidedReview['decision'],
    decidedAt,
    round,
  }
  const all = [...seen.filter((r) => r._id !== firingId), firing]
  const latest = all.reduce((a, b) => ((b.round ?? 0) > (a.round ?? 0) ? b : a))

  const status = STATUS_BY_DECISION[latest.decision]
  const current = await client.fetch<{reviewStatus?: string; latestReview?: string} | null>(
    `*[_id == $id][0]{reviewStatus, "latestReview": latestReview._ref}`,
    {id: caseId},
  )
  if (current?.reviewStatus === status && current.latestReview === latest._id) {
    console.log(`[sync] no-op: ${caseId} already ${status} via ${latest._id}`)
    return
  }

  await client
    .patch(caseId)
    .set({
      reviewStatus: status,
      latestReview: {_type: 'reference', _ref: latest._id},
      reviewedAt: latest.decidedAt ?? new Date().toISOString(),
    })
    .commit()
  console.log(`[sync] ${caseId} -> ${status} (round ${latest.round}, ${latest._id})`)
})
