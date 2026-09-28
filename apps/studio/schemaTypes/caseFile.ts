import {defineField, defineType} from 'sanity'

export const caseFile = defineType({
  name: 'caseFile',
  title: 'Case File',
  type: 'document',
  groups: [
    {name: 'content', title: 'Content', default: true},
    {name: 'workflow', title: 'Review'},
  ],
  fields: [
    defineField({name: 'title', type: 'string', group: 'content', validation: (r) => r.required()}),
    defineField({
      name: 'slug',
      type: 'slug',
      group: 'content',
      options: {source: 'title', maxLength: 96},
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'docketNumber',
      title: 'Docket number',
      type: 'string',
      group: 'content',
      description: 'Bureau filing code, e.g. BAH-0001',
      validation: (r) => r.required().regex(/^BAH-\d{4}$/, {name: 'BAH-XXXX format'}),
    }),
    defineField({name: 'dek', type: 'string', group: 'content', description: 'One-line premise for index cards'}),
    defineField({name: 'premise', type: 'text', group: 'content', rows: 4, description: 'The counterfactual, in Bureau voice'}),
    defineField({
      name: 'sigil',
      type: 'string',
      group: 'content',
      options: {list: ['orbit', 'seal', 'wave'], layout: 'radio'},
      initialValue: 'seal',
    }),
    defineField({name: 'publishedAt', type: 'datetime', group: 'content'}),
    defineField({
      name: 'reviewStatus',
      type: 'string',
      group: 'workflow',
      readOnly: true,
      description: 'Set by review actions and the sync function — not edited by hand',
      options: {list: ['draft', 'inReview', 'changesRequested', 'approved']},
      initialValue: 'draft',
    }),
    defineField({name: 'latestReview', type: 'reference', to: [{type: 'review'}], group: 'workflow', readOnly: true}),
    defineField({name: 'reviewedAt', type: 'datetime', group: 'workflow', readOnly: true}),
  ],
  preview: {
    select: {title: 'title', docket: 'docketNumber', status: 'reviewStatus'},
    prepare: ({title, docket, status}) => ({
      title: `${docket ?? 'BAH-????'} — ${title ?? 'Untitled'}`,
      subtitle: status ? `status: ${status}` : 'draft',
    }),
  },
})
