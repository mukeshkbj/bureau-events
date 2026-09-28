import {defineArrayMember, defineField, defineType} from 'sanity'

export const incident = defineType({
  name: 'incident',
  title: 'Incident',
  type: 'document',
  fields: [
    defineField({name: 'title', type: 'string', validation: (r) => r.required()}),
    defineField({
      name: 'incidentCode',
      title: 'Incident code',
      type: 'string',
      description: 'Short code shown on the board, e.g. CLK-01',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'caseFile',
      title: 'Case file',
      type: 'reference',
      to: [{type: 'caseFile'}],
      validation: (r) => r.required(),
    }),
    defineField({name: 'order', type: 'number', description: '0 marks the entry incident', initialValue: 1}),
    defineField({name: 'report', type: 'text', rows: 8, description: 'The narrative, in Bureau voice'}),
    defineField({name: 'evidence', type: 'reference', to: [{type: 'artifact'}]}),
    defineField({
      name: 'choices',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'choice',
          fields: [
            defineField({name: 'label', type: 'string', validation: (r) => r.required()}),
            defineField({name: 'consequenceNote', type: 'string', title: 'Consequence note'}),
            defineField({name: 'next', type: 'reference', to: [{type: 'incident'}], validation: (r) => r.required()}),
          ],
          preview: {
            select: {label: 'label', next: 'next.incidentCode'},
            prepare: ({label, next}) => ({title: label ?? 'Unlabeled', subtitle: next ? `→ ${next}` : '→ ?'}),
          },
        }),
      ],
      validation: (r) => r.max(4),
    }),
    defineField({
      name: 'ending',
      type: 'object',
      fields: [
        defineField({name: 'isEnding', type: 'boolean', initialValue: false}),
        defineField({
          name: 'designation',
          type: 'string',
          options: {list: ['REPRIEVE', 'ANOMALY', 'CATASTROPHE'], layout: 'radio'},
        }),
        defineField({name: 'epilogue', type: 'text', rows: 3}),
      ],
    }),
  ],
  validation: (rule) =>
    rule.custom((doc) => {
      const choices = doc?.choices as unknown[] | undefined
      const isEnding = (doc?.ending as {isEnding?: boolean} | undefined)?.isEnding === true
      if (isEnding && choices && choices.length > 0) return 'An ending cannot have choices'
      if (!isEnding && (!choices || choices.length === 0)) return 'A non-ending needs at least one choice'
      return true
    }),
  preview: {
    select: {title: 'title', code: 'incidentCode', isEnding: 'ending.isEnding', case: 'caseFile.docketNumber'},
    prepare: ({title, code, isEnding, case: docket}) => ({
      title: `${code ?? '???'} — ${title ?? 'Untitled'}`,
      subtitle: `${docket ?? 'no case'}${isEnding ? ' • ENDING' : ''}`,
    }),
  },
})
