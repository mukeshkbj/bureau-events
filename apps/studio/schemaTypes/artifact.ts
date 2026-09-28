import {defineField, defineType} from 'sanity'

export const artifact = defineType({
  name: 'artifact',
  title: 'Artifact',
  type: 'document',
  fields: [
    defineField({name: 'title', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'artifactCode', title: 'Artifact code', type: 'string', validation: (r) => r.required()}),
    defineField({
      name: 'kind',
      type: 'string',
      options: {list: ['photograph', 'instrument', 'memo', 'specimen'], layout: 'radio'},
      validation: (r) => r.required(),
    }),
    defineField({name: 'caption', type: 'text', rows: 2}),
    defineField({name: 'spec', type: 'text', rows: 3, title: 'Registry spec'}),
    defineField({name: 'caseFile', title: 'Case file', type: 'reference', to: [{type: 'caseFile'}]}),
  ],
  preview: {
    select: {title: 'title', code: 'artifactCode', kind: 'kind'},
    prepare: ({title, code, kind}) => ({title: `${code ?? '???'} — ${title ?? 'Untitled'}`, subtitle: kind}),
  },
})
