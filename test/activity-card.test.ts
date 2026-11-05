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
  card.title = 'pi-activity'
  const rendered = card.render()

  assert.equal(rendered.values[3], 'pi-activity')
  assert.equal(typeof rendered.values[4], 'symbol')
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

test('applies the active link color only to navigable hover and focus-visible links', () => {
  const styles = ActivityCard.styles[1] as { cssText: string }

  assert.match(
    styles.cssText,
    /a\[href\]:hover,\s*a\[href\]:focus-visible\s*\{\s*color:\s*var\(--pi-activity-color-active\);\s*\}/,
  )
  assert.doesNotMatch(styles.cssText, /a:hover\s*\{/)
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
