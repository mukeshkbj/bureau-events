import {useMemo, useState} from 'react'
import {
  publishDocument,
  useApplyDocumentActions,
  useCreateDocument,
  useQuery,
  type DocumentHandle,
  type SanityDocument,
} from '@sanity/sdk-react'
import {docketNumbersQuery} from '@bureau/content-model/queries'

type CaseDoc = SanityDocument & {
  title?: string
  slug?: {_type: 'slug'; current: string}
  docketNumber?: string
  sigil?: string
  reviewStatus?: string
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export function NewDocketButton({onCreated}: {onCreated: (h: DocumentHandle) => void}) {
  const {data: numbers} = useQuery<string[]>({query: docketNumbersQuery, params: {}})
  const createCase = useCreateDocument<CaseDoc>({documentType: 'caseFile'})
  const apply = useApplyDocumentActions()
  const [busy, setBusy] = useState(false)

  const nextDocket = useMemo(() => {
    const max = Math.max(
      0,
      ...(numbers ?? [])
        .map((n) => parseInt(String(n).replace(/^BAH-/, ''), 10))
        .filter((v) => Number.isFinite(v)),
    )
    return `BAH-${String(max + 1).padStart(4, '0')}`
  }, [numbers])

  const add = async () => {
    setBusy(true)
    try {
      const suffix = crypto.randomUUID().slice(0, 8)
      const handle = await createCase(
        {
          title: 'Untitled docket',
          docketNumber: nextDocket,
          slug: {_type: 'slug', current: `untitled-docket-${suffix}`},
          sigil: 'seal',
          reviewStatus: 'draft',
        } as Partial<Omit<CaseDoc, '_id' | '_type' | '_rev' | '_createdAt' | '_updatedAt'>>,
        {documentId: `casefile-${suffix}`},
      )
      await apply(publishDocument(handle))
      onCreated({documentId: handle.documentId, documentType: 'caseFile'})
    } finally {
      setBusy(false)
    }
  }

  return (
    <button className="new-docket" disabled={busy} onClick={() => void add()}>
      {busy ? 'Filing…' : `+ File new docket (${nextDocket})`}
    </button>
  )
}
