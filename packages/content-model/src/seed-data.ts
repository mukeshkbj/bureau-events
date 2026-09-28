import type {Artifact, CaseFile, Incident, Review} from './types'

/**
 * BAH-0001 — "The Town That Arrived One Minute Late"
 *
 * Graph (entry order 0, terminals order 4):
 *   CLK-00 ─┬─ STA-01 ─┬─ STA-02 ─┬─ END-REPRIEVE
 *           │          │          └─ END-ANOMALY
 *           │          └─ CNV-01 ─┬─ END-REPRIEVE
 *           ├─ CKM-01 ─┬─ CKM-02 ─┼─ END-ANOMALY
 *           │          └─ CNV-01 ─┴─ END-CATASTROPHE
 *           └─ PRF-01 ─┬─ PRF-02
 *                      └─ CNV-01
 */

export const CASE_ID = 'casefile.marrow-minute'
export const REVIEW_ID = 'review.marrow-minute.r1'

export const seedCaseFile: CaseFile = {
  _id: CASE_ID,
  _type: 'caseFile',
  title: 'The Town That Arrived One Minute Late',
  slug: {current: 'the-town-that-arrived-one-minute-late'},
  docketNumber: 'BAH-0001',
  dek: 'Every clock in Marrow’s End slipped sixty-one seconds at 3:03 in the morning, and the Bureau was asked to decide whether anyone had done it on purpose.',
  premise:
    'Filed under Counterfactual Municipal Incidents. The Bureau’s working theory: somewhere, a minute was spent that was never ours to spend. This docket follows the three investigators assigned to get it back — or to learn what bought it.',
  reviewStatus: 'approved',
  sigil: 'orbit',
  publishedAt: '2026-09-28T03:03:00Z',
}

const ref = (_ref: string) => ({_type: 'reference' as const, _ref})

export const seedArtifacts: Artifact[] = [
  {
    _id: 'artifact.stopwatch-second-son',
    _type: 'artifact',
    title: 'Stopwatch of the Second Son',
    artifactCode: 'INS-Ω7',
    kind: 'instrument',
    caption: 'Recovered from the clockmaker’s bench. Runs exactly 61 seconds fast, which is to say: correctly.',
    spec: 'Brass housing, no maker’s mark. Mainspring tension decreases when wound. Do not synchronize.',
    caseFile: ref(CASE_ID),
  },
  {
    _id: 'artifact.timetable-cl4',
    _type: 'artifact',
    title: 'Timetable CL-4',
    artifactCode: 'DOC-CL4',
    kind: 'memo',
    caption: 'The 6:12 arrived on time. Only the town was late. Stationmaster’s annotation in red: “this is backwards.”',
    spec: 'Rail Authority print, series CL. Column 4 lists arrivals; column 5, crossed out, lists arrivals sixty-one seconds earlier in a hand belonging to no staff member.',
    caseFile: ref(CASE_ID),
  },
  {
    _id: 'artifact.prefect-memo-61b',
    _type: 'artifact',
    title: 'Prefectural Memo 61-B',
    artifactCode: 'DOC-61B',
    kind: 'memo',
    caption: '“Re: Leveraging the Delay. If the town is sixty-one seconds behind, every deadline we owe is sixty-one seconds later. Do not repair.”',
    spec: 'Prefect’s office stationery, unsigned. Watermark dates the paper to next Tuesday.',
    caseFile: ref(CASE_ID),
  },
]

const I = (partial: Omit<Incident, '_type' | 'caseFile'>): Incident => ({
  _type: 'incident',
  caseFile: ref(CASE_ID),
  ...partial,
})

export const seedIncidents: Incident[] = [
  I({
    _id: 'incident.clk-00',
    title: 'The Slippage',
    incidentCode: 'CLK-00',
    order: 0,
    report:
      'At 03:03 the town of Marrow’s End fell sixty-one seconds behind the rest of the world. The church bell rang the hour sixty-one seconds after the hour. The pigeons, which launch off the bakery roof at first light, launched into a morning that had technically already started.\n\nNobody noticed. That is the disturbing part. The Bureau only learned of it because the 6:12 express filed a complaint: it had arrived “on time,” which its conductor described as “suspicious.”',
    choices: [
      {label: 'Follow Stationmaster Hale to Platform 2', consequenceNote: 'The railway keeps its own time. Start with the only clock that disagrees.', next: ref('incident.sta-01')},
      {label: 'Wake the clockmaker', consequenceNote: 'If every clock broke at once, only one person in town is not surprised.', next: ref('incident.ckm-01')},
      {label: 'Report to the Prefect’s office', consequenceNote: 'Someone in this town already knows. Prefects usually do.', next: ref('incident.prf-01')},
    ],
  }),
  I({
    _id: 'incident.sta-01',
    title: 'Platform 2',
    incidentCode: 'STA-01',
    order: 1,
    report:
      'Stationmaster Hale keeps the rail regulator in a glass case with a label that reads “THE TIME.” He compared it to the town hall clock, then to his wristwatch, then to the sun, with escalating suspicion.\n\n“The railway is correct,” he said, tapping the glass. “The town is wrong. A train is never early; a place is only ever late.” He produced Timetable CL-4, on which someone had already written the correct arrivals — sixty-one seconds before anyone was scheduled to write them.',
    choices: [
      {label: 'Examine Timetable CL-4', consequenceNote: 'Column 5 was written by nobody on the staff. Find out whose hand it is.', next: ref('incident.sta-02')},
      {label: 'Compare the regulator to the clockmaker’s instruments', consequenceNote: 'Two correct clocks is a coincidence. Three is a conspiracy.', next: ref('incident.cnv-01')},
    ],
  }),
  I({
    _id: 'incident.sta-02',
    title: 'The Passenger Who Wasn’t',
    incidentCode: 'STA-02',
    order: 2,
    evidence: ref('artifact.timetable-cl4'),
    report:
      'The 6:12 discharged eleven passengers and one extra: a conductor’s punch, still warm, clipped to no one’s ticket. The handwriting in column 5 of Timetable CL-4 matches the punch pattern of a ticket machine the railway scrapped forty years ago.\n\nHale grew very quiet. “Someone rode our line before it existed,” he said, “and they got off sixty-one seconds early. They took the minute with them.”',
    choices: [
      {label: 'Wire the Rail Authority to return the minute', consequenceNote: 'Formal channels. Slow, but the paperwork outlives everyone.', next: ref('incident.end-reprieve')},
      {label: 'Log the anomaly and leave the clocks as they are', consequenceNote: 'A town that is permanently a minute behind is a town with a head start on yesterday.', next: ref('incident.end-anomaly')},
    ],
  }),
  I({
    _id: 'incident.ckm-01',
    title: 'The Clockmaker’s Bench',
    incidentCode: 'CKM-01',
    order: 1,
    report:
      'The clockmaker, Ms. Ilsa Vane, was awake. Of course she was. Her shop contains two hundred and twelve clocks, and at 03:03 every single one of them had disagreed with her heartbeat simultaneously. “You cannot imagine the noise,” she said, “of two hundred and twelve devices apologizing at once.”\n\nOn the bench sat a stopwatch she did not own, running sixty-one seconds fast. “It runs correctly,” she corrected herself. “Everything else is slow. Someone has moved the town to a cheaper timezone.”',
    choices: [
      {label: 'Take the stopwatch to the vault', consequenceNote: 'Anything that keeps correct time this badly belongs in the archive.', next: ref('incident.ckm-02')},
      {label: 'Cross-check it against the station regulator', consequenceNote: 'Two correct clocks is a coincidence. Three is a conspiracy.', next: ref('incident.cnv-01')},
    ],
  }),
  I({
    _id: 'incident.ckm-02',
    title: 'The Second Son',
    incidentCode: 'CKM-02',
    order: 2,
    evidence: ref('artifact.stopwatch-second-son'),
    report:
      'The vault register lists the stopwatch under a name the Bureau does not use lightly: the Second Son. Tradition holds that every town keeps a spare minute in trust, to be spent only when the last train has gone and the baker refuses to sleep.\n\nThe register shows a withdrawal. Sixty-one seconds, signed for by “Marrow’s End, respectfully.” The signature is the town’s own handwriting. Towns do not have handwriting.',
    choices: [
      {label: 'Countersign the withdrawal and close the register', consequenceNote: 'If the town spent its own minute, the Bureau cannot repossess it.', next: ref('incident.end-anomaly')},
      {label: 'Petition the ledger for repayment', consequenceNote: 'Someone must refund the minute, and someone always does, at interest.', next: ref('incident.cnv-01')},
    ],
  }),
  I({
    _id: 'incident.prf-01',
    title: 'The Prefect’s Calendar',
    incidentCode: 'PRF-01',
    order: 1,
    report:
      'The Prefect received the investigators standing behind a desk on which sat Prefectural Memo 61-B, already drafted, already stamped. “You are sixty-one seconds late,” he said, and smiled as though he had rehearsed it.\n\nHis proposal was elegant in the way that termite damage is architecture: if the town is behind the world, then every debt it owes the world is slightly less due. Taxes. Apologies. The lease on the river. “Do not repair the clocks,” he advised. “Charge rent for the difference.”',
    choices: [
      {label: 'Audit Memo 61-B', consequenceNote: 'The watermark is dated next Tuesday. The Prefect is renting his own future.', next: ref('incident.prf-02')},
      {label: 'Take the memo to the vault for comparison', consequenceNote: 'Two documents about the same minute. One of them is a receipt.', next: ref('incident.cnv-01')},
    ],
  }),
  I({
    _id: 'incident.prf-02',
    title: 'Rent on the Minute',
    incidentCode: 'PRF-02',
    order: 2,
    evidence: ref('artifact.prefect-memo-61b'),
    report:
      'Memo 61-B is not dated. It is *pre*-dated. The watermark marks it as paper manufactured the following Tuesday, which means the Prefect drafted it in a week that has not happened yet and is, accordingly, ahead of schedule.\n\nBureau counsel’s preliminary opinion is one sentence long: a municipality cannot invoice the future without becoming a creditor of it, and the future collects.',
    choices: [
      {label: 'Confiscate the memo and the calendar it came from', consequenceNote: 'If the Prefect owns next Tuesday, repossess it.', next: ref('incident.end-catastrophe')},
      {label: 'File the memo as corroborating evidence', consequenceNote: 'It goes in the vault beside the stopwatch, where it will wait. Patiently.', next: ref('incident.cnv-01')},
    ],
  }),
  I({
    _id: 'incident.cnv-01',
    title: 'The Vault Below the Register',
    incidentCode: 'CNV-01',
    order: 3,
    report:
      'The Bureau’s vault is a room where correct instruments go to be wrong together. The stopwatch, the timetable, and the memo were placed on the same shelf, and immediately the shelf began to tick — a slow, coordinated sound, like a town clearing its throat.\n\nThe three documents agree on one thing: the minute was spent, not stolen. Spent by Marrow’s End on Marrow’s End, at 03:03, for sixty-one seconds of a morning nobody else was using. The question the Bureau must now answer is not where the minute went. It is whether the town was allowed to buy it.',
    choices: [
      {label: 'Rule the purchase legitimate and restore the clocks', consequenceNote: 'The minute is repaid into the town’s trust. Marrow’s End rejoins the world.', next: ref('incident.end-reprieve')},
      {label: 'Classify the site as a benign temporal anomaly', consequenceNote: 'Let it stay late. The world could use a town with a head start on yesterday.', next: ref('incident.end-anomaly')},
      {label: 'Issue a warrant for the spent minute', consequenceNote: 'The Bureau does not accept expenditures. The Bureau collects.', next: ref('incident.end-catastrophe')},
    ],
  }),
  I({
    _id: 'incident.end-reprieve',
    title: 'Reprieve',
    incidentCode: 'END-01',
    order: 4,
    report:
      'The ledger accepted repayment with the reluctance of all institutions. At 03:03 the following morning the town of Marrow’s End rejoined the correct time, sixty-one seconds poorer in a currency only the Bureau measures.\n\nThe pigeons launched into a morning that had not technically started yet. Stationmaster Hale sent a postcard: “The 6:12 was late today. Everything is normal.”',
    ending: {isEnding: true, designation: 'REPRIEVE', epilogue: 'Docket closed. The minute was returned, at interest the Bureau declines to itemize. Recommendation: check the pigeons annually.'},
    choices: [],
  }),
  I({
    _id: 'incident.end-anomaly',
    title: 'Standing Anomaly',
    incidentCode: 'END-02',
    order: 4,
    report:
      'The Bureau ruled that Marrow’s End may keep its sixty-one seconds, under the doctrine of Finders, Keepers, Municipal. The town now runs permanently one minute behind the rest of the world and is, per capita, the least surprised place on Earth.\n\nVisitors come to be late on purpose. The bakery sells a pastry called the Additional Minute. It is very good. The Prefect charges admission.',
    ending: {isEnding: true, designation: 'ANOMALY', epilogue: 'Docket closed. Site reclassified: benign temporal anomaly, tourism-positive. The Bureau keeps the stopwatch; the town keeps the minute.'},
    choices: [],
  }),
  I({
    _id: 'incident.end-catastrophe',
    title: 'The Warrant',
    incidentCode: 'END-03',
    order: 4,
    report:
      'The warrant was issued at noon. By twelve-oh-one the sixty-one seconds had been recovered, itemized, and returned to the ledger. Marrow’s End was found not guilty of theft but guilty of aspiration, which the Bureau treats more seriously.\n\nThe recovered minute could not be put back. A spent minute is spent. Instead it was deposited in trust for a town two valleys over, which has now begun — very politely — to run late. Its clocks are angrier. Its pigeons are worse. The Bureau has opened a new docket.',
    ending: {isEnding: true, designation: 'CATASTROPHE', epilogue: 'Docket closed; sequel inevitable. The future collects, and it is now owed one minute by a town that has never heard of us.'},
    choices: [],
  }),
]

export const seedReview: Review = {
  _id: REVIEW_ID,
  _type: 'review',
  caseFile: ref(CASE_ID),
  round: 1,
  authorNote: 'All 11 incidents reachable, three endings stamped, evidence filed. Requesting approval to open the docket to the public.',
  decision: 'approved',
  decisionNote: 'Approved. The pigeons were the deciding factor.',
  decidedAt: '2026-09-28T09:00:00Z',
  reviewer: 'Curator E. Vance',
}
