import { LitElement, css, html } from 'lit'

export class RedactedText extends LitElement {
  static properties = {
    label: { type: String },
  }

  declare label: string

  private readonly rotation = Math.random() * 24 - 12

  static styles = css`
    :host {
      display: inline-block;
    }
    .content {
      position: relative;
      display: inline-block;
    }
    .label {
      position: absolute;
      top: 50%;
      left: 0;
      display: inline-block;
      padding: 0.05em 0.4em;
      color: #fff;
      background-color: #333;
      transform: translateY(-50%) rotate(var(--redacted-rotation));
    }
  `

  render() {
    return html`<span class="content">
      <slot></slot>
      <span class="label" style="--redacted-rotation: ${this.rotation}deg"
        >${this.label}</span
      >
    </span>`
  }
}

if (!customElements.get('redacted-text')) {
  customElements.define('redacted-text', RedactedText)
}
