import {useState} from 'react'
import {
  publishDocument,
  useApplyDocumentActions,
  useClient,
  useCreateDocument,
  useDocument,
  useEditDocument,
  useQuery,
  type DocumentHandle,
  type SanityDocument,
} from '@sanity/sdk-react'
import type {GraphIncident} from '@bureau/content-model/graph'
import {caseArtifactsQuery} from '@bureau/content-model/queries'
import {ArtifactEditor} from './ArtifactEditor'

interface Choice {
  _key?: string
  label?: string
  consequenceNote?: string
  next?: {_type: 'reference'; _ref: string}
}

interface ArtifactRow {
  _id: string
  artifactCode?: string
  title?: string
  kind?: string
}

type Doc = SanityDocument & {
  title?: string
  incidentCode?: string
  order?: number
  report?: string
  evidence?: {_type: 'reference'; _ref: string}
  ending?: {isEnding?: boolean; designation?: string; epilogue?: string}
  choices?: Choice[]
}

type SiblingIncident = GraphIncident & {
  choiceRefs?: {_key?: string; nextId?: string | null}[]
}

export function IncidentEditor({
  incidentHandle,
  caseHandle,
  siblings,
  onClose,
}: {
  incidentHandle: DocumentHandle
  caseHandle: DocumentHandle
  siblings: SiblingIncident[]
  onClose: () => void
}) {
  const {data: doc} = useDocument<Doc>({...incidentHandle})
  const edit = useEditDocument<Doc>({...incidentHandle})
  const createIncident = useCreateDocument<Doc>({documentType: 'incident'})
  const createArtifact = useCreateDocument<SanityDocument>({documentType: 'artifact'})
  const apply = useApplyDocumentActions()
  const client = useClient({apiVersion: '2026-09-01'})
  const [endingOpen, setEndingOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const {data: artifacts} = useQuery<ArtifactRow[]>({
    query: caseArtifactsQuery,
    params: {caseId: caseHandle.documentId},
  })

  const set = (patch: Partial<Doc>) => edit((prev: Doc) => ({...prev, ...patch}))

  const setEnding = (patch: Partial<NonNullable<Doc['ending']>>) =>
    edit((prev: Doc) => ({...prev, ending: {...(prev.ending ?? {}), ...patch}}))

  const setChoice = (index: number, patch: Partial<Choice>) =>
    edit((prev: Doc) => {
      const choices = (prev.choices ?? []).slice()
      choices[index] = {...choices[index], ...patch}
      return {...prev, choices}
    })

  const addChoice = () =>
    edit((prev: Doc) => ({
      ...prev,
      choices: [...(prev.choices ?? []), {_key: crypto.randomUUID(), label: ''}],
    }))

  const addChoiceTarget = (targetId: string) =>
    edit((prev: Doc) => ({
      ...prev,
      choices: [
        ...(prev.choices ?? []),
        {_key: crypto.randomUUID(), label: '', next: {_type: 'reference', _ref: targetId}},
      ],
    }))

  const removeChoice = (index: number) =>
    edit((prev: Doc) => ({...prev, choices: (prev.choices ?? []).filter((_, i) => i !== index)}))

  const attachArtifact = (artifactId: string) =>
    set(artifactId ? {evidence: {_type: 'reference', _ref: artifactId}} : {evidence: undefined})

  const createEvidenceArtifact = async () => {
    const suffix = crypto.randomUUID().slice(0, 8)
    const handle = await createArtifact(
      {
        title: 'Untitled artifact',
        artifactCode: `ART-${String((artifacts?.length ?? 0) + 1).padStart(2, '0')}`,
        kind: 'memo',
        caseFile: {_type: 'reference', _ref: caseHandle.documentId},
      } as Partial<Omit<SanityDocument, '_id' | '_type' | '_rev' | '_createdAt' | '_updatedAt'>>,
      {documentId: `artifact-${suffix}`},
    )
    await apply(publishDocument(handle))
    attachArtifact(handle.documentId)
  }

  // Doors pointing at this node are unset in the same transaction, so no
  // sibling is left referencing a deleted target.
  const deleteIncident = async () => {
    setDeleting(true)
    try {
      const tx = client.transaction()
      for (const sib of siblings) {
        const keys = (sib.choiceRefs ?? [])
          .filter((c) => c.nextId === incidentHandle.documentId && c._key)
          .map((c) => c._key!)
        if (keys.length > 0) {
          tx.patch(sib._id, {unset: keys.map((k) => `choices[_key=="${k}"]`)})
        }
      }
      tx.delete(incidentHandle.documentId)
      tx.delete(`drafts.${incidentHandle.documentId}`)
      await tx.commit()
      onClose()
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const createLinkedIncident = async () => {
    const handle = await createIncident({
      title: 'Untitled incident',
      incidentCode: 'NEW-??',
      caseFile: {_type: 'reference', _ref: caseHandle.documentId},
      order: (doc?.order ?? 1) + 1,
    } as Partial<Omit<Doc, '_id' | '_type' | '_rev' | '_createdAt' | '_updatedAt'>>)
    await apply(publishDocument(handle))
    addChoiceTarget(handle.documentId)
  }

  const others = siblings.filter((s) => s._id !== incidentHandle.documentId)
  const isEnding = doc?.ending?.isEnding === true

  return (
    <aside className="drawer">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h3>{doc?.incidentCode ?? '…'} — incident</h3>
        <button className="btn ghost small" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="field">
        <label>Title</label>
        <input type="text" value={doc?.title ?? ''} onChange={(e) => set({title: e.currentTarget.value})} />
      </div>
      <div className="field">
        <label>Incident code</label>
        <input type="text" value={doc?.incidentCode ?? ''} onChange={(e) => set({incidentCode: e.currentTarget.value})} />
      </div>
      <div className="field">
        <label>Order (0 = entry)</label>
        <input
          type="number"
          value={doc?.order ?? 0}
          onChange={(e) => set({order: Number(e.currentTarget.value)})}
        />
      </div>
      <div className="field">
        <label>Report</label>
        <textarea value={doc?.report ?? ''} onChange={(e) => set({report: e.currentTarget.value})} />
      </div>

      <div className="section-label" style={{display: 'flex', justifyContent: 'space-between'}}>
        <span>Evidence</span>
        {!doc?.evidence?._ref && (
          <button className="btn small" onClick={() => void createEvidenceArtifact()}>
            + New artifact
          </button>
        )}
      </div>
      {doc?.evidence?._ref ? (
        <>
          <ArtifactEditor artifactHandle={{documentId: doc.evidence._ref, documentType: 'artifact'}} />
          <button className="btn ghost small" onClick={() => attachArtifact('')}>
            Detach evidence
          </button>
        </>
      ) : (
        <div className="field">
          <select value="" onChange={(e) => attachArtifact(e.currentTarget.value)}>
            <option value="">— attach an existing artifact —</option>
            {(artifacts ?? []).map((a) => (
              <option key={a._id} value={a._id}>
                {a.artifactCode ?? '???'} — {a.title ?? 'Untitled'}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="section-label">Ending</div>
      <div className="field">
        <label>
          <input
            type="checkbox"
            checked={isEnding}
            onChange={(e) => setEnding({isEnding: e.currentTarget.checked})}
          />{' '}
          This is an ending
        </label>
      </div>
      {isEnding && (
        <>
          <div className="field">
            <label>Designation</label>
            <select
              value={doc?.ending?.designation ?? 'ANOMALY'}
              onChange={(e) => setEnding({designation: e.currentTarget.value})}
            >
              <option value="REPRIEVE">REPRIEVE</option>
              <option value="ANOMALY">ANOMALY</option>
              <option value="CATASTROPHE">CATASTROPHE</option>
            </select>
          </div>
          <div className="field">
            <label>Epilogue</label>
            <textarea
              style={{minHeight: '4rem'}}
              value={doc?.ending?.epilogue ?? ''}
              onChange={(e) => setEnding({epilogue: e.currentTarget.value})}
            />
          </div>
        </>
      )}

      {!isEnding && (
        <>
          <div className="section-label" style={{display: 'flex', justifyContent: 'space-between'}}>
            <span>Choices</span>
            <button className="btn small" onClick={() => void addChoice()}>
              + Choice
            </button>
          </div>
          {(doc?.choices ?? []).map((choice, i) => (
            <div className="choice-item" key={choice._key ?? i}>
              <div className="row">
                <input
                  type="text"
                  placeholder="Choice label"
                  value={choice.label ?? ''}
                  onChange={(e) => setChoice(i, {label: e.currentTarget.value})}
                />
                <button className="btn danger small" onClick={() => void removeChoice(i)}>
                  ×
                </button>
              </div>
              <div className="row">
                <input
                  type="text"
                  placeholder="Consequence note (optional)"
                  value={choice.consequenceNote ?? ''}
                  onChange={(e) => setChoice(i, {consequenceNote: e.currentTarget.value})}
                />
              </div>
              <div className="row">
                <select
                  value={choice.next?._ref ?? ''}
                  onChange={(e) =>
                    setChoice(
                      i,
                      e.currentTarget.value ? {next: {_type: 'reference', _ref: e.currentTarget.value}} : {next: undefined},
                    )
                  }
                >
                  <option value="">— pick target —</option>
                  {others.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.incidentCode ?? s._id}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
          <button className="btn ghost small" onClick={() => void createLinkedIncident()}>
            + New incident linked from here
          </button>
        </>
      )}

      <div className="section-label" style={{display: 'flex', justifyContent: 'space-between'}}>
        <span>Ending options</span>
        <button className="btn ghost small" onClick={() => setEndingOpen((v) => !v)}>
          {endingOpen ? 'Hide' : 'Show'}
        </button>
      </div>
      {endingOpen && (
        <p style={{color: 'var(--muted)', fontSize: '0.82rem'}}>
          Endings are stamped in the reader as REPRIEVE, ANOMALY, or CATASTROPHE. No Bureau member may create new
          designations.
        </p>
      )}

      <div className="section-label">Danger zone</div>
      {confirmDelete ? (
        <div className="danger-box">
          <p>Removes this incident and unthreads every door that leads to it.</p>
          <div style={{display: 'flex', gap: '0.4rem'}}>
            <button className="btn danger small" disabled={deleting} onClick={() => void deleteIncident()}>
              {deleting ? 'Striking…' : 'Confirm strike'}
            </button>
            <button className="btn ghost small" disabled={deleting} onClick={() => setConfirmDelete(false)}>
              Keep it
            </button>
          </div>
        </div>
      ) : (
        <button className="btn danger small" onClick={() => setConfirmDelete(true)}>
          Strike incident from the record
        </button>
      )}
    </aside>
  )
}
