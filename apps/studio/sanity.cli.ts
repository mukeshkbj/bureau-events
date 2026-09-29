import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID ?? 'unconfigured',
    dataset: process.env.SANITY_STUDIO_DATASET ?? 'production',
  },
  studioHost: 'bureau-events',
  deployment: {
    appId: 'okb0y1t89nji7jrfsz401282',
  },
})
