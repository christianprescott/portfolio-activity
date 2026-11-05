import assert from 'node:assert'
import { describe, it } from 'node:test'
import { app } from '../src/server.ts'

describe('Static assets (in-process)', () => {
  it('should serve index.html for GET /', async () => {
    const res = await app.request('http://localhost/', { method: 'GET' })
    assert.strictEqual(res.status, 200)
    assert.match(res.headers.get('content-type') ?? '', /^text\/html/)
    assert.match(await res.text(), /<pi-activity[\s>]/)
  })

  it('documents the activity count query parameter in OpenAPI', async () => {
    const res = await app.request('http://localhost/openapi.json')
    assert.strictEqual(res.status, 200)
    const spec = (await res.json()) as {
      paths: {
        '/activity': {
          get: {
            parameters: {
              name: string
              in: string
              schema?: { maximum?: number }
            }[]
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: {
                      items: {
                        properties: {
                          title: { description?: string }
                          repoUrl: { description?: string }
                        }
                        required: string[]
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    const operation = spec.paths['/activity'].get
    const countParameter = operation.parameters.find(
      ({ name, in: location }) => name === 'count' && location === 'query',
    )
    assert.ok(countParameter)
    assert.strictEqual(countParameter.schema?.maximum, 10)
    const itemSchema =
      operation.responses['200'].content['application/json'].schema.items
    assert.strictEqual(
      itemSchema.properties.title.description,
      'Local project directory name, included only for a verified public GitHub repository.',
    )
    assert.ok(!itemSchema.required.includes('title'))
    assert.strictEqual(
      itemSchema.properties.repoUrl.description,
      'Canonical URL of a verified public GitHub repository.',
    )
    assert.ok(!itemSchema.required.includes('repoUrl'))
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
