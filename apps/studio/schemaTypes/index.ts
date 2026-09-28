import {caseFile} from './caseFile'
import {incident} from './incident'
import {artifact} from './artifact'
import {review} from './review'

export const schemaTypes = [caseFile, incident, artifact, review]

export const templates = (prev: import('sanity').Template[]) => [
  ...prev,
  {
    id: 'incident-in-case',
    title: 'Incident in case',
    schemaType: 'incident',
    parameters: [{name: 'caseId', type: 'string'}],
    value: (params: {caseId: string}) => ({
      caseFile: {_type: 'reference', _ref: params.caseId},
    }),
  },
  {
    id: 'artifact-in-case',
    title: 'Artifact in case',
    schemaType: 'artifact',
    parameters: [{name: 'caseId', type: 'string'}],
    value: (params: {caseId: string}) => ({
      caseFile: {_type: 'reference', _ref: params.caseId},
    }),
  },
  {
    id: 'review-for-case',
    title: 'Review for case',
    schemaType: 'review',
    parameters: [{name: 'caseId', type: 'string'}, {name: 'round', type: 'number'}],
    value: (params: {caseId: string; round?: number}) => ({
      caseFile: {_type: 'reference', _ref: params.caseId},
      round: params.round ?? 1,
      decision: 'pending',
    }),
  },
]
