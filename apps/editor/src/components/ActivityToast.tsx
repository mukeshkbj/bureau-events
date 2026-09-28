import {useCallback, useRef, useState} from 'react'
import {useDocumentEvent, type DocumentEvent} from '@sanity/sdk-react'

/**
 * Flashes a toast whenever a document action resolves in this app session.
 * In a second open window it also surfaces remote mutations — cheap, visible
 * proof of the real-time pipeline for the demo.
 */
export function ActivityToast() {
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback((text: string) => {
    setMessage(text)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setMessage(null), 2500)
  }, [])

  useDocumentEvent({
    onEvent: useCallback(
      (event: DocumentEvent) => {
        const docType = 'documentType' in event ? event.documentType : undefined
        if (typeof docType !== 'string' || docType.startsWith('sanity.')) return
        const verbs: Record<string, string> = {
          created: 'Filed',
          updated: 'Updated',
          deleted: 'Removed',
          published: 'Published',
          documentCreated: 'Filed',
          documentUpdated: 'Updated',
          documentDeleted: 'Removed',
          documentPublished: 'Published',
        }
        show(`${verbs[event.type] ?? 'Changed'} a ${docType}`)
      },
      [show],
    ),
  })

  return message ? <div className="toast">{message}</div> : null
}
