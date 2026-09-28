/**
 * Pure validation for an incident graph. Shared by the Studio diagnostics,
 * the App SDK board, and the build-time check — one source of truth.
 */

export interface GraphIncident {
  _id: string
  incidentCode?: string
  order?: number
  isEnding?: boolean
  choiceTargets?: (string | null | undefined)[]
  choiceLabels?: (string | null | undefined)[]
}

export type DiagnosticCode =
  | 'missing-entry'
  | 'multiple-entries'
  | 'empty-nonterminal'
  | 'ending-with-choices'
  | 'missing-target'
  | 'foreign-target'
  | 'unlabeled-choice'
  | 'unreachable'
  | 'no-terminal'
  | 'duplicate-code'

export interface GraphDiagnostic {
  code: DiagnosticCode
  severity: 'error' | 'warning'
  incidentId?: string
  message: string
}

const codeLabel = (inc: GraphIncident) => inc.incidentCode ?? inc._id

export function diagnoseCase(incidents: GraphIncident[]): GraphDiagnostic[] {
  const diagnostics: GraphDiagnostic[] = []
  const byId = new Map(incidents.map((i) => [i._id, i]))

  if (incidents.length === 0) return [{code: 'missing-entry', severity: 'error', message: 'Case has no incidents'}]

  const entries = incidents.filter((i) => i.order === 0)
  if (entries.length === 0) {
    diagnostics.push({code: 'missing-entry', severity: 'error', message: 'No entry incident (order == 0)'})
  } else if (entries.length > 1) {
    diagnostics.push({
      code: 'multiple-entries',
      severity: 'error',
      message: `Multiple entry incidents: ${entries.map(codeLabel).join(', ')}`,
    })
  }

  const codeCount = new Map<string, number>()
  for (const inc of incidents) {
    if (inc.incidentCode) codeCount.set(inc.incidentCode, (codeCount.get(inc.incidentCode) ?? 0) + 1)
  }
  for (const [code, count] of codeCount) {
    if (count > 1) diagnostics.push({code: 'duplicate-code', severity: 'error', message: `Duplicate incident code "${code}" (${count}×)`})
  }

  let terminalCount = 0
  for (const inc of incidents) {
    const targets = inc.choiceTargets ?? []
    const labels = inc.choiceLabels ?? []
    const isEnding = inc.isEnding === true

    if (isEnding) {
      terminalCount++
      if (targets.length > 0) {
        diagnostics.push({
          code: 'ending-with-choices',
          severity: 'warning',
          incidentId: inc._id,
          message: `${codeLabel(inc)} is an ending but still has choices`,
        })
      }
    } else if (targets.length === 0) {
      diagnostics.push({
        code: 'empty-nonterminal',
        severity: 'error',
        incidentId: inc._id,
        message: `${codeLabel(inc)} has no choices and is not marked as an ending`,
      })
    }

    targets.forEach((target, idx) => {
      const label = labels[idx]
      if (label != null && !label) {
        diagnostics.push({
          code: 'unlabeled-choice',
          severity: 'error',
          incidentId: inc._id,
          message: `${codeLabel(inc)} has a choice with no label`,
        })
      }
      if (target == null || !byId.has(target)) {
        diagnostics.push({
          code: target == null ? 'missing-target' : 'foreign-target',
          severity: 'error',
          incidentId: inc._id,
          message:
            target == null
              ? `${codeLabel(inc)}: choice ${idx + 1} has no target`
              : `${codeLabel(inc)}: choice ${idx + 1} points outside this case`,
        })
      }
    })
  }

  if (terminalCount === 0) {
    diagnostics.push({code: 'no-terminal', severity: 'error', message: 'No ending incidents — readers can never finish'})
  }

  if (entries.length === 1) {
    const reachable = new Set<string>([entries[0]!._id])
    const queue = [entries[0]!._id]
    while (queue.length > 0) {
      const id = queue.shift()!
      const inc = byId.get(id)
      if (!inc) continue
      for (const target of inc.choiceTargets ?? []) {
        if (target && byId.has(target) && !reachable.has(target)) {
          reachable.add(target)
          queue.push(target)
        }
      }
    }
    for (const inc of incidents) {
      if (!reachable.has(inc._id)) {
        diagnostics.push({
          code: 'unreachable',
          severity: 'error',
          incidentId: inc._id,
          message: `${codeLabel(inc)} cannot be reached from the entry`,
        })
      }
    }
  }

  return diagnostics
}

export function isPublishable(incidents: GraphIncident[]): boolean {
  return !diagnoseCase(incidents).some((d) => d.severity === 'error')
}

/** Layer each incident by shortest distance from the entry, for board layout. */
export function computeLayers(incidents: GraphIncident[]): Map<string, number> {
  const layers = new Map<string, number>()
  const byId = new Map(incidents.map((i) => [i._id, i]))
  const entry = incidents.find((i) => i.order === 0)
  if (!entry) return layers

  // BFS keeps cycles finite: first visit wins, no node is ever re-raised.
  layers.set(entry._id, 0)
  const queue = [entry._id]
  while (queue.length > 0) {
    const id = queue.shift()!
    const parentLayer = layers.get(id)!
    for (const target of byId.get(id)?.choiceTargets ?? []) {
      if (target && byId.has(target) && !layers.has(target)) {
        layers.set(target, parentLayer + 1)
        queue.push(target)
      }
    }
  }
  return layers
}
