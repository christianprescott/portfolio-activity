// Shows the most recent activity timestamp from the /activity API.

import { LitElement, css, html } from 'lit'
import type { ActivitySource } from './activity-source.ts'
import './activity-card.ts'
import './activity-message.ts'
import './loading-card.ts'

export type { ActivitySource } from './activity-source.ts'

type Activity = {
  title?: string
  source: ActivitySource
  activeAt: string
  repoUrl?: string
}

type ActivityState = {
  loading: Boolean
  errorText: string | undefined
  activities: Activity[]
}

const scriptOrigin = new URL(import.meta.url).origin
const defaultActivityCount = 10

const fetchActivities = async (
  base: string,
  count: number,
): Promise<Activity[]> => {
  const query = new URLSearchParams({ count: String(count) })
  const res = await fetch(`${base}/activity?${query}`)
  // TODO: throw error class
  if (!res.ok) throw `${res.status} ${res.statusText}`
  // TODO: use openapi client
  return (await res.json()) as Activity[]
}

export class PortfolioActivity extends LitElement {
  static properties = {
    displayName: { type: String },
    count: { type: Number },
    src: { type: String },
    state: { state: true },
  }

  static styles = css`
    :host {
      --portfolio-activity-font-serif: 'EB Garamond', Georgia, serif;
      --portfolio-activity-font-mono: 'Fragment Mono', ui-monospace, monospace;
      --portfolio-activity-color: color-mix(in srgb, currentColor 70%, transparent);
      --portfolio-activity-color-success: #00ff93;
      --portfolio-activity-color-active: #009fff;
      --portfolio-activity-border-color: color-mix(
        in srgb,
        var(--portfolio-activity-color) 30%,
        transparent
      );
      display: block;
      font-family: var(--portfolio-activity-font-serif);
      color: var(--portfolio-activity-color);
    }
  `

  declare displayName: string
  declare count: number
  declare src: string | undefined
  declare state: ActivityState
  constructor() {
    super()
    this.count = defaultActivityCount
    this.state = {
      loading: true,
      errorText: undefined,
      activities: [],
    }
  }

  connectedCallback() {
    super.connectedCallback()
    this.loadActivities()
  }

  private loadActivities() {
    const base = (this.src || scriptOrigin).replace(/\/$/, '')
    fetchActivities(base, this.count)
      .then((activities) => {
        this.state = {
          loading: false,
          errorText: undefined,
          activities,
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
      return Array.from(
        { length: this.count },
        () => html`<loading-card></loading-card>`,
      )
    } else if (this.state.errorText) {
      return html`<activity-card title="afk">
        ${this.state.errorText}
      </activity-card>`
    } else {
      return this.state.activities.map((a) => {
        const local = new Date(a.activeAt)
        return html`<activity-card
          title=${a.title}
          .repoUrl=${a.repoUrl}
          .activeAt=${local}
        >
          <activity-message
            .displayName=${this.displayName}
            .source=${a.source}
            .activeAt=${local}
          ></activity-message>
        </activity-card>`
      })
    }
  }
}

if (!customElements.get('portfolio-activity')) {
  customElements.define('portfolio-activity', PortfolioActivity)
}
