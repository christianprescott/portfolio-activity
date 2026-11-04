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

// GitHub mark, from the MIT-licensed Octicons set:
// https://github.com/primer/octicons/blob/main/icons/mark-github-16.svg
const githubIcon = html`<svg
  viewBox="0 0 16 16"
  width="16"
  height="16"
  fill="currentColor"
  aria-hidden="true"
>
  <path
    d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
  />
</svg>`

export class PiActivity extends LitElement {
  static properties = {
    state: { state: true },
  }

  static styles = css`
    :host {
      --pi-activity-font-serif: 'EB Garamond', Georgia, serif;
      --pi-activity-font-mono: 'Fragment Mono', ui-monospace, monospace;
      --pi-activity-color-success: #00ff93;
      --pi-activity-color-active: #009fff;
      display: block;
      font-family: var(--pi-activity-font-serif);
    }
    :host,
    a:link,
    a:visited {
      color: color-mix(
        in srgb,
        var(--pi-activity-border-color, currentColor) 70%,
        transparent
      );
    }
    a:hover {
      color: var(--pi-activity-color-active);
    }
    a svg {
      margin-inline-end: 0.25rem;
    }

    .mono {
      font-family: var(--pi-activity-font-mono);
    }
    .bold {
      font-weight: bold;
    }
    .absolute {
      position: absolute;
    }
    .grid {
      display: grid;
      grid-template-columns: auto 1fr;
    }
    .grid > :nth-child(n + 3) {
      grid-column: span 2;
    }
    .gap {
      gap: 0.5rem;
    }
    .ping {
      animation: ping 5s cubic-bezier(0, 0, 0.2, 1) infinite;
    }
    @keyframes ping {
      20%,
      100% {
        transform: scale(3);
        opacity: 0;
      }
    }

    div.card {
      border: 1px solid
        color-mix(
          in srgb,
          var(--pi-activity-border-color, currentColor) 30%,
          transparent
        );
      border-radius: 0.5rem;
      padding: 1rem;
    }
    div.indicator {
      background-color: var(--pi-activity-color-success);
      border-radius: 30%;
      aspect-ratio: 1/1;
      display: inline-block;
      align-self: center;
      height: 1rem;
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
          >Christian was writing code at: ${local}</time
        >`
        break
      }
      default:
        content = nothing
    }
    return html`<div class="grid card gap">
          <div>
            <div class="indicator absolute ping"></div>
            <div class="indicator"></div>
          </div>
          <!-- TODO: project title -->
          <!-- <div class="mono bold">project</div> -->
        <div>${content}</div>
        <!-- TODO: link to github -->
        <!-- <a class="mono" href="#">
          ${githubIcon}repo
        </a> -->
    </div>`
  }
}

if (!customElements.get('pi-activity')) {
  customElements.define('pi-activity', PiActivity)
}
