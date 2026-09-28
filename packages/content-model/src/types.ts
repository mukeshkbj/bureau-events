import type {ArtifactKind, EndingDesignation, ReviewDecision, ReviewStatus} from './constants'

export interface SanityReference {
  _type: 'reference'
  _ref: string
}

export interface Choice {
  _key?: string
  label: string
  consequenceNote?: string
  next?: SanityReference
}

export interface Ending {
  isEnding: boolean
  designation?: EndingDesignation
  epilogue?: string
}

export interface CaseFile {
  _id: string
  _type: 'caseFile'
  title: string
  slug?: {current: string}
  docketNumber: string
  dek?: string
  premise?: string
  reviewStatus?: ReviewStatus
  latestReview?: SanityReference
  reviewedAt?: string
  sigil?: 'orbit' | 'seal' | 'wave'
  publishedAt?: string
}

export interface Incident {
  _id: string
  _type: 'incident'
  title: string
  incidentCode: string
  caseFile: SanityReference
  report?: string
  evidence?: SanityReference
  choices?: Choice[]
  ending?: Ending
  order?: number
}

export interface Artifact {
  _id: string
  _type: 'artifact'
  title: string
  artifactCode: string
  kind?: ArtifactKind
  caption?: string
  spec?: string
  caseFile?: SanityReference
}

export interface Review {
  _id: string
  _type: 'review'
  caseFile: SanityReference
  round: number
  authorNote?: string
  decision?: ReviewDecision
  decisionNote?: string
  decidedAt?: string
  reviewer?: string
}
