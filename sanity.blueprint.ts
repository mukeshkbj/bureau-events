import {defineBlueprint, defineDocumentFunction} from '@sanity/blueprints'

export default defineBlueprint({
  resources: [
    defineDocumentFunction({
      name: 'sync-review-decision',
      event: {
        on: ['create', 'update'],
        filter: '_type == "review" && defined(decision) && decision != "pending"',
        projection: '{_id, "caseId": caseFile._ref, decision, decidedAt, round}',
      },
    }),
  ],
})
