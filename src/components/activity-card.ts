import { LitElement, css, html, nothing } from 'lit'

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

export class ActivityCard extends LitElement {
  static properties = {
    activeAt: { attribute: false },
    text: { type: String },
  }

  declare activeAt: Date
  declare text: String

  static styles = css`
    a:link,
    a:visited {
      color: color-mix(in srgb, var(--pi-activity-color) 70%, transparent);
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
    .flex {
      display: flex;
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
        color-mix(in srgb, var(--pi-activity-border-color) 30%, transparent);
      border-radius: 0.5rem;
      padding: 1rem;
    }
    div.indicator {
      background-color: #888;
      border-radius: 30%;
      aspect-ratio: 1/1;
      display: inline-block;
      align-self: center;
      height: 1rem;
    }
    .indicator.active {
      background-color: var(--pi-activity-color-success);
    }
  `

  render() {
    const twentyMinutesAgo = Date.now() - 20 * 60 * 1000
    const ninetyMinutesAgo = Date.now() - 90 * 60 * 1000
    return html`<div class="grid card gap">
      <div class="flex">
        ${this.activeAt?.getTime() > twentyMinutesAgo ? html`<div class="indicator absolute ping"></div>` : nothing}
        ${this.activeAt?.getTime() > ninetyMinutesAgo ? html`<div class="indicator active"></div>` : nothing}
        ${!this.activeAt ? html`<div class="indicator"></div>` : nothing}
      </div>
      <!-- TODO: project title -->
      <!-- <div class="mono bold">project</div> -->
      <div>
        <slot></slot>
      </div>
      <!-- TODO: link to github -->
      <!--<a class="mono" href="#">
          ${githubIcon}repo
          </a>-->
    </div>`
  }
}

if (!customElements.get('activity-card')) {
  customElements.define('activity-card', ActivityCard)
}
