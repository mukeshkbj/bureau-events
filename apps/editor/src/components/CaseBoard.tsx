import {useMemo, useState} from 'react'
import {useDocumentProjection, useQuery, type DocumentHandle} from '@sanity/sdk-react'
import {caseBoardQuery} from '@bureau/content-model/queries'
import {computeLayers, diagnoseCase, type GraphIncident} from '@bureau/content-model/graph'
import {IncidentEditor} from './IncidentEditor'
import {ReviewPanel} from './ReviewPanel'

const NODE_W = 190
const NODE_H = 96
const GAP_X = 90
const GAP_Y = 26
const PAD = 32

interface BoardIncident extends GraphIncident {
  title?: string
}

interface Position {
  x: number
  y: number
}

function layout(incidents: BoardIncident[]): Map<string, Position> {
  const layers = computeLayers(incidents)
  const byLayer = new Map<number, BoardIncident[]>()
  const unlayered: BoardIncident[] = []
  for (const inc of incidents) {
    const layer = layers.get(inc._id)
    if (layer === undefined) unlayered.push(inc)
    else {
      const list = byLayer.get(layer) ?? []
      list.push(inc)
      byLayer.set(layer, list)
    }
  }
  const maxLayer = byLayer.size > 0 ? Math.max(...byLayer.keys()) : -1
  if (unlayered.length > 0) byLayer.set(maxLayer + 1, unlayered)

  const positions = new Map<string, Position>()
  for (const [layer, list] of byLayer) {
    list
      .slice()
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
      .forEach((inc, row) => positions.set(inc._id, {x: PAD + layer * (NODE_W + GAP_X), y: PAD + row * (NODE_H + GAP_Y)}))
  }
  return positions
}

export function CaseBoard({caseHandle}: {caseHandle: DocumentHandle}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showReviews, setShowReviews] = useState(false)

  const {data: caseData} = useDocumentProjection<{title?: string; docketNumber?: string; reviewStatus?: string}>({
    ...caseHandle,
    projection: `{title, docketNumber, reviewStatus}`,
  })

  const {data: incidents} = useQuery<BoardIncident[]>({
    query: caseBoardQuery,
    params: {caseId: caseHandle.documentId},
  })
  const nodes = useMemo(() => incidents ?? [], [incidents])
  const diagnostics = useMemo(() => diagnoseCase(nodes), [nodes])
  const positions = useMemo(() => layout(nodes), [nodes])
  const flagged = useMemo(() => {
    const map = new Map<string, 'error' | 'warning'>()
    for (const d of diagnostics) {
      if (!d.incidentId) continue
      if (d.severity === 'error' || !map.has(d.incidentId)) map.set(d.incidentId, d.severity)
    }
    return map
  }, [diagnostics])

  const maxLayer = Math.max(0, ...[...positions.values()].map((p) => p.x))
  const maxRow = Math.max(0, ...[...positions.values()].map((p) => p.y))
  const canvasW = maxLayer + NODE_W + PAD * 2
  const canvasH = maxRow + NODE_H + PAD * 2

  const edges: {key: string; d: string; on: boolean}[] = []
  for (const inc of nodes) {
    const from = positions.get(inc._id)
    if (!from) continue
    for (const target of inc.choiceTargets ?? []) {
      const to = target ? positions.get(target) : undefined
      if (!to) continue
      const x1 = from.x + NODE_W
      const y1 = from.y + NODE_H / 2
      const x2 = to.x
      const y2 = to.y + NODE_H / 2
      const mx = x1 + (x2 - x1) / 2
      edges.push({
        key: `${inc._id}->${target}`,
        d: `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`,
        on: selectedId === inc._id || selectedId === target,
      })
    }
  }

  return (
    <div className="canvas">
      <div className="canvas-head">
        <div>
          <h2>
            {caseData?.docketNumber ?? '…'} — {caseData?.title ?? 'Loading'}
          </h2>
          <div className="sub">
            {nodes.length} incidents ·{' '}
            <span className={`status-pill ${caseData?.reviewStatus ?? ''}`}>{caseData?.reviewStatus ?? 'draft'}</span>
          </div>
        </div>
        <button className="btn" onClick={() => setShowReviews((v) => !v)}>
          {showReviews ? 'Hide reviews' : 'Reviews'}
        </button>
      </div>

      {showReviews && <ReviewPanel caseHandle={caseHandle} />}

      <div className="board-grid" style={{width: canvasW, height: canvasH}}>
        <svg className="edges" width={canvasW} height={canvasH} aria-hidden="true">
          {edges.map((e) => (
            <path key={e.key} d={e.d} className={e.on ? 'on' : ''} />
          ))}
        </svg>
        {nodes.map((inc) => {
          const pos = positions.get(inc._id)
          if (!pos) return null
          const cls = [
            'node',
            inc.isEnding ? 'ending' : '',
            inc.order === 0 ? 'entry' : '',
            flagged.get(inc._id) === 'error' ? 'error' : flagged.get(inc._id) === 'warning' ? 'warn' : '',
            selectedId === inc._id ? 'selected' : '',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <button
              key={inc._id}
              className={cls}
              style={{left: pos.x, top: pos.y}}
              onClick={() => setSelectedId(selectedId === inc._id ? null : inc._id)}
            >
              <span className="code">{inc.incidentCode ?? '???'}</span>
              <span className="name">{inc.title ?? 'Untitled'}</span>
              {(inc.choiceTargets ?? []).length > 0 && (
                <span className="out">
                  {(inc.choiceTargets ?? []).map((t) => (
                    <span key={t ?? 'x'}>→ {nodes.find((n) => n._id === t)?.incidentCode ?? '?'}</span>
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <details className="diagnostics" open={diagnostics.length > 0}>
        <summary>
          {diagnostics.length === 0 ? 'Graph check: clean' : `Graph check: ${diagnostics.length} finding(s)`}
        </summary>
        <ul>
          {diagnostics.length === 0 && <li className="ok">Every path resolves. At least one ending exists. File it.</li>}
          {diagnostics.map((d, i) => (
            <li key={i} className={d.severity}>
              [{d.severity}] {d.message}
            </li>
          ))}
        </ul>
      </details>

      {selectedId && (
        <IncidentEditor
          incidentHandle={{documentId: selectedId, documentType: 'incident'}}
          caseHandle={caseHandle}
          siblings={nodes}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}
