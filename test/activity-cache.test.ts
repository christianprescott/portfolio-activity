import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createCache } from '../src/server.ts'

describe('activity cache', () => {
  it('shares the full result across concurrent requests', async () => {
    let calls = 0
    let resolve!: (values: number[]) => void
    const originalNow = Date.now
    const originalCacheSeconds = process.env.PORTFOLIO_ACTIVITY_CACHE_SECONDS

    try {
      process.env.PORTFOLIO_ACTIVITY_CACHE_SECONDS = '60'
      Date.now = () => 120_001
      const cache = createCache(() => {
        calls++
        return new Promise<number[]>((done) => {
          resolve = done
        })
      })
      const small = cache.get()
      const large = cache.get()
      assert.equal(calls, 1)
      resolve(Array.from({ length: 10 }, (_, i) => i))
      assert.deepEqual(
        await small,
        Array.from({ length: 10 }, (_, i) => i),
      )
      assert.equal((await large).length, 10)
      assert.equal(calls, 1)
    } finally {
      Date.now = originalNow
      if (originalCacheSeconds === undefined) delete process.env.PORTFOLIO_ACTIVITY_CACHE_SECONDS
      else process.env.PORTFOLIO_ACTIVITY_CACHE_SECONDS = originalCacheSeconds
    }
  })

  it('uses PORTFOLIO_ACTIVITY_CACHE_SECONDS as the cache lifetime', async () => {
    const originalNow = Date.now
    const originalCacheSeconds = process.env.PORTFOLIO_ACTIVITY_CACHE_SECONDS
    let time = 10_000
    try {
      Date.now = () => time
      process.env.PORTFOLIO_ACTIVITY_CACHE_SECONDS = '2'
      let calls = 0
      const cache = createCache(async () => [++calls])
      assert.deepEqual(await cache.get(), [1])
      time = 11_999
      assert.deepEqual(await cache.get(), [1])
      time = 12_000
      assert.deepEqual(await cache.get(), [2])
    } finally {
      Date.now = originalNow
      if (originalCacheSeconds === undefined)
        delete process.env.PORTFOLIO_ACTIVITY_CACHE_SECONDS
      else process.env.PORTFOLIO_ACTIVITY_CACHE_SECONDS = originalCacheSeconds
    }
  })

  it('does not cache when PORTFOLIO_ACTIVITY_CACHE_SECONDS is unset', async () => {
    const originalCacheSeconds = process.env.PORTFOLIO_ACTIVITY_CACHE_SECONDS
    try {
      delete process.env.PORTFOLIO_ACTIVITY_CACHE_SECONDS
      let calls = 0
      const cache = createCache(async () => [++calls])
      assert.deepEqual(await cache.get(), [1])
      assert.deepEqual(await cache.get(), [2])
    } finally {
      if (originalCacheSeconds === undefined)
        delete process.env.PORTFOLIO_ACTIVITY_CACHE_SECONDS
      else process.env.PORTFOLIO_ACTIVITY_CACHE_SECONDS = originalCacheSeconds
    }
  })

  it('does not cache invalid intervals', async () => {
    for (const invalid of ['0', '-1', '1.2', 'NaN']) {
      const original = process.env.PORTFOLIO_ACTIVITY_CACHE_SECONDS
      process.env.PORTFOLIO_ACTIVITY_CACHE_SECONDS = invalid
      let calls = 0
      const cache = createCache(async () => [++calls])
      assert.deepEqual(await cache.get(), [1])
      assert.deepEqual(await cache.get(), [2])
      if (original === undefined) delete process.env.PORTFOLIO_ACTIVITY_CACHE_SECONDS
      else process.env.PORTFOLIO_ACTIVITY_CACHE_SECONDS = original
    }
  })

  it('keeps a rejected build cached until its bucket changes', async () => {
    let calls = 0
    const originalNow = Date.now
    let time = 60_000
    Date.now = () => time
    const originalCacheSeconds = process.env.PORTFOLIO_ACTIVITY_CACHE_SECONDS
    process.env.PORTFOLIO_ACTIVITY_CACHE_SECONDS = '60'
    const cache = createCache(async () => {
      calls++
      if (calls === 1) throw new Error('failed')
      return [42]
    })

    try {
      const first = cache.get()
      const concurrent = cache.get()
      assert.equal(first, concurrent)
      await assert.rejects(first, /failed/)
      await assert.rejects(cache.get(), /failed/)
      assert.equal(calls, 1)

      time = 121_000
      assert.deepEqual(await cache.get(), [42])
      assert.equal(calls, 2)
    } finally {
      Date.now = originalNow
      if (originalCacheSeconds === undefined) delete process.env.PORTFOLIO_ACTIVITY_CACHE_SECONDS
      else process.env.PORTFOLIO_ACTIVITY_CACHE_SECONDS = originalCacheSeconds
    }
  })
})
