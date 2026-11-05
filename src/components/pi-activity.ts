// Shows the most recent activity timestamp from the /activity API.

import { LitElement, css, html, nothing } from 'lit'
import './activity-card.ts'
import './loading-card.ts'

type Activity = {
  activeAt: string
}
type ActivityState = {
  loading: Boolean
  errorText: string | undefined
  activities: Activity[]
}

const scriptOrigin = new URL(import.meta.url).origin

const fetchActivity = async (base: string): Promise<string> => {
  const res = await fetch(`${base}/activity`)
  if (!res.ok) throw `${res.status} ${res.statusText}`
  const body = await res.json()
  const last = (body as { lastActivity?: unknown } | null)?.lastActivity
  if (typeof last === 'string' && !Number.isNaN(Date.parse(last))) {
    return last
  }
  throw 'No activity'
}

export class PiActivity extends LitElement {
  static properties = {
    displayName: { type: String, attribute: 'display-name' },
    state: { state: true },
  }

  static styles = css`
    :host {
      --pi-activity-font-serif: 'EB Garamond', Georgia, serif;
      --pi-activity-font-mono: 'Fragment Mono', ui-monospace, monospace;
      --pi-activity-color: color-mix(in srgb, currentColor 70%, transparent);
      --pi-activity-color-success: #00ff93;
      --pi-activity-color-active: #009fff;
      --pi-activity-border-color: color-mix(
        in srgb,
        var(--pi-activity-color) 30%,
        transparent
      );
      display: block;
      font-family: var(--pi-activity-font-serif);
      color: var(--pi-activity-color);
    }
  `

  declare displayName: String
  declare state: ActivityState

  constructor() {
    super()
    this.state = {
      loading: true,
      errorText: undefined,
      activities: [],
    }
  }

  connectedCallback() {
    super.connectedCallback()
    const base = (this.getAttribute('src') || scriptOrigin).replace(/\/$/, '')
    fetchActivity(base)
      .then((last) => {
        this.state = {
          loading: false,
          errorText: undefined,
          activities: [{ activeAt: last }],
        }
      })
      .catch((e) => {
        console.error(e)
        this.state = {
          loading: false,
          errorText: `${this.displayName} is afk for now...`,
          activities: [],
        }
      })
  }

  render() {
    if (this.state.loading) {
      return html`<loading-card></loading-card>`
    } else if (this.state.errorText) {
      return html`<activity-card> ${this.state.errorText} </activity-card>`
    } else {
      return this.state.activities.map((a) => {
        const local = new Date(a.activeAt)
        return html`<activity-card .activeAt=${local}>
          <time datetime=${a.activeAt}>
            ${this.displayName} was writing code at: ${local.toLocaleString()}
          </time>
        </activity-card>`
      })
    }
  }
}

if (!customElements.get('pi-activity')) {
  customElements.define('pi-activity', PiActivity)
}
