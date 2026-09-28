import {defineField, defineType} from 'sanity'

export const review = defineType({
  name: 'review',
  title: 'Review',
  type: 'document',
  fields: [
    defineField({name: 'caseFile', title: 'Case file', type: 'reference', to: [{type: 'caseFile'}], validation: (r) => r.required()}),
    defineField({name: 'round', type: 'number', validation: (r) => r.required().min(1).integer()}),
    defineField({name: 'authorNote', type: 'text', rows: 3, description: 'Why the author believes this is ready'}),
    defineField({
      name: 'decision',
      type: 'string',
      options: {list: ['pending', 'approved', 'changesRequested'], layout: 'radio'},
      initialValue: 'pending',
      validation: (r) => r.required(),
    }),
    defineField({name: 'decisionNote', type: 'text', rows: 3, description: 'Curator feedback — required when sending back'}),
    defineField({name: 'decidedAt', type: 'datetime'}),
    defineField({name: 'reviewer', type: 'string'}),
  ],
  preview: {
    select: {round: 'round', decision: 'decision', docket: 'caseFile.docketNumber', title: 'caseFile.title'},
    prepare: ({round, decision, docket, title}) => ({
      title: `${docket ?? '???'} review, round ${round ?? '?'}`,
      subtitle: `${title ?? ''} — ${decision ?? 'pending'}`,
    }),
  },
})
