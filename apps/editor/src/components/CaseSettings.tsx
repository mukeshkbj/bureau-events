import {useState} from 'react'
import {
  useClient,
  useDocument,
  useEditDocument,
  useQuery,
  type DocumentHandle,
  type SanityDocument,
} from '@sanity/sdk-react'
import {caseDescendantIdsQuery} from '@bureau/content-model/queries'

type CaseDoc = SanityDocument & {
  title?: string
  slug?: {_type: 'slug'; current: string}
  docketNumber?: string
  dek?: string
  premise?: string
  sigil?: string
  publishedAt?: string
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export function CaseSettings({caseHandle, onDeleted}: {caseHandle: DocumentHandle; onDeleted: () => void}) {
  const {data: doc} = useDocument<CaseDoc>({...caseHandle})
  const edit = useEditDocument<CaseDoc>(caseHandle)
  const client = useClient({apiVersion: '2026-09-01'})
  const {data: descendants} = useQuery<string[]>({
    query: caseDescendantIdsQuery,
    params: {caseId: caseHandle.documentId},
  })
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const set = (patch: Partial<CaseDoc>) => edit((prev: CaseDoc) => ({...prev, ...patch}))

  const docketOk = /^BAH-\d{4}$/.test(doc?.docketNumber ?? '')

  const deleteDocket = async () => {
    setDeleting(true)
    try {
      const ids = [caseHandle.documentId, ...(descendants ?? [])]
      const tx = client.transaction()
      for (const id of ids) {
        tx.delete(id)
        tx.delete(`drafts.${id}`)
      }
      await tx.commit()
      onDeleted()
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className="diagnostics case-settings">
      <div className="settings-grid">
        <div className="field">
          <label>Title</label>
          <input type="text" value={doc?.title ?? ''} onChange={(e) => set({title: e.currentTarget.value})} />
        </div>
        <div className="field">
          <label>Docket number (BAH-####)</label>
          <input
            type="text"
            value={doc?.docketNumber ?? ''}
            onChange={(e) => set({docketNumber: e.currentTarget.value})}
            style={docketOk ? undefined : {borderColor: 'var(--red)'}}
          />
        </div>
        <div className="field">
          <label>Slug (public route)</label>
          <input
            type="text"
            value={doc?.slug?.current ?? ''}
            onChange={(e) => set({slug: {_type: 'slug', current: slugify(e.currentTarget.value)}})}
          />
        </div>
        <div className="field">
          <label>Sigil</label>
          <select value={doc?.sigil ?? 'seal'} onChange={(e) => set({sigil: e.currentTarget.value})}>
            <option value="seal">seal</option>
            <option value="orbit">orbit</option>
            <option value="wave">wave</option>
          </select>
        </div>
        <div className="field span2">
          <label>Dek (index card line)</label>
          <input type="text" value={doc?.dek ?? ''} onChange={(e) => set({dek: e.currentTarget.value})} />
        </div>
        <div className="field span2">
          <label>Premise (the counterfactual)</label>
          <textarea
            style={{minHeight: '4.5rem'}}
            value={doc?.premise ?? ''}
            onChange={(e) => set({premise: e.currentTarget.value})}
          />
        </div>
      </div>
      <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem'}}>
        <button className="btn ghost small" onClick={() => set({publishedAt: new Date().toISOString()})}>
          Stamp publish date
        </button>
        <span style={{fontFamily: 'var(--mono)', fontSize: '0.68rem', color: 'var(--muted)'}}>
          {doc?.publishedAt ? `Published ${new Date(doc.publishedAt).toLocaleDateString()}` : 'No publish date on file'}
        </span>
      </div>
      <div className="section-label">Danger zone</div>
      {confirmDelete ? (
        <div className="danger-box">
          <p>
            Removes this docket and {(descendants ?? []).length} linked document(s) — incidents, artifacts, and
            reviews all go.
          </p>
          <div style={{display: 'flex', gap: '0.4rem'}}>
            <button className="btn danger small" disabled={deleting} onClick={() => void deleteDocket()}>
              {deleting ? 'Destroying…' : 'Confirm destruction'}
            </button>
            <button className="btn ghost small" disabled={deleting} onClick={() => setConfirmDelete(false)}>
              Keep the docket
            </button>
          </div>
        </div>
      ) : (
        <button className="btn danger small" onClick={() => setConfirmDelete(true)}>
          Destroy docket
        </button>
      )}
    </div>
  )
}
