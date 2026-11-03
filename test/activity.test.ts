import assert from 'node:assert'
import { describe, it, before, after } from 'node:test'
import { app } from '../src/server.ts'
import { readActivity } from '../src/sessions.ts'

const fixtures = new URL('./fixtures/sessions', import.meta.url).pathname
const empty = '/nonexistent'
process.env.PI_CODING_AGENT_SESSION_DIR = empty

describe('Session reading', () => {
  it('maps projects to their latest message', async () => {
    const activity = await readActivity(fixtures)
    assert.strictEqual(activity.length, 1)
    assert.strictEqual(activity[0].project, 'pi-activity')
    assert.match(activity[0].lastMessage, /^2026-11-03T22:32:55\.483Z$/)
  })

  it('returns nothing for a missing directory', async () => {
    assert.deepStrictEqual(await readActivity('/nonexistent'), [])
  })

  it('serves the most recent timestamp', async () => {
    process.env.PI_CODING_AGENT_SESSION_DIR = fixtures
    const res = await app.request('http://localhost/activity')
    assert.deepStrictEqual(await res.json(), {
      lastActivity: '2026-11-03T22:32:55.483Z',
    })
    process.env.PI_CODING_AGENT_SESSION_DIR = empty
  })
})

// In-process tests using Hono's app.request()
describe('Activity API (in-process)', () => {
  it('should return 200 for GET /activity', async () => {
    const res = await app.request('http://localhost/activity', {
      method: 'GET',
    })
    assert.strictEqual(res.status, 200)
    assert.strictEqual(res.headers.get('content-type'), 'application/json')
    const body = (await res.json()) as {}
    assert.deepStrictEqual(body, {})
  })

  it('should return 404 for unknown paths', async () => {
    const res = await app.request('http://localhost/unknown', { method: 'GET' })
    assert.strictEqual(res.status, 404)
    assert.strictEqual(
      res.headers.get('content-type'),
      'text/plain; charset=UTF-8',
    )
  })

  it('should return 404 for POST to /activity (no method handler)', async () => {
    const res = await app.request('http://localhost/activity', {
      method: 'POST',
    })
    assert.strictEqual(res.status, 404)
  })

  it('should return 404 for PUT to /activity', async () => {
    const res = await app.request('http://localhost/activity', {
      method: 'PUT',
    })
    assert.strictEqual(res.status, 404)
  })

  it('should return 404 for DELETE to /activity', async () => {
    const res = await app.request('http://localhost/activity', {
      method: 'DELETE',
    })
    assert.strictEqual(res.status, 404)
  })
})

// Integration tests with actual HTTP server
describe('Activity API (HTTP server)', async () => {
  let port: number

  before(async () => {
    // Find an available port
    const { createServer } = await import('node:http')
    port = await new Promise((resolve, reject) => {
      const srv = createServer()
      srv.listen(0, '127.0.0.1', () => {
        const addr = srv.address()
        srv.close(() => {
          if (typeof addr === 'object' && addr) {
            resolve(addr.port)
          } else {
            reject(new Error('Could not determine port'))
          }
        })
      })
      srv.on('error', reject)
    })
  })

  it('should return 200 for /activity GET on real server', async () => {
    // Import dynamically to get fresh server instance
    const { serve } = await import('@hono/node-server')
    const { app: serverApp } = await import('../src/server.ts')

    const server = serve({
      fetch: serverApp.fetch,
      port,
      hostname: '127.0.0.1',
    })

    try {
      const res = await fetch(`http://127.0.0.1:${port}/activity`)
      assert.strictEqual(res.status, 200)
      assert.strictEqual(res.headers.get('content-type'), 'application/json')
      const body = (await res.json()) as {}
      assert.deepStrictEqual(body, {})
    } finally {
      server.close()
      await new Promise((resolve) => server.on('close', resolve))
    }
  })

  it('should return 404 for unknown paths on real server', async () => {
    const { serve } = await import('@hono/node-server')
    const { app: serverApp } = await import('../src/server.ts')

    const server = serve({
      fetch: serverApp.fetch,
      port,
      hostname: '127.0.0.1',
    })

    try {
      const res = await fetch(`http://127.0.0.1:${port}/unknown`)
      assert.strictEqual(res.status, 404)
      assert.strictEqual(
        res.headers.get('content-type'),
        'text/plain; charset=UTF-8',
      )
    } finally {
      server.close()
      await new Promise((resolve) => server.on('close', resolve))
    }
  })
})
