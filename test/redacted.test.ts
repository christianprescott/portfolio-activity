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

const { RedactedText } = await import('../src/components/redacted.ts')

test('renders default slot content with the configured label', () => {
  const redacted = new RedactedText()
  redacted.label = 'PRIVATE'
  const rendered = redacted.render() as {
    strings: readonly string[]
    values: unknown[]
  }

  assert.match(rendered.strings.join(''), /<slot><\/slot>/)
  assert.match(rendered.strings.join(''), /class="label"/)
  assert.equal(rendered.values[1], 'PRIVATE')
  assert.equal(RedactedText.properties.label.type, String)
  assert.ok(RedactedText.observedAttributes.includes('label'))
})

test('randomizes rotation once per component within five degrees', () => {
  const originalRandom = Math.random
  let randomCalls = 0
  Math.random = () => {
    randomCalls += 1
    return randomCalls === 1 ? 0.75 : 0.25
  }

  try {
    const first = new RedactedText()
    const firstRotation = (first.render() as { values: unknown[] }).values[0]
    const rerenderedRotation = (first.render() as { values: unknown[] })
      .values[0]
    const second = new RedactedText()
    const secondRotation = (second.render() as { values: unknown[] }).values[0]

    assert.equal(firstRotation, 2.5)
    assert.equal(rerenderedRotation, firstRotation)
    assert.equal(secondRotation, -2.5)
    assert.ok((firstRotation as number) >= -5)
    assert.ok((firstRotation as number) <= 5)
    assert.ok((secondRotation as number) >= -5)
    assert.ok((secondRotation as number) <= 5)
    assert.equal(randomCalls, 2)
    assert.match(
      RedactedText.styles.cssText,
      /rotate\(var\(--redacted-rotation\)\)/,
    )
  } finally {
    Math.random = originalRandom
  }
})
