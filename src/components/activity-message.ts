import { LitElement, html, nothing } from 'lit'
import type { ActivitySource } from './activity-source.ts'

const recentActivityDuration = 20 * 60_000
const relativeTimeUnits = [
  { unit: 'second', duration: 1_000, threshold: 60 },
  { unit: 'minute', duration: 60_000, threshold: 60 },
  { unit: 'hour', duration: 3_600_000, threshold: 24 },
  { unit: 'day', duration: 86_400_000, threshold: 7 },
  { unit: 'week', duration: 604_800_000, threshold: 5 },
  { unit: 'month', duration: 2_592_000_000, threshold: 12 },
  { unit: 'year', duration: 31_536_000_000, threshold: Infinity },
] as const

const activityMessages: Record<
  ActivitySource,
  { present: string; past: string }
> = {
  git: {
    present: 'is committing',
    past: 'committed',
  },
  pi: {
    present: 'is working agentically',
    past: 'was working agentically',
  },
}

export class ActivityMessage extends LitElement {
  static properties = {
    activeAt: { attribute: false },
    displayName: { type: String },
    source: { type: String },
  }

  declare activeAt: Date
  declare displayName: string
  declare source: ActivitySource

  private relativeTimeTimer: ReturnType<typeof setInterval> | undefined

  connectedCallback() {
    super.connectedCallback()
    if (!this.relativeTimeTimer) {
      this.relativeTimeTimer = setInterval(() => this.requestUpdate(), 60_000)
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    if (this.relativeTimeTimer) {
      clearInterval(this.relativeTimeTimer)
      this.relativeTimeTimer = undefined
    }
  }

  getMessageText(): string {
    const now = Date.now()
    const age = now - this.activeAt.getTime()
    const isRecent = age >= 0 && age < recentActivityDuration
    const messages = activityMessages[this.source]
    const phrase = isRecent ? messages.present : messages.past
    const difference = this.activeAt.getTime() - now
    const absoluteDifference = Math.abs(difference)
    const { unit, duration } =
      relativeTimeUnits.find(
        ({ duration, threshold }) => absoluteDifference < duration * threshold,
      ) ?? relativeTimeUnits.at(-1)!
    const value = Math.round(difference / duration)
    const time = isRecent
      ? 'right now'
      : new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(
          value,
          unit,
        )

    return `${this.displayName} ${phrase} ${time}`
  }

  render() {
    if (!this.activeAt) return nothing

    return html`<time datetime=${this.activeAt.toISOString()}>
      ${this.getMessageText()}
    </time>`
  }
}

const customElementRegistry = Reflect.get(globalThis, 'customElements') as
  | {
      get(name: string): unknown
      define(name: string, constructor: typeof ActivityMessage): void
    }
  | undefined

if (customElementRegistry && !customElementRegistry.get('activity-message')) {
  customElementRegistry.define('activity-message', ActivityMessage)
}
