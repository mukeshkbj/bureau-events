import {useState} from 'react'
import {
  createDocumentHandle,
  publishDocument,
  useApplyDocumentActions,
  useCreateDocument,
  useDocumentProjection,
  useEditDocument,
  useQuery,
  type DocumentHandle,
  type SanityDocument,
} from '@sanity/sdk-react'
import {caseReviewsQuery} from '@bureau/content-model/queries'

interface ReviewRow {
  _id: string
  round?: number
  decision?: string
  decisionNote?: string
  decidedAt?: string
  reviewer?: string
  authorNote?: string
  _updatedAt?: string
}

type ReviewDoc = SanityDocument & Partial<Omit<ReviewRow, '_id'>>

export function ReviewPanel({caseHandle}: {caseHandle: DocumentHandle}) {
  const {data: reviews} = useQuery<ReviewRow[]>({
    query: caseReviewsQuery,
    params: {caseId: caseHandle.documentId},
  })
  const {data: caseData} = useDocumentProjection<{reviewStatus?: string}>({
    ...caseHandle,
    projection: `{reviewStatus}`,
  })
  const createReview = useCreateDocument<ReviewDoc>({documentType: 'review'})
  const apply = useApplyDocumentActions()
  const editCase = useEditDocument<SanityDocument>(caseHandle)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const status = caseData?.reviewStatus ?? 'draft'
  const latest = reviews?.[0]
  const pending = latest?.decision === 'pending' ? latest : null

  const submit = async () => {
    setBusy(true)
    try {
      const round = (reviews?.[0]?.round ?? 0) + 1
      const reviewHandle = await createReview(
        {
          caseFile: {_type: 'reference', _ref: caseHandle.documentId},
          round,
          decision: 'pending',
          authorNote: note,
        } as Partial<Omit<ReviewDoc, '_id' | '_type' | '_rev' | '_createdAt' | '_updatedAt'>>,
        {documentId: `review.${caseHandle.documentId}.r${round}`},
      )
      await apply(publishDocument(reviewHandle))
      await editCase((prev) => ({...prev, reviewStatus: 'inReview'}))
      setNote('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="diagnostics" style={{borderColor: 'var(--amber)'}}>
      <div style={{padding: '0.8rem 1rem'}}>
        <div className="section-label" style={{margin: 0}}>
          Review trail
        </div>

        {(status === 'draft' || status === 'changesRequested') && !pending && (
          <div className="field" style={{marginTop: '0.6rem'}}>
            <label>Author's note for round {(reviews?.[0]?.round ?? 0) + 1}</label>
            <textarea
              style={{minHeight: '3rem'}}
              value={note}
              onChange={(e) => setNote(e.currentTarget.value)}
              placeholder="Why is this docket ready to open?"
            />
            <button className="btn" style={{marginTop: '0.4rem'}} disabled={busy} onClick={() => void submit()}>
              {busy ? 'Submitting…' : 'Submit for review'}
            </button>
          </div>
        )}

        {(reviews ?? []).map((r) => (
          <ReviewCard key={r._id} review={r} isLatest={r._id === latest?._id} />
        ))}
        {(reviews ?? []).length === 0 && (
          <p style={{color: 'var(--muted)', fontSize: '0.85rem', marginTop: '0.5rem'}}>No reviews yet.</p>
        )}
      </div>
    </div>
  )
}

function ReviewCard({review, isLatest}: {review: ReviewRow; isLatest: boolean}) {
  const handle = createDocumentHandle({documentId: review._id, documentType: 'review'})
  const editReview = useEditDocument<ReviewDoc>(handle)
  const apply = useApplyDocumentActions()
  const [decisionNote, setDecisionNote] = useState(review.decisionNote ?? '')
  const [reviewer, setReviewer] = useState(review.reviewer ?? '')
  const [busy, setBusy] = useState(false)

  const decide = async (decision: 'approved' | 'changesRequested') => {
    setBusy(true)
    try {
      await editReview((prev) => ({
        ...prev,
        decision,
        decisionNote,
        reviewer,
        decidedAt: new Date().toISOString(),
      }))
      await apply(publishDocument(handle))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="review-card">
      <div className="meta">
        <span>
          Round {review.round ?? '?'} {isLatest && review.decision === 'pending' ? '· awaiting decision' : ''}
        </span>
        <span className={`status-pill ${review.decision === 'approved' ? 'approved' : review.decision === 'changesRequested' ? 'changesRequested' : 'inReview'}`}>
          {review.decision ?? 'pending'}
        </span>
      </div>
      {review.authorNote && <div className="note">“{review.authorNote}”</div>}
      {review.decisionNote && <div className="note" style={{color: 'var(--muted)'}}>{review.decisionNote}</div>}
      {review.reviewer && <div className="meta" style={{marginTop: '0.3rem'}}>— {review.reviewer}</div>}

      {review.decision === 'pending' && isLatest && (
        <div style={{marginTop: '0.5rem'}}>
          <div className="field">
            <label>Reviewer</label>
            <input type="text" value={reviewer} onChange={(e) => setReviewer(e.currentTarget.value)} placeholder="Curator name" />
          </div>
          <div className="field">
            <label>Decision note</label>
            <textarea style={{minHeight: '3rem'}} value={decisionNote} onChange={(e) => setDecisionNote(e.currentTarget.value)} />
          </div>
          <div className="actions" style={{display: 'flex', gap: '0.4rem'}}>
            <button className="btn" disabled={busy} onClick={() => void decide('approved')}>
              Approve
            </button>
            <button className="btn danger" disabled={busy} onClick={() => void decide('changesRequested')}>
              Request changes
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
