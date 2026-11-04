// Shows the most recent activity timestamp from the /activity API.

import { LitElement, css, html, nothing } from 'lit'

type ActivityState =
  | { type: 'loading' }
  | { type: 'unavailable' }
  | { type: 'empty' }
  | { type: 'activity'; lastActivity: string }

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

export class PiActivity extends LitElement {
  static properties = {
    state: { state: true },
  }

  static styles = css`
    :host {
      display: block;
    }
    div {
      border: 2px solid var(--pi-activity-border-color, currentColor);
      padding: 0.5rem;
    }
  `

  declare state: ActivityState

  constructor() {
    super()
    this.state = { type: 'loading' }
  }

  connectedCallback() {
    super.connectedCallback()
    const base = (this.getAttribute('src') || scriptOrigin).replace(/\/$/, '')
    this.state = { type: 'loading' }
    fetchActivity(base).then((state) => {
      this.state = state
    })
  }

  render() {
    const state = this.state
    let content
    switch (state.type) {
      case 'loading':
        content = html`Loading…`
        break
      case 'unavailable':
        content = html`Unavailable`
        break
      case 'empty':
        content = html`No activity`
        break
      case 'activity': {
        const local = new Date(state.lastActivity).toLocaleString()
        content = html`<time datetime=${state.lastActivity}
          >Timer: ${local}</time
        >`
        break
      }
      default:
        content = nothing
    }
    return html`<div>${content}</div>`
  }
}

if (!customElements.get('pi-activity')) {
  customElements.define('pi-activity', PiActivity)
}
