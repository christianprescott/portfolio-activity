export type CacheConfig = {
  expiration: number
}

export const createCache = <T>({ expiration }: CacheConfig) => {
  let currentBucket: number | undefined
  let cached = new Map<string, Promise<T>>()

  return {
    reset: () => {
      cached.clear()
    },
    get: (key: string, getter: () => Promise<T>) => {
      // Set the duration to zero to disable caching.
      if (expiration === 0) return getter()

      const bucket = Math.floor(Date.now() / (expiration * 1000))
      if (bucket !== currentBucket) {
        currentBucket = bucket
        cached = new Map()
      }
      if (!cached.has(key)) cached.set(key, getter())
      return cached.get(key)!
    },
  }
}
