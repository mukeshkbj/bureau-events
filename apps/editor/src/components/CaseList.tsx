import {Suspense} from 'react'
import {
  useDocumentProjection,
  useDocuments,
  type DocumentHandle,
} from '@sanity/sdk-react'

interface CaseRow {
  title?: string
  docketNumber?: string
  reviewStatus?: string
}

function CaseRowButton({
  handle,
  selected,
  onSelect,
}: {
  handle: DocumentHandle
  selected: boolean
  onSelect: (h: DocumentHandle) => void
}) {
  const {data} = useDocumentProjection<CaseRow>({
    ...handle,
    projection: `{title, docketNumber, reviewStatus}`,
  })
  const row = data ?? {}
  return (
    <button className={`case-row${selected ? ' selected' : ''}`} onClick={() => onSelect(handle)}>
      <span className="docket">{row.docketNumber ?? 'BAH-????'}</span>
      <span className="name">{row.title ?? 'Untitled case'}</span>
      <span className="status">
        <span className={`status-pill ${row.reviewStatus ?? ''}`}>{row.reviewStatus ?? 'draft'}</span>
      </span>
    </button>
  )
}

export function CaseList({
  selected,
  onSelect,
}: {
  selected: DocumentHandle | null
  onSelect: (h: DocumentHandle) => void
}) {
  const {data, hasMore, isPending, loadMore} = useDocuments({
    documentType: 'caseFile',
    batchSize: 25,
    orderings: [{field: '_createdAt', direction: 'desc'}],
  })

  return (
    <>
      {(data ?? []).map((handle) => (
        <Suspense key={handle.documentId} fallback={<div className="case-row">…</div>}>
          <CaseRowButton handle={handle} selected={selected?.documentId === handle.documentId} onSelect={onSelect} />
        </Suspense>
      ))}
      {hasMore && (
        <button className="case-row" onClick={() => loadMore()} disabled={isPending}>
          {isPending ? 'Loading…' : 'Load more'}
        </button>
      )}
    </>
  )
}
