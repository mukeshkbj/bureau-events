import {
  useDocument,
  useEditDocument,
  type DocumentHandle,
  type SanityDocument,
} from '@sanity/sdk-react'

type ArtifactDoc = SanityDocument & {
  title?: string
  artifactCode?: string
  kind?: string
  caption?: string
  spec?: string
}

export function ArtifactEditor({artifactHandle}: {artifactHandle: DocumentHandle}) {
  const {data: doc} = useDocument<ArtifactDoc>({...artifactHandle})
  const edit = useEditDocument<ArtifactDoc>(artifactHandle)

  const set = (patch: Partial<ArtifactDoc>) => edit((prev: ArtifactDoc) => ({...prev, ...patch}))

  return (
    <div className="artifact-panel">
      <div className="field">
        <label>Artifact title</label>
        <input type="text" value={doc?.title ?? ''} onChange={(e) => set({title: e.currentTarget.value})} />
      </div>
      <div className="field">
        <label>Artifact code</label>
        <input
          type="text"
          value={doc?.artifactCode ?? ''}
          onChange={(e) => set({artifactCode: e.currentTarget.value})}
        />
      </div>
      <div className="field">
        <label>Kind</label>
        <select value={doc?.kind ?? 'memo'} onChange={(e) => set({kind: e.currentTarget.value})}>
          <option value="memo">memo</option>
          <option value="photograph">photograph</option>
          <option value="instrument">instrument</option>
          <option value="specimen">specimen</option>
        </select>
      </div>
      <div className="field">
        <label>Caption</label>
        <textarea
          style={{minHeight: '3rem'}}
          value={doc?.caption ?? ''}
          onChange={(e) => set({caption: e.currentTarget.value})}
        />
      </div>
      <div className="field">
        <label>Registry spec</label>
        <textarea
          style={{minHeight: '3rem'}}
          value={doc?.spec ?? ''}
          onChange={(e) => set({spec: e.currentTarget.value})}
        />
      </div>
    </div>
  )
}
