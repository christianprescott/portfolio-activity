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

const renderedFallback = (card: InstanceType<typeof ActivityCard>) =>
  card.render().values[3] as { strings: readonly string[]; values: unknown[] }

const renderedTemplate = (card: InstanceType<typeof ActivityCard>) =>
  card.render() as { strings: readonly string[]; values: unknown[] }

test('uses the redacted-text component for an unset title with project slot content', () => {
  const card = new ActivityCard()
  const fallback = renderedFallback(card)

  assert.match(
    fallback.strings.join(''),
    /<redacted-text label="REDACTED">project<\/redacted-text>/,
  )
})

test('shows the given title without a redacted overlay', () => {
  const card = new ActivityCard()
  card.title = 'portfolio-activity'
  const rendered = card.render()

  assert.equal(rendered.values[3], 'portfolio-activity')
  assert.equal(typeof rendered.values[4], 'symbol')
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
  const githubIcon = rendered.values[7] as { strings: readonly string[] }

  assert.match(template, /role="link"/)
  assert.match(template, /aria-disabled=/)
  assert.match(template, /tabindex=/)
  assert.match(githubIcon.strings.join(''), /<svg/)
  assert.equal(typeof rendered.values[4], 'symbol')
  assert.equal(rendered.values[5], 'true')
  assert.equal(rendered.values[6], '-1')
  assert.equal(rendered.values[8], 'private')
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

test('renders the repo URL as an interactive link without the private label', () => {
  const card = new ActivityCard()
  card.repoUrl = 'https://github.com/example/repo'
  const rendered = renderedTemplate(card)
  const template = rendered.strings.join('')

  assert.equal(rendered.values[4], card.repoUrl)
  assert.equal(typeof rendered.values[5], 'symbol')
  assert.equal(typeof rendered.values[6], 'symbol')
  assert.match(template, /repo/)
  assert.equal(rendered.values[8], 'repo')
  assert.doesNotMatch(template, /PRIVATE/)
})
