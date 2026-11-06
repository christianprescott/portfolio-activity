import assert from 'node:assert'
import { describe, it } from 'node:test'
import { app } from '../src/server.ts'

describe('secure response headers', () => {
  it('sets Hono secure headers on API, docs, and static asset routes', async () => {
    const routes = [
      '/activity',
      '/openapi.json',
      '/docs',
      '/',
      '/dist/portfolio-activity.js',
    ]

    for (const path of routes) {
      const res = await app.request(`http://localhost${path}`)
      assert.strictEqual(res.status, 200, path)
      assert.strictEqual(
        res.headers.get('cross-origin-resource-policy'),
        'cross-origin',
        path,
      )
      assert.strictEqual(
        res.headers.get('cross-origin-opener-policy'),
        'same-origin',
        path,
      )
      assert.strictEqual(res.headers.get('origin-agent-cluster'), '?1', path)
      assert.strictEqual(
        res.headers.get('referrer-policy'),
        'no-referrer',
        path,
      )
      assert.strictEqual(
        res.headers.get('strict-transport-security'),
        'max-age=15552000; includeSubDomains',
        path,
      )
      assert.strictEqual(
        res.headers.get('x-content-type-options'),
        'nosniff',
        path,
      )
      assert.strictEqual(res.headers.get('x-dns-prefetch-control'), 'off', path)
      assert.strictEqual(res.headers.get('x-download-options'), 'noopen', path)
      assert.strictEqual(res.headers.get('x-frame-options'), 'SAMEORIGIN', path)
      assert.strictEqual(
        res.headers.get('x-permitted-cross-domain-policies'),
        'none',
        path,
      )
      assert.strictEqual(res.headers.get('x-xss-protection'), '0', path)
      assert.strictEqual(res.headers.get('x-powered-by'), null, path)
    }
  })
})
