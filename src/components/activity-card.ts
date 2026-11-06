import { LitElement, css, html, nothing } from 'lit'
import { cardStyles } from './card-styles.ts'
import './redacted.ts'
import './github-icon.ts'

export class ActivityCard extends LitElement {
  static properties = {
    activeAt: { attribute: false },
    text: { type: String },
    title: { type: String },
    repoUrl: { type: String },
  }

  declare activeAt: Date
  declare text: string
  declare title: string
  declare repoUrl: string | undefined

  static styles = [
    cardStyles,
    css`
      a:link,
      a:visited {
        color: var(--portfolio-activity-color);
      }
      a[href] {
        color: var(--portfolio-activity-color-active);
      }
      a github-icon {
        margin-inline-end: 0.25rem;
      }

      .mono {
        font-family: var(--portfolio-activity-font-mono);
      }
      .bold {
        font-weight: bold;
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

      .indicator.active {
        background-color: var(--portfolio-activity-color-success);
      }
    `,
  ]

  render() {
    const twentyMinutesAgo = Date.now() - 20 * 60 * 1000
    const ninetyMinutesAgo = Date.now() - 90 * 60 * 1000
    return html`<div class="grid card gap">
      <div class="flex">
        ${this.activeAt?.getTime() > twentyMinutesAgo ? html`<div class="indicator active absolute ping"></div>` : nothing}
        ${this.activeAt?.getTime() > ninetyMinutesAgo ? html`<div class="indicator active"></div>` : nothing}
        ${!this.activeAt || this.activeAt?.getTime() < ninetyMinutesAgo ? html`<div class="indicator"></div>` : nothing}
      </div>
      <div class="mono bold">
        ${
          this.title
            ? this.title
            : html`<redacted-text label="REDACTED">project</redacted-text>`
        }
      </div>
      <div>
        <slot></slot>
      </div>
      <a
        class="mono"
        role="link"
        href=${this.repoUrl || nothing}
        target="_blank"
        rel="noopener noreferrer"
        ><github-icon></github-icon
        >${this.repoUrl ? 'repo' : 'private'}</a
      >
    </div>`
  }
}

if (!customElements.get('activity-card')) {
  customElements.define('activity-card', ActivityCard)
}
