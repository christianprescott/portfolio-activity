import { css } from 'lit'

export const cardStyles = css`
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
  div.card {
    border: 1px solid var(--pi-activity-border-color, currentColor);
    border-radius: 0.5rem;
    padding: 1rem;
    overflow: hidden;
  }
  div.indicator {
    background-color: var(--pi-activity-color, currentColor);
    border-radius: 30%;
    aspect-ratio: 1 / 1;
    display: inline-block;
    align-self: center;
    height: 1lh;
  }
  .flex {
    display: flex;
  }
  .absolute {
    position: absolute;
  }
`
