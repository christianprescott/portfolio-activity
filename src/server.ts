#!/usr/bin/env node

import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { mostRecent, readActivity } from './sessions.ts'

// Create Hono app
export const app = new Hono()

// GET /activity endpoint
app.get('/activity', async (c) => {
  const lastActivity = mostRecent(await readActivity())
  return c.json(lastActivity ? { lastActivity } : {})
})
