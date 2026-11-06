import assert from 'node:assert'
import { describe, it } from 'node:test'

const originalAllowedOrigins = process.env.PORTFOLIO_ACTIVITY_ALLOWED_ORIGINS
process.env.PORTFOLIO_ACTIVITY_ALLOWED_ORIGINS =
  ' https://portfolio.example ; https://second.example '
const { app: serverApp } = await import('../src/server.ts')

if (originalAllowedOrigins === undefined) {
  delete process.env.PORTFOLIO_ACTIVITY_ALLOWED_ORIGINS
} else {
  process.env.PORTFOLIO_ACTIVITY_ALLOWED_ORIGINS = originalAllowedOrigins
}

describe('activity CORS', () => {
  it('allows the configured origin on API, docs, and static routes', async () => {
    const routes = [
      ['/', 200],
      ['/activity', 200],
      ['/openapi.json', 200],
      ['/docs', 200],
      ['/dist/portfolio-activity.js', 200],
      ['/missing-route', 404],
    ] as const

    for (const [path, status] of routes) {
      const res = await serverApp.request(`http://localhost${path}`, {
        headers: { Origin: 'https://portfolio.example' },
      })

      assert.strictEqual(res.status, status, path)
      assert.strictEqual(
        res.headers.get('access-control-allow-origin'),
        'https://portfolio.example',
        path,
      )
      assert.match(res.headers.get('vary') ?? '', /(?:^|,\s*)Origin(?:,|$)/i)
    }
  })

  it('allows each semicolon-separated origin after trimming whitespace', async () => {
    const res = await serverApp.request('http://localhost/activity', {
      headers: { Origin: 'https://second.example' },
    })

    assert.strictEqual(res.status, 200)
    assert.strictEqual(
      res.headers.get('access-control-allow-origin'),
      'https://second.example',
    )
  })

  it('requires an exact configured origin and does not split comma-separated origins', async () => {
    for (const origin of [
      'https://attacker.example',
      'https://portfolio.example/',
      'https://portfolio.example,https://second.example',
    ]) {
      const res = await serverApp.request('http://localhost/activity', {
        headers: { Origin: origin },
      })

      assert.strictEqual(res.status, 200)
      assert.strictEqual(res.headers.get('access-control-allow-origin'), null)
    }
  })

  it('handles allowed preflight requests and varies on requested headers', async () => {
    const res = await serverApp.request('http://localhost/activity', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://portfolio.example',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'X-Requested-With',
      },
    })

    assert.strictEqual(res.status, 204)
    assert.strictEqual(
      res.headers.get('access-control-allow-origin'),
      'https://portfolio.example',
    )
    assert.match(res.headers.get('access-control-allow-methods') ?? '', /GET/)
    assert.strictEqual(
      res.headers.get('access-control-allow-headers'),
      'X-Requested-With',
    )
    const vary = res.headers.get('vary') ?? ''
    assert.match(vary, /(?:^|,\s*)Origin(?:,|$)/i)
    assert.match(vary, /Access-Control-Request-Headers/i)
  })

  it('does not grant preflight access to an unconfigured origin', async () => {
    const res = await serverApp.request('http://localhost/activity', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://attacker.example',
        'Access-Control-Request-Method': 'GET',
      },
    })

    assert.strictEqual(res.status, 204)
    assert.strictEqual(res.headers.get('access-control-allow-origin'), null)
  })

  it('does not grant cross-origin access when the setting is unset', async () => {
    const configuredOrigins = process.env.PORTFOLIO_ACTIVITY_ALLOWED_ORIGINS
    delete process.env.PORTFOLIO_ACTIVITY_ALLOWED_ORIGINS
    const unsetServerUrl = new URL(
      '../src/server.ts?cors-unset',
      import.meta.url,
    )
    const { app } = await import(unsetServerUrl.href)
    if (configuredOrigins !== undefined) {
      process.env.PORTFOLIO_ACTIVITY_ALLOWED_ORIGINS = configuredOrigins
    }

    const res = await app.request('http://localhost/activity', {
      headers: { Origin: 'https://portfolio.example' },
    })
    assert.strictEqual(res.status, 200)
    assert.strictEqual(res.headers.get('access-control-allow-origin'), null)
  })

  it('does not split a comma-separated setting into multiple allowed origins', async () => {
    process.env.PORTFOLIO_ACTIVITY_ALLOWED_ORIGINS =
      'https://portfolio.example,https://second.example'
    const commaServerUrl = new URL(
      '../src/server.ts?cors-comma',
      import.meta.url,
    )
    const { app } = await import(commaServerUrl.href)
    if (originalAllowedOrigins === undefined) {
      delete process.env.PORTFOLIO_ACTIVITY_ALLOWED_ORIGINS
    } else {
      process.env.PORTFOLIO_ACTIVITY_ALLOWED_ORIGINS = originalAllowedOrigins
    }

    const res = await app.request('http://localhost/activity', {
      headers: { Origin: 'https://portfolio.example' },
    })
    assert.strictEqual(res.status, 200)
    assert.strictEqual(res.headers.get('access-control-allow-origin'), null)
  })
})
