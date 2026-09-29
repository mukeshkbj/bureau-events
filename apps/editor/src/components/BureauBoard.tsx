import {useState} from 'react'
import type {DocumentHandle} from '@sanity/sdk-react'
import {CaseList} from './CaseList'
import {CaseBoard} from './CaseBoard'
import {ActivityToast} from './ActivityToast'

export function BureauBoard() {
  const [selectedCase, setSelectedCase] = useState<DocumentHandle | null>(null)

  return (
    <div className="board">
      <aside className="rail">
        <div className="rail-header">
          Bureau <span>Board</span>
        </div>
        <div className="rail-scroll">
          <CaseList selected={selectedCase} onSelect={setSelectedCase} />
        </div>
      </aside>
      {selectedCase ? (
        <CaseBoard caseHandle={selectedCase} onCaseDeleted={() => setSelectedCase(null)} />
      ) : (
        <div className="empty-board">Select a docket to open its incident graph.</div>
      )}
      <ActivityToast />
    </div>
  )
}
