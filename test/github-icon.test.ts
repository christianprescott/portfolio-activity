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

const { GithubIcon } = await import('../src/components/github-icon.ts')

test('renders an aria-hidden 16px GitHub mark', () => {
  const icon = new GithubIcon()
  const rendered = icon.render() as { strings: readonly string[] }
  const template = rendered.strings.join('')
  const styles = GithubIcon.styles as { cssText: string }

  assert.match(
    template,
    /<svg aria-hidden="true"[^>]*viewBox="0 0 16 16"[^>]*fill="currentColor"/,
  )
  assert.match(template, /<svg[^>]*aria-hidden="true"/)
  assert.match(template, /<path\s+d="M8 0/)
  assert.match(
    styles.cssText,
    /:host\s*\{\s*display:\s*inline-block;\s*width:\s*16px;\s*height:\s*16px;/,
  )
})
