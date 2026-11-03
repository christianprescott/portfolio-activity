#!/usr/bin/env node

import { serve } from '@hono/node-server'
import { Hono } from 'hono'

// Create Hono app
export const app = new Hono()

// GET /activity endpoint
app.get('/activity', (c) => {
  return c.json({})
})
