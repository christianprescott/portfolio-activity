import assert from 'node:assert/strict'
import { test } from 'node:test'

Object.defineProperty(globalThis, 'HTMLElement', {
  configurable: true,
  value: class {
    attachShadow() {
      return {
        appendChild() {},
        querySelector() {
          return null
        },
      }
    }
  },
})
Object.defineProperty(globalThis, 'customElements', {
  configurable: true,
  value: { get: () => undefined, define() {} },
})

const { ActivityCard } = await import('../src/components/activity-card.ts')

const renderedTemplate = (card: InstanceType<typeof ActivityCard>) =>
  card.render() as { strings: readonly string[]; values: unknown[] }

test('uses the redacted-text component for an unset title with project slot content', () => {
  const card = new ActivityCard()
  const rendered = renderedTemplate(card)

  assert.ok(rendered.values.some((value) =>
    (value as { strings?: readonly string[] } | null)?.strings?.join('').includes('<redacted-text label="REDACTED">project</redacted-text>'),
  ))
})

test('shows the given title without a redacted overlay', () => {
  const card = new ActivityCard()
  card.title = 'portfolio-activity'
  const rendered = card.render()

  assert.ok(rendered.values.includes('portfolio-activity'))
  assert.ok(rendered.values.some((value) => typeof value === 'symbol'))
})

test('uses the reusable GitHub icon for its repository link without hiding the host', () => {
  const card = new ActivityCard()
  const template = renderedTemplate(card).strings.join('')

  assert.match(template, /<github-icon><\/github-icon\s*>/)
  assert.doesNotMatch(template, /<github-icon[^>]*aria-hidden/)
})

test('renders the icon and private text with a disabled link when repoUrl is unset', () => {
  const card = new ActivityCard()
  const rendered = renderedTemplate(card)
  const template = rendered.strings.join('')
  assert.match(template, /role="link"/)
  assert.match(template, /<github-icon><\/github-icon\s*>/)
  const hrefIndex = rendered.strings.findIndex((part) => /href=$/.test(part))
  assert.notEqual(hrefIndex, -1)
  assert.equal(typeof rendered.values[hrefIndex], 'symbol')
  assert.ok(rendered.values.includes('private'))
})

test('applies the active link color to enabled links while preserving the disabled color', () => {
  const styles = ActivityCard.styles[1] as { cssText: string }

  assert.match(
    styles.cssText,
    /a\[href\]\s*\{\s*color:\s*var\(--portfolio-activity-color-active\);\s*\}/,
  )
  assert.match(
    styles.cssText,
    /a:link,\s*a:visited\s*\{\s*color:\s*var\(--portfolio-activity-color\);\s*\}/,
  )
  assert.doesNotMatch(
    styles.cssText,
    /a\s*\{\s*color:\s*var\(--portfolio-activity-color-active\)/,
  )
  assert.doesNotMatch(styles.cssText, /outline\s*:/)
})

test('keeps the repository link sized to its contents', () => {
  const card = new ActivityCard()
  const template = renderedTemplate(card).strings.join('')
  const styles = ActivityCard.styles[1] as { cssText: string }

  assert.match(template, /class="mono repo-link"/)
  assert.match(styles.cssText, /a\.repo-link\s*\{\s*justify-self:\s*start;\s*\}/)
})

test('renders the repo URL as an interactive link without the private label', () => {
  const card = new ActivityCard()
  card.repoUrl = 'https://github.com/example/repo'
  const rendered = renderedTemplate(card)
  const template = rendered.strings.join('')

  const hrefIndex = rendered.strings.findIndex((part) => /href=$/.test(part))
  assert.notEqual(hrefIndex, -1)
  assert.equal(rendered.values[hrefIndex], card.repoUrl)
  assert.ok(rendered.values.includes('repo'))
  assert.match(template, /repo/)
  assert.doesNotMatch(template, /PRIVATE/)
})
