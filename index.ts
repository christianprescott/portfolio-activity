#!/usr/bin/env node

import { serve } from '@hono/node-server'
import { app } from './src/server.ts'

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000
const host = process.env.HOST || '0.0.0.0'

const server = serve({
  fetch: app.fetch,
  port,
  hostname: host,
})

server.on('listening', () => {
  console.log(`Server running on http://${host}:${port}`)
})

let shuttingDown = false

const shutdown = () => {
  if (shuttingDown) return
  shuttingDown = true

  server.close((error) => {
    if (error) {
      console.error('Error closing server:', error)
      process.exitCode = 1
    }
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
