import { LitElement, css, html } from 'lit'
import { cardStyles } from './card-styles.ts'

export class LoadingCard extends LitElement {
  static styles = [
    cardStyles,
    css`
      .loading {
        background-color: var(--pi-activity-color, currentColor);
        border-radius: 1lh;
        span {
          visibility: hidden;
        }
      }
      .w-12 {
        width: 70%;
        min-width: 6rem;
        max-width: 12rem;
      }
      .w-18 {
        width: 100%;
        max-width: 18rem;
      }
    `,
  ]

  render() {
    return html`<div class="grid card gap">
      <div class="indicator"></div>
      <div class="loading w-12"><span>Loading</span></div>
      <div class="loading w-18"><span>Loading</span></div>
    </div>`
  }
}

if (!customElements.get('loading-card')) {
  customElements.define('loading-card', LoadingCard)
}
