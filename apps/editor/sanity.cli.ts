import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  app: {
    organizationId: process.env.SANITY_ORG_ID ?? 'MISSING_ORG_ID',
    entry: './src/App.tsx',
    title: 'Bureau Board',
  },
  deployment: {
    appId: 'iv082hu12r39wvgimogfoxhc',
  },
})
