#!/usr/bin/env node

import { serve } from '@hono/node-server'
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import pkg from '../package.json' with { type: 'json' }
import { mostRecent, readActivity } from './sessions.ts'
import { swaggerUI } from '@hono/swagger-ui'
import { serveStatic } from '@hono/node-server/serve-static'

// Activity response: empty when there is no activity
export const Activity = z
  .strictObject({
    lastActivity: z.iso.datetime().optional().openapi({
      description: 'ISO 8601 timestamp of the most recent message.',
    }),
  })
  .openapi({ description: 'Empty when there is no activity.' })

const getActivity = createRoute({
  method: 'get',
  path: '/activity',
  operationId: 'getActivity',
  summary: 'Get the most recent activity timestamp',
  responses: {
    200: {
      description:
        'The most recent activity. An empty object when no activity is found.',
      content: {
        'application/json': { schema: Activity },
      },
    },
  },
})

// Create Hono app
export const app = new OpenAPIHono()

// GET /activity endpoint
app.openapi(getActivity, async (c) => {
  const lastActivity = mostRecent(await readActivity())
  return c.json(lastActivity ? { lastActivity } : {}, 200)
})

// GET /openapi.json endpoint, spec generated from the routes above
app.doc31('/openapi.json', {
  openapi: '3.1.0',
  info: { title: 'Pi Activity', version: pkg.version },
})

// Serve Swagger UI docs at /docs
app.get('/docs', swaggerUI({ url: '/openapi.json' }))

// Static assets: pages and the built component (public/dist), last so routes above win
app.use('/*', serveStatic({ root: './public' }))
