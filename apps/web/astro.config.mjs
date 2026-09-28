// @ts-check
import {defineConfig} from 'astro/config'
import sanity from '@sanity/astro'

// 'unconfigured' keeps @sanity/client construction legal (a-z0-9 only);
// the fetch itself then fails and safeFetch renders the empty-archive state.
const projectId = process.env.PUBLIC_SANITY_PROJECT_ID ?? 'unconfigured'
const dataset = process.env.PUBLIC_SANITY_DATASET ?? 'production'

export default defineConfig({
  integrations: [
    sanity({
      projectId,
      dataset,
      apiVersion: '2026-09-01',
      // Static build: fetch fresh data at build time; the CDN would add
      // staleness for zero benefit here.
      useCdn: false,
    }),
  ],
})
