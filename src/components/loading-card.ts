import { LitElement, css, html } from 'lit'
import { cardStyles } from './card-styles.ts'
import './github-icon.ts'

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
      .loading,
      .indicator {
        background-image: linear-gradient(
          100deg,
          transparent 20%,
          color-mix(in srgb, var(--pi-activity-color, currentColor) 20%, Canvas)
            50%,
          transparent 80%
        );
        background-size: 200% 100%;
        animation: shimmer 1.5s ease-in-out infinite;
      }
      @keyframes shimmer {
        from {
          background-position: 100% 0;
        }
        to {
          background-position: -100% 0;
        }
      }
      .repo-icon-placeholder {
        visibility: hidden;
        margin-inline-end: 0.25rem;
      }
      .w-6,
      .w-12 {
        font-family: var(--pi-activity-font-mono);
      }
      .w-6 {
        width: 100%;
        min-width: 2rem;
        max-width: 6rem;
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
      <div class="loading w-6">
        <github-icon class="repo-icon-placeholder"></github-icon
        ><span>Loading</span>
      </div>
    </div>`
  }
}

if (!customElements.get('loading-card')) {
  customElements.define('loading-card', LoadingCard)
}
