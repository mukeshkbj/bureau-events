import {type SanityConfig} from '@sanity/sdk'
import {SanityApp} from '@sanity/sdk-react'
import {Suspense} from 'react'
import {BureauBoard} from './components/BureauBoard'
import './app.css'

const token = import.meta.env.SANITY_APP_TOKEN

const config: SanityConfig[] = [
  {
    projectId: import.meta.env.SANITY_APP_PROJECT_ID ?? 'MISSING_PROJECT_ID',
    dataset: import.meta.env.SANITY_APP_DATASET ?? 'production',
    ...(token ? {auth: {token}} : {}),
  },
]

export default function App() {
  return (
    <SanityApp config={config} fallback={<div className="app-loading">Opening the archive…</div>}>
      <Suspense fallback={<div className="app-loading">Loading the board…</div>}>
        <BureauBoard />
      </Suspense>
    </SanityApp>
  )
}
