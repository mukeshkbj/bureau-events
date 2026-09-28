import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes, templates} from './schemaTypes'
import {structure} from './structure'
import {publishCaseGraphAction, submitForReviewAction} from './actions'

export default defineConfig({
  name: 'bureau',
  title: 'Bureau of Almost-Happened Events',
  projectId: process.env.SANITY_STUDIO_PROJECT_ID ?? 'unconfigured',
  dataset: process.env.SANITY_STUDIO_DATASET ?? 'production',
  plugins: [structureTool({structure}), visionTool()],
  schema: {types: schemaTypes, templates},
  document: {
    actions: (prev, context) => {
      if (context.schemaType !== 'caseFile') return prev
      return [submitForReviewAction, publishCaseGraphAction, ...prev]
    },
    newDocumentOptions: (prev, {creationContext}) => {
      // Keep global "New document" menu tidy: incidents/artifacts belong inside a case.
      if (creationContext.type === 'global') {
        return prev.filter((item) => item.templateId !== 'artifact')
      }
      return prev
    },
  },
})
