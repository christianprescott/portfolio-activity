#!/usr/bin/env node

import { serve } from '@hono/node-server'
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import pkg from '../package.json' with { type: 'json' }
import { readPiActivity } from './sources/pi.ts'
import { readGitActivity } from './sources/git.ts'
import { swaggerUI } from '@hono/swagger-ui'
import { serveStatic } from '@hono/node-server/serve-static'

// Activity response, ordered from most recent to oldest.
export const Activity = z
  .array(
    z.strictObject({
      title: z.string(),
      source: z.enum(['pi', 'git']),
      activeAt: z.iso.datetime().openapi({
        description: 'ISO 8601 timestamp of the activity.',
      }),
    }),
  )
  .openapi({ description: 'Empty when no project activity is found.' })

const getActivity = createRoute({
  method: 'get',
  path: '/activity',
  operationId: 'getActivity',
  summary: 'Get project activity sorted by most recent',
  responses: {
    200: {
      description:
        'Project activity, sorted from most recent to oldest. An empty array when no activity is found.',
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
  const sources = await Promise.all([readPiActivity(), readGitActivity()])
  const activity = sources.flat()
  const response = activity.sort((a, b) =>
    b.activeAt.localeCompare(a.activeAt),
  )
  return c.json(response, 200)
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
