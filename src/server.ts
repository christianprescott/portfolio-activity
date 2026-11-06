#!/usr/bin/env node

import { serve } from '@hono/node-server'
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import pkg from '../package.json' with { type: 'json' }
import { readPiActivity } from './sources/pi.ts'
import { readGitActivity } from './sources/git.ts'
import { verifyPublicGitHubRepository } from './sources/github.ts'
import { swaggerUI } from '@hono/swagger-ui'
import { serveStatic } from '@hono/node-server/serve-static'

// Activity response, with one most-recent entry per project.
export const Activity = z
  .array(
    z.strictObject({
      title: z.string().optional().openapi({
        description:
          'Local project directory name, included only for a verified public GitHub repository.',
      }),
      source: z.enum(['pi', 'git']),
      activeAt: z.iso.datetime().openapi({
        description: 'ISO 8601 timestamp of the activity.',
      }),
      repoUrl: z.url().optional().openapi({
        description: 'Canonical URL of a verified public GitHub repository.',
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
      count: z.coerce.number().int().min(1).max(10).default(10).openapi({
        description: 'Maximum number of activities to return (1–10).',
        example: 6,
      }),
    }),
  },
  responses: {
    200: {
      description:
        'Up to count activities, ordered from most recent to oldest (default and maximum 10). An empty array when no activity is found.',
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
  const projects = new Map<string, (typeof activity)[number]>()
  activity.forEach((entry) => {
    const latest = projects.get(entry.title)
    if (!latest) projects.set(entry.title, entry)
    else if (!latest.repoUrl && entry.repoUrl)
      projects.set(entry.title, { ...latest, repoUrl: entry.repoUrl })
  })

  const selected = [...projects.entries()].slice(0, count)
  const response = await Promise.all(
    selected.map(async ([project, latest]) => {
      const repository = await verifyPublicGitHubRepository(latest.repoUrl)
      return {
        source: latest.source,
        activeAt: latest.activeAt,
        ...(repository ? { title: project, repoUrl: repository } : {}),
      }
    }),
  )
  return c.json(response, 200)
})

// GET /openapi.json endpoint, spec generated from the routes above
app.doc31('/openapi.json', {
  openapi: '3.1.0',
  info: { title: 'Portfolio Activity', version: pkg.version },
})

// Serve Swagger UI docs at /docs
app.get('/docs', swaggerUI({ url: '/openapi.json' }))

// Static assets: pages and the built component (public/dist), last so routes above win
app.use('/*', serveStatic({ root: './public' }))
