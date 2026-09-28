export const DOC_TYPES = {
  caseFile: 'caseFile',
  incident: 'incident',
  artifact: 'artifact',
  review: 'review',
} as const

export const REVIEW_STATUSES = ['draft', 'inReview', 'changesRequested', 'approved'] as const
export type ReviewStatus = (typeof REVIEW_STATUSES)[number]

export const REVIEW_DECISIONS = ['pending', 'approved', 'changesRequested'] as const
export type ReviewDecision = (typeof REVIEW_DECISIONS)[number]

export const ARTIFACT_KINDS = ['photograph', 'instrument', 'memo', 'specimen'] as const
export type ArtifactKind = (typeof ARTIFACT_KINDS)[number]

export const ENDING_DESIGNATIONS = ['REPRIEVE', 'ANOMALY', 'CATASTROPHE'] as const
export type EndingDesignation = (typeof ENDING_DESIGNATIONS)[number]

export const MAX_STEPS_BEFORE_RESTART = 24
export const MAX_CHOICES_PER_INCIDENT = 4
