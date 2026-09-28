import {useState} from 'react'
import {useClient, type DocumentActionComponent, type DocumentActionProps, type SanityDocument} from 'sanity'
import {childDraftsQuery} from '@bureau/content-model/queries'

const API_VERSION = '2026-09-01'
const draftId = (publishedId: string) => `drafts.${publishedId}`

type ReviewStatus = 'draft' | 'inReview' | 'changesRequested' | 'approved' | undefined

const statusOf = (props: Pick<DocumentActionProps, 'draft' | 'published'>): ReviewStatus =>
  ((props.draft as SanityDocument | null)?.reviewStatus ??
    (props.published as SanityDocument | null)?.reviewStatus) as ReviewStatus

/**
 * Submit for review: creates the review document, publishes it (pending), and
 * marks the case draft inReview — one transaction so they can't diverge.
 */
export const submitForReviewAction: DocumentActionComponent = (props) => {
  const client = useClient({apiVersion: API_VERSION})
  const [busy, setBusy] = useState(false)
  const status = statusOf(props)
  if (status !== 'draft' && status !== 'changesRequested' && status !== undefined) return null

  return {
    label: busy ? 'Submitting…' : 'Submit for review',
    disabled: busy || !props.draft,
    onHandle: async () => {
      setBusy(true)
      try {
        const round =
          (await client.fetch<number>(
            `count(*[_type == "review" && caseFile._ref == $caseId])`,
            {caseId: props.id},
          )) + 1
        const reviewId = `review.${props.id}.r${round}`
        await client.request({
          uri: `/data/actions/${client.config().dataset}`,
          method: 'POST',
          body: {
            actions: [
              {
                actionType: 'sanity.action.document.create',
                publishedId: reviewId,
                ifExists: 'ignore',
                attributes: {
                  _id: draftId(reviewId),
                  _type: 'review',
                  caseFile: {_type: 'reference', _ref: props.id},
                  round,
                  decision: 'pending',
                  authorNote: '',
                },
              },
              {actionType: 'sanity.action.document.publish', publishedId: reviewId, draftId: draftId(reviewId)},
              {
                actionType: 'sanity.action.document.edit',
                publishedId: props.id,
                draftId: draftId(props.id),
                patch: {set: {reviewStatus: 'inReview'}},
              },
            ],
          },
        })
      } finally {
        setBusy(false)
        props.onComplete()
      }
    },
  }
}

/**
 * Publish case graph: publishes the case file and every incident/artifact
 * draft belonging to it in a single Actions API transaction. Prevents a
 * published case from pointing at still-draft incidents on the public site.
 */
export const publishCaseGraphAction: DocumentActionComponent = (props) => {
  const client = useClient({apiVersion: API_VERSION}).withConfig({perspective: 'previewDrafts'})
  const [dialog, setDialog] = useState<null | {count: number}>(null)
  const [busy, setBusy] = useState(false)
  if (statusOf(props) !== 'approved') return null

  const run = async () => {
    setBusy(true)
    try {
      const draftIds = (await client.fetch<string[]>(childDraftsQuery, {caseId: props.id})) ?? []
      const publishActions = draftIds.map((id) => ({
        actionType: 'sanity.action.document.publish' as const,
        publishedId: id.replace(/^drafts\./, ''),
        draftId: id,
      }))
      const caseActions = props.draft
        ? [
            {
              actionType: 'sanity.action.document.edit' as const,
              publishedId: props.id,
              draftId: draftId(props.id),
              patch: {set: {publishedAt: new Date().toISOString()}},
            },
            {actionType: 'sanity.action.document.publish' as const, publishedId: props.id, draftId: draftId(props.id)},
          ]
        : []
      await client.request({
        uri: `/data/actions/${client.config().dataset}`,
        method: 'POST',
        body: {actions: [...caseActions, ...publishActions]},
      })
    } finally {
      setBusy(false)
      setDialog(null)
      props.onComplete()
    }
  }

  return {
    label: busy ? 'Publishing…' : 'Publish case + graph',
    onHandle: async () => {
      const draftIds = (await client.fetch<string[]>(childDraftsQuery, {caseId: props.id})) ?? []
      setDialog({count: draftIds.length + (props.draft ? 1 : 0)})
    },
    dialog: dialog && {
      type: 'confirm',
      tone: 'positive',
      message: `Publish the case file and ${dialog.count - (props.draft ? 1 : 0)} child document drafts in one transaction?`,
      onConfirm: run,
      onCancel: () => setDialog(null),
    },
  }
}
