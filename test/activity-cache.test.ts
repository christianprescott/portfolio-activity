import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createCache } from '../src/cache.ts'

describe('activity cache', () => {
  it('shares a cached promise for the same key across concurrent requests', async () => {
    let calls = 0
    let resolve!: (values: number[]) => void
    const cache = createCache<number[]>({ expiration: 60 })
    const getter = () => {
      calls++
      return new Promise<number[]>((done) => {
        resolve = done
      })
    }

    const first = cache.get('activity', getter)
    const concurrent = cache.get('activity', getter)
    assert.equal(first, concurrent)
    assert.equal(calls, 1)
    resolve([1, 2, 3])
    assert.deepEqual(await first, [1, 2, 3])
    assert.deepEqual(await concurrent, [1, 2, 3])
  })

  it('stores different keys independently', async () => {
    let calls = 0
    const cache = createCache<number>({ expiration: 60 })
    const firstKey = () => Promise.resolve(++calls)
    const secondKey = () => Promise.resolve(++calls)

    assert.equal(await cache.get('first', firstKey), 1)
    assert.equal(await cache.get('second', secondKey), 2)
    assert.equal(await cache.get('first', firstKey), 1)
    assert.equal(await cache.get('second', secondKey), 2)
    assert.equal(calls, 2)
  })

  it('expires entries at timestamp-aligned expiration boundaries', async () => {
    const originalNow = Date.now
    let time = 10_000
    Date.now = () => time
    let calls = 0
    const cache = createCache<number>({ expiration: 2 })
    const getter = () => Promise.resolve(++calls)

    try {
      assert.equal(await cache.get('activity', getter), 1)
      time = 11_999
      assert.equal(await cache.get('activity', getter), 1)
      time = 12_000
      assert.equal(await cache.get('activity', getter), 2)
      assert.equal(calls, 2)
    } finally {
      Date.now = originalNow
    }
  })

  it('disables caching when expiration is zero', async () => {
    let calls = 0
    const cache = createCache<number>({ expiration: 0 })
    const getter = () => Promise.resolve(++calls)

    assert.equal(await cache.get('activity', getter), 1)
    assert.equal(await cache.get('activity', getter), 2)
  })

  it('keeps a rejected getter cached until its bucket changes', async () => {
    let calls = 0
    const originalNow = Date.now
    let time = 60_000
    Date.now = () => time
    const cache = createCache<number>({ expiration: 60 })
    const getter = async () => {
      calls++
      if (calls === 1) throw new Error('failed')
      return 42
    }

    try {
      const first = cache.get('activity', getter)
      const concurrent = cache.get('activity', getter)
      assert.equal(first, concurrent)
      await assert.rejects(first, /failed/)
      await assert.rejects(cache.get('activity', getter), /failed/)
      assert.equal(calls, 1)

      time = 121_000
      assert.equal(await cache.get('activity', getter), 42)
      assert.equal(calls, 2)
    } finally {
      Date.now = originalNow
    }
  })

  it('clears cached values when reset is called', async () => {
    let calls = 0
    const cache = createCache<number>({ expiration: 60 })
    const getter = () => Promise.resolve(++calls)

    assert.equal(await cache.get('activity', getter), 1)
    cache.reset()
    assert.equal(await cache.get('activity', getter), 2)
  })
})
