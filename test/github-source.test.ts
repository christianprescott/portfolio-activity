import assert from 'node:assert/strict'
import { test } from 'node:test'
import { verifyPublicGitHubRepository } from '../src/sources/github.ts'

test('logs non-OK responses and fails closed on request and JSON errors', async () => {
  const originalFetch = globalThis.fetch
  const originalError = console.error
  const errors: string[] = []
  console.error = (...args: unknown[]) => errors.push(args.join(' '))

  try {
    globalThis.fetch = async () =>
      new Response('private response body', { status: 503 })
    assert.equal(
      await verifyPublicGitHubRepository('secret-owner/secret-repo'),
      undefined,
    )

    globalThis.fetch = async () => {
      throw new Error('network failure containing secret-token')
    }
    assert.equal(
      await verifyPublicGitHubRepository('secret-owner/secret-repo'),
      undefined,
    )

    const timeout = new Error('timeout containing secret-token')
    timeout.name = 'TimeoutError'
    globalThis.fetch = async () => {
      throw timeout
    }
    assert.equal(
      await verifyPublicGitHubRepository('secret-owner/secret-repo'),
      undefined,
    )

    assert.equal(errors.length, 1)
    assert.match(errors[0]!, /non-OK response \(503\)/)
    assert.doesNotMatch(
      errors.join('\n'),
      /secret-owner|secret-repo|secret-token|private response body/,
    )

    globalThis.fetch = async () =>
      new Response('invalid response containing secret-token', { status: 200 })
    assert.equal(
      await verifyPublicGitHubRepository('secret-owner/secret-repo'),
      undefined,
    )
    assert.equal(errors.length, 1)
  } finally {
    globalThis.fetch = originalFetch
    console.error = originalError
  }
})
