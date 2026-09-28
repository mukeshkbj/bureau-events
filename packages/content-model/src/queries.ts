import {defineQuery} from 'groq'

/** Approved dockets for the public index. */
export const caseIndexQuery = defineQuery(`*[
  _type == "caseFile" && reviewStatus == "approved"
] | order(publishedAt desc) {
  _id, title, "slug": slug.current, docketNumber, dek, sigil, publishedAt
}`)

/** Full incident graph for one approved case — powers the reader. */
export const caseGraphQuery = defineQuery(`*[
  _type == "caseFile" && slug.current == $slug && reviewStatus == "approved"
][0] {
  _id, title, "slug": slug.current, docketNumber, dek, premise, sigil, publishedAt,
  "incidents": *[_type == "incident" && caseFile._ref == ^._id] | order(order asc) {
    _id, incidentCode, title, report, order,
    "choices": choices[] { _key, label, consequenceNote, "nextId": next._ref },
    "ending": ending { isEnding, designation, epilogue },
    "artifact": evidence->{ _id, artifactCode, title, kind, caption, spec }
  }
}`)

/** Board data for the editor — one live query feeds nodes, edges, diagnostics. */
export const caseBoardQuery = defineQuery(`*[
  _type == "incident" && caseFile._ref == $caseId
] | order(order asc) {
  _id, incidentCode, title, order,
  "isEnding": ending.isEnding,
  "choiceTargets": choices[].next._ref,
  "choiceLabels": choices[].label
}`)

/** Reviews for one case, newest round first. */
export const caseReviewsQuery = defineQuery(`*[
  _type == "review" && caseFile._ref == $caseId
] | order(round desc) {
  _id, round, decision, decisionNote, decidedAt, reviewer, authorNote, _updatedAt
}`)

/** Latest decided review for a case (used by the Function). */
export const latestDecidedReviewQuery = defineQuery(`*[
  _type == "review" && caseFile._ref == $caseId && defined(decision) && decision != "pending"
] | order(round desc)[0] { _id, decision, decidedAt, round }`)

/** Draft ids of every child document belonging to a case (for the publish action). */
export const childDraftsQuery = `*[
  _type in ["incident", "artifact"] && caseFile._ref == $caseId && _id in path("drafts.**")
]._id`

/** Published child ids belonging to a case. */
export const childIdsQuery = `*[
  _type in ["incident", "artifact"] && caseFile._ref == $caseId && !(_id in path("drafts.**"))
]._id`

/** Pending reviews — the curator queue. */
export const pendingReviewsQuery = defineQuery(`*[
  _type == "review" && decision == "pending"
] | order(_createdAt asc) {
  _id, round, authorNote, _createdAt,
  "caseTitle": caseFile->title,
  "caseDocket": caseFile->docketNumber,
  "caseId": caseFile._ref
}`)
