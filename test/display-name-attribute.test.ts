import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ActivityMessage } from '../src/components/activity-message.ts'
import { PortfolioActivity } from '../src/components/portfolio-activity.ts'

describe('displayName attributes', () => {
  it('uses the HTML-normalized displayname attribute on both elements', () => {
    for (const element of [PortfolioActivity, ActivityMessage]) {
      assert.ok(element.observedAttributes.includes('displayname'))
      assert.ok(!element.observedAttributes.includes('display-name'))
    }
  })
})
