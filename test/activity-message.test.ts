import assert from 'node:assert/strict'
import { describe, it, type TestContext } from 'node:test'
import { ActivityMessage } from '../src/components/activity-message.ts'
import type { ActivitySource } from '../src/components/activity-source.ts'

const now = Date.parse('2026-11-04T12:00:00.000Z')
const displayName = 'Ada'

const activityAt = (offset: number) => new Date(now + offset)

const useFixedClock = (t: TestContext) => {
  t.mock.timers.enable({ apis: ['Date'], now })
}

const messageText = (source: ActivitySource, activeAt: Date) => {
  const message = new ActivityMessage()
  message.displayName = displayName
  message.source = source
  message.activeAt = activeAt
  return message.getMessageText()
}

describe('activity-message', () => {
  it('uses present-tense messages and right now for recent activity sources', (t) => {
    useFixedClock(t)
    assert.equal(
      messageText('git', activityAt(-19 * 60_000)),
      'Ada is committing right now',
    )
    assert.equal(
      messageText('pi', activityAt(-19 * 60_000)),
      'Ada is working agentically right now',
    )
  })

  it('uses past-tense messages and relative time at exactly 20 minutes', (t) => {
    useFixedClock(t)
    assert.equal(
      messageText('git', activityAt(-20 * 60_000)),
      'Ada committed 20 minutes ago',
    )
    assert.equal(
      messageText('pi', activityAt(-20 * 60_000)),
      'Ada was working agentically 20 minutes ago',
    )
  })

  it('uses relative words and larger units for distant activity', (t) => {
    useFixedClock(t)
    assert.equal(
      messageText('pi', activityAt(-86_400_000)),
      'Ada was working agentically yesterday',
    )
    assert.equal(
      messageText('pi', activityAt(86_400_000)),
      'Ada was working agentically tomorrow',
    )
    assert.equal(
      messageText('pi', activityAt(-14 * 86_400_000)),
      'Ada was working agentically 2 weeks ago',
    )
    assert.equal(
      messageText('pi', activityAt(3 * 3_600_000)),
      'Ada was working agentically in 3 hours',
    )
  })

  it('keeps future timestamps out of the recent past presentation', (t) => {
    useFixedClock(t)
    assert.equal(
      messageText('git', activityAt(5 * 60_000)),
      'Ada committed in 5 minutes',
    )
  })
})
