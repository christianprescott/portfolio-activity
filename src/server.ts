#!/usr/bin/env node

import { serve } from '@hono/node-server'
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import pkg from '../package.json' with { type: 'json' }
import { readPiActivity } from './sources/pi.ts'
import { readGitActivity } from './sources/git.ts'
import { swaggerUI } from '@hono/swagger-ui'
import { serveStatic } from '@hono/node-server/serve-static'

// Activity response, with one most-recent entry per project.
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
  summary: 'Get the most recent activity for each project',
  request: {
    query: z.object({
      count: z.coerce.number().int().min(1).max(100).default(10).openapi({
        description: 'Maximum number of activities to return (1–100).',
        example: 6,
      }),
    }),
  },
  responses: {
    200: {
      description:
        'Up to count activities, ordered from most recent to oldest (default 10, maximum 100). An empty array when no activity is found.',
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
  const { count } = c.req.valid('query')
  const sources = await Promise.all([readPiActivity(), readGitActivity()])
  const activity = sources
    .flat()
    .sort((a, b) => b.activeAt.localeCompare(a.activeAt))
  const projects = new Map<string, (typeof activity)[number][]>()
  activity.forEach((entry) => {
    const group = projects.get(entry.title)
    if (group) group.push(entry)
    else projects.set(entry.title, [entry])
  })
  const response = [...projects.values()]
    .map(([latest]) => latest)
    .slice(0, count)
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
