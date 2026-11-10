import assert from 'node:assert/strict'
import { test } from 'node:test'
let importNumber = 0
const loadVerifier = async (expiration: string | undefined) => {
  const variable = 'PORTFOLIO_ACTIVITY_GITHUB_CACHE_SECONDS'
  const previous = process.env[variable]
  if (expiration === undefined) delete process.env[variable]
  else process.env[variable] = expiration

  try {
    return (await import(`../src/sources/github.ts?test=${importNumber++}`))
      .verifyPublicGitHubRepository
  } finally {
    if (previous === undefined) delete process.env[variable]
    else process.env[variable] = previous
  }
}

test('caches repository lookups independently and expires at configured boundaries', async () => {
  const verify = await loadVerifier('2')
  const originalFetch = globalThis.fetch
  const originalNow = Date.now
  let time = 10_000
  let calls = 0
  Date.now = () => time
  globalThis.fetch = async () => {
    calls++
    return Response.json({ private: false, name: 'repo' })
  }

  try {
    assert.equal(await verify('first/repo'), 'https://github.com/first/repo')
    assert.equal(await verify('first/repo'), 'https://github.com/first/repo')
    assert.equal(await verify('second/repo'), 'https://github.com/second/repo')
    assert.equal(await verify('second/repo'), 'https://github.com/second/repo')
    assert.equal(calls, 2)

    time = 11_999
    assert.equal(await verify('first/repo'), 'https://github.com/first/repo')
    assert.equal(calls, 2)
    time = 12_000
    assert.equal(await verify('first/repo'), 'https://github.com/first/repo')
    assert.equal(calls, 3)
  } finally {
    globalThis.fetch = originalFetch
    Date.now = originalNow
  }
})

test('uses a one-hour cache by default', async () => {
  const verify = await loadVerifier(undefined)
  const originalFetch = globalThis.fetch
  const originalNow = Date.now
  let time = 0
  let calls = 0
  Date.now = () => time
  globalThis.fetch = async () => {
    calls++
    return Response.json({ private: false, name: 'repo' })
  }

  try {
    await verify('owner/repo')
    time = 3_599_999
    await verify('owner/repo')
    assert.equal(calls, 1)
    time = 3_600_000
    await verify('owner/repo')
    assert.equal(calls, 2)
  } finally {
    globalThis.fetch = originalFetch
    Date.now = originalNow
  }
})

test('disables repository caching when configured with zero seconds', async () => {
  const verify = await loadVerifier('0')
  const originalFetch = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => {
    calls++
    return Response.json({ private: false, name: 'repo' })
  }

  try {
    await verify('owner/repo')
    await verify('owner/repo')
    assert.equal(calls, 2)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('logs non-OK responses and fails closed on request and JSON errors', async () => {
  const verify = await loadVerifier('0')
  const originalFetch = globalThis.fetch
  const originalError = console.error
  const errors: string[] = []
  console.error = (...args: unknown[]) => errors.push(args.join(' '))

  try {
    globalThis.fetch = async () =>
      new Response('private response body', { status: 503 })
    assert.equal(await verify('secret-owner/secret-repo'), undefined)

    globalThis.fetch = async () => {
      throw new Error('network failure containing secret-token')
    }
    assert.equal(await verify('secret-owner/secret-repo'), undefined)

    const timeout = new Error('timeout containing secret-token')
    timeout.name = 'TimeoutError'
    globalThis.fetch = async () => {
      throw timeout
    }
    assert.equal(await verify('secret-owner/secret-repo'), undefined)

    assert.equal(errors.length, 1)
    assert.match(errors[0]!, /non-OK response \(503\)/)
    assert.doesNotMatch(
      errors.join('\n'),
      /secret-owner|secret-repo|secret-token|private response body/,
    )

    globalThis.fetch = async () =>
      new Response('invalid response containing secret-token', { status: 200 })
    assert.equal(await verify('secret-owner/secret-repo'), undefined)
    assert.equal(errors.length, 1)
  } finally {
    globalThis.fetch = originalFetch
    console.error = originalError
  }
})
