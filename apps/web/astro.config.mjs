// @ts-check
import {defineConfig} from 'astro/config'
import {loadEnv} from 'vite'
import sanity from '@sanity/astro'

// astro.config runs before Astro loads .env itself — pull it in manually so
// PUBLIC_SANITY_PROJECT_ID reaches the integration at config time.
const env = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '')
// 'unconfigured' keeps @sanity/client construction legal (a-z0-9 only);
// the fetch itself then fails and safeFetch renders the empty-archive state.
const projectId = env.PUBLIC_SANITY_PROJECT_ID ?? 'unconfigured'
const dataset = env.PUBLIC_SANITY_DATASET ?? 'production'

export default defineConfig({
  integrations: [
    sanity({
      projectId,
      dataset,
      apiVersion: env.PUBLIC_SANITY_API_VERSION ?? '2026-09-01',
      // Static build: fetch fresh data at build time; the CDN would add
      // staleness for zero benefit here.
      useCdn: false,
    }),
  ],
})
