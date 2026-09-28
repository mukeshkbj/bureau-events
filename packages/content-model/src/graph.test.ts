import {describe, expect, it} from 'vitest'
import {computeLayers, diagnoseCase, isPublishable, type GraphIncident} from './graph'
import {seedIncidents} from './seed-data'

const inc = (partial: Partial<GraphIncident> & {_id: string}): GraphIncident => ({
  choiceTargets: [],
  choiceLabels: [],
  ...partial,
})

describe('diagnoseCase', () => {
  it('accepts the seed docket', () => {
    const graph = seedIncidents.map((i) => ({
      _id: i._id,
      incidentCode: i.incidentCode,
      order: i.order,
      isEnding: i.ending?.isEnding ?? false,
      choiceTargets: (i.choices ?? []).map((c) => c.next?._ref),
      choiceLabels: (i.choices ?? []).map((c) => c.label),
    }))
    expect(diagnoseCase(graph)).toEqual([])
    expect(isPublishable(graph)).toBe(true)
  })

  it('flags a case with no incidents', () => {
    expect(diagnoseCase([])[0]?.code).toBe('missing-entry')
  })

  it('flags a missing entry point', () => {
    const d = diagnoseCase([inc({_id: 'a', incidentCode: 'A', order: 1, isEnding: true})])
    expect(d.map((x) => x.code)).toContain('missing-entry')
  })

  it('flags multiple entries', () => {
    const d = diagnoseCase([
      inc({_id: 'a', order: 0, isEnding: false, choiceTargets: ['b'], choiceLabels: ['go']}),
      inc({_id: 'b', order: 0, isEnding: true}),
    ])
    expect(d.map((x) => x.code)).toContain('multiple-entries')
  })

  it('flags a dead end that is not an ending', () => {
    const d = diagnoseCase([
      inc({_id: 'a', order: 0, choiceTargets: ['b'], choiceLabels: ['go']}),
      inc({_id: 'b', order: 1}),
      inc({_id: 'c', order: 2, isEnding: true, choiceTargets: []}),
    ])
    const codes = d.map((x) => x.code)
    expect(codes).toContain('empty-nonterminal')
    expect(codes).toContain('unreachable') // 'c' is unreachable too
  })

  it('flags missing and foreign targets', () => {
    const d = diagnoseCase([
      inc({_id: 'a', order: 0, choiceTargets: ['ghost', undefined], choiceLabels: ['x', 'y']}),
      inc({_id: 'b', order: 1, isEnding: true}),
    ])
    const codes = d.map((x) => x.code)
    expect(codes).toContain('foreign-target')
    expect(codes).toContain('missing-target')
  })

  it('flags endings that still offer choices', () => {
    const d = diagnoseCase([
      inc({_id: 'a', order: 0, choiceTargets: ['b'], choiceLabels: ['go']}),
      inc({_id: 'b', order: 1, isEnding: true, choiceTargets: ['a'], choiceLabels: ['loop']}),
    ])
    expect(d.find((x) => x.code === 'ending-with-choices')?.severity).toBe('warning')
  })

  it('flags a graph with no terminals', () => {
    const d = diagnoseCase([
      inc({_id: 'a', order: 0, choiceTargets: ['b'], choiceLabels: ['go']}),
      inc({_id: 'b', order: 1, choiceTargets: ['a'], choiceLabels: ['back']}),
    ])
    expect(d.map((x) => x.code)).toContain('no-terminal')
  })

  it('flags duplicate incident codes and unlabeled choices', () => {
    const d = diagnoseCase([
      inc({_id: 'a', order: 0, incidentCode: 'X', choiceTargets: ['b'], choiceLabels: ['go']}),
      inc({_id: 'b', order: 1, incidentCode: 'X', isEnding: true, choiceTargets: [], choiceLabels: ['']}),
    ])
    const codes = d.map((x) => x.code)
    expect(codes).toContain('duplicate-code')
  })
})

describe('computeLayers', () => {
  it('layers by shortest path from entry', () => {
    const layers = computeLayers([
      inc({_id: 'a', order: 0, choiceTargets: ['b', 'c']}),
      inc({_id: 'b', order: 1, choiceTargets: ['c']}),
      inc({_id: 'c', order: 2, isEnding: true}),
    ])
    expect(layers.get('a')).toBe(0)
    expect(layers.get('b')).toBe(1)
    expect(layers.get('c')).toBe(1) // shortest path: a→c direct
  })

  it('does not loop forever on cycles', () => {
    const layers = computeLayers([
      inc({_id: 'a', order: 0, choiceTargets: ['b']}),
      inc({_id: 'b', order: 1, choiceTargets: ['a', 'c']}),
      inc({_id: 'c', order: 2, isEnding: true}),
    ])
    expect(layers.get('a')).toBe(0)
    expect(layers.get('b')).toBe(1)
    expect(layers.get('c')).toBe(2)
  })
})
