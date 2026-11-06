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

const { LoadingCard } = await import('../src/components/loading-card.ts')

test('uses the shared GitHub icon as an invisible repo skeleton', () => {
  const card = new LoadingCard()
  const rendered = card.render() as { strings: readonly string[] }
  const template = rendered.strings.join('')
  const styles = LoadingCard.styles[1] as { cssText: string }

  assert.match(
    template,
    /class="loading w-6">[\s\S]*?<github-icon\s+class="repo-icon-placeholder"\s*><\/github-icon\s*>/,
  )
  assert.doesNotMatch(template, /<github-icon[^>]*aria-hidden/)
  assert.match(
    styles.cssText,
    /\.repo-icon-placeholder\s*\{\s*visibility:\s*hidden;\s*margin-inline-end:\s*0\.25rem;/,
  )
})
