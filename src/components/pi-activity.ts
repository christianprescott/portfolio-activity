// Shows the most recent activity timestamp from the /activity API.

type ActivityState =
  | { type: 'loading' }
  | { type: 'unavailable' }
  | { type: 'empty' }
  | { type: 'activity'; lastActivity: string }

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const render = (state: ActivityState): string => {
  switch (state.type) {
    case 'loading':
      return 'Loading…'
    case 'unavailable':
      return 'Unavailable'
    case 'empty':
      return 'No activity'
    case 'activity': {
      const iso = escapeHtml(state.lastActivity)
      const local = escapeHtml(new Date(state.lastActivity).toLocaleString())
      return `<time datetime="${iso}">${local}</time>`
    }
  }
}

const scriptOrigin = new URL(import.meta.url).origin

// Maps the /activity body to a state. Invalid timestamps are unavailable.
const toState = (body: unknown): ActivityState => {
  const last = (body as { lastActivity?: unknown } | null)?.lastActivity
  if (last === undefined) return { type: 'empty' }
  if (typeof last === 'string' && !Number.isNaN(Date.parse(last))) {
    return { type: 'activity', lastActivity: last }
  }
  return { type: 'unavailable' }
}

const fetchActivity = async (base: string): Promise<ActivityState> => {
  try {
    const res = await fetch(`${base}/activity`)
    if (!res.ok) return { type: 'unavailable' }
    return toState(await res.json())
  } catch {
    return { type: 'unavailable' }
  }
}

export class PiActivity extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback() {
    const base = (this.getAttribute('src') || scriptOrigin).replace(/\/$/, '')
    this.update({ type: 'loading' })
    fetchActivity(base).then((state) => this.update(state))
  }

  private update(state: ActivityState) {
    this.shadowRoot!.innerHTML = render(state)
  }
}

if (!customElements.get('pi-activity')) {
  customElements.define('pi-activity', PiActivity)
}
