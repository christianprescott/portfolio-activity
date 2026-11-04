import assert from 'node:assert'
import { describe, it } from 'node:test'
import { app } from '../src/server.ts'

describe('Static assets (in-process)', () => {
  it('should serve index.html for GET /', async () => {
    const res = await app.request('http://localhost/', { method: 'GET' })
    assert.strictEqual(res.status, 200)
    assert.match(res.headers.get('content-type') ?? '', /^text\/html/)
    assert.match(await res.text(), /<pi-activity>/)
  })

  it('should return 404 for a missing file under /dist', async () => {
    const res = await app.request('http://localhost/dist/missing.js', {
      method: 'GET',
    })
    assert.strictEqual(res.status, 404)
  })

  it('should still serve /activity as JSON, not shadowed by static', async () => {
    const res = await app.request('http://localhost/activity', {
      method: 'GET',
    })
    assert.strictEqual(res.status, 200)
    assert.strictEqual(res.headers.get('content-type'), 'application/json')
  })
})
