interface Choice {
  _key?: string
  label: string
  consequenceNote?: string
  nextId?: string
}

interface ArtifactRef {
  _id: string
  artifactCode: string
  title: string
  kind?: string
  caption?: string
  spec?: string
}

interface Incident {
  _id: string
  incidentCode: string
  title: string
  report?: string
  order?: number
  choices?: Choice[]
  ending?: {isEnding: boolean; designation?: string; epilogue?: string}
  artifact?: ArtifactRef | null
}

interface Graph {
  docketNumber: string
  incidents: Incident[]
}

const MAX_STEPS = 24

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const paragraphs = (text: string) =>
  text
    .split(/\n{2,}/)
    .map((p) => `<p>${esc(p).replace(/\n/g, '<br/>')}</p>`)
    .join('')

const evidenceHtml = (a: ArtifactRef) => `
  <div class="evidence">
    <div class="head"><span>EVIDENCE ${esc(a.artifactCode)}</span><span>${esc(a.kind ?? 'item')}</span></div>
    <div class="title">${esc(a.title)}</div>
    ${a.caption ? `<div>${esc(a.caption)}</div>` : ''}
    ${a.spec ? `<div class="spec">${esc(a.spec)}</div>` : ''}
  </div>`

export function startReader(graph: Graph) {
  const root = document.getElementById('reader')
  if (!root) return

  const byId = new Map(graph.incidents.map((i) => [i._id, i]))
  const entry = graph.incidents.find((i) => i.order === 0) ?? graph.incidents[0]
  if (!entry) {
    root.innerHTML = '<div class="empty-state">This docket contains no incidents.</div>'
    return
  }

  let current = entry._id
  let trail: string[] = []

  const hashTarget = () => {
    const m = /^#i=(.+)$/.exec(location.hash)
    return m?.[1] && byId.has(m[1]) ? m[1] : null
  }

  const go = (id: string, push = true) => {
    if (!byId.has(id)) return
    if (push) trail.push(current)
    current = id
    history.replaceState(null, '', `#i=${id}`)
    render()
    root.scrollIntoView({block: 'nearest'})
  }

  const back = () => {
    const prev = trail.pop()
    if (prev) {
      current = prev
      history.replaceState(null, '', `#i=${prev}`)
      render()
    }
  }

  const restart = () => {
    trail = []
    current = entry._id
    history.replaceState(null, '', `#i=${entry._id}`)
    render()
  }

  function render() {
    const inc = byId.get(current)
    if (!inc) return

    const crumbs = [entry._id, ...trail.slice(1), current]
      .filter((v, i, a) => a.indexOf(v) === i || v === current)
      .map((id) => {
        const c = byId.get(id)?.incidentCode ?? '?'
        return `<span class="crumb${id === current ? ' current' : ''}">${esc(c)}</span>`
      })
      .join('')

    const isEnding = inc.ending?.isEnding === true
    const choices = (inc.choices ?? []).filter((c) => c.nextId && byId.has(c.nextId))

    let choicesHtml = ''
    if (isEnding) {
      choicesHtml = `
        <div class="ending-stamp">${esc(inc.ending?.designation ?? 'FILED')}</div>
        ${inc.ending?.epilogue ? `<p><em>${esc(inc.ending.epilogue)}</em></p>` : ''}
        <div class="reader-actions">
          <button class="btn-plain" data-action="restart">File another path</button>
          ${trail.length > 0 ? '<button class="btn-plain" data-action="back">Step back</button>' : ''}
        </div>`
    } else if (choices.length > 0) {
      choicesHtml = `<div class="choices">${choices
        .map(
          (c) => `
        <button class="choice" data-next="${esc(c.nextId!)}">
          <span class="label">${esc(c.label)}</span>
          ${c.consequenceNote ? `<span class="note">${esc(c.consequenceNote)}</span>` : ''}
        </button>`,
        )
        .join('')}</div>
      ${trail.length > 0 ? '<div class="reader-actions"><button class="btn-plain" data-action="back">Step back</button></div>' : ''}`
    } else {
      choicesHtml = `
        <div class="empty-state">The report ends here without a stamp — the Bureau apologizes for the inconvenience.</div>
        <div class="reader-actions"><button class="btn-plain" data-action="restart">Restart</button></div>`
    }

    root!.innerHTML = `
      <div class="trail" aria-label="Path taken">${crumbs}</div>
      <article class="report-card">
        <div class="code">INCIDENT ${esc(inc.incidentCode)} · DOCKET ${esc(graph.docketNumber)}</div>
        <h2>${esc(inc.title)}</h2>
        ${inc.report ? paragraphs(inc.report) : '<p><em>No report on file.</em></p>'}
        ${inc.artifact ? evidenceHtml(inc.artifact) : ''}
        ${choicesHtml}
      </article>`

    root!.querySelectorAll<HTMLButtonElement>('[data-next]').forEach((b) =>
      b.addEventListener('click', () => go(b.dataset.next!)),
    )
    root!.querySelector('[data-action="restart"]')?.addEventListener('click', restart)
    root!.querySelector('[data-action="back"]')?.addEventListener('click', back)
  }

  // Deep-link into a specific incident, e.g. from a shared URL.
  const deep = hashTarget()
  if (deep) {
    current = deep
    history.replaceState(null, '', `#i=${deep}`)
  }

  render()

  // Guard rail: if a deep path runs long, offer a clean restart.
  if (trail.length >= MAX_STEPS) restart()
}
