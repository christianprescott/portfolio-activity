import assert from 'node:assert'
import fs from 'node:fs'
import { mkdtemp, mkdir, rm, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it, before } from 'node:test'
import git from 'isomorphic-git'
import { app } from '../src/server.ts'
import { readPiActivity } from '../src/pi.ts'
import { readGitActivity } from '../src/git.ts'

const createRepo = async (repo: string, timestamp: string) => {
  await mkdir(repo, { recursive: true })
  await git.init({ fs, dir: repo, defaultBranch: 'main' })
  await git.setConfig({ fs, dir: repo, path: 'user.name', value: 'Test' })
  await git.setConfig({
    fs,
    dir: repo,
    path: 'user.email',
    value: 'test@example.com',
  })
  await writeFile(join(repo, 'file.txt'), 'activity')
  await git.add({ fs, dir: repo, filepath: 'file.txt' })
  const author = {
    name: 'Test',
    email: 'test@example.com',
    timestamp: Math.floor(Date.parse(timestamp) / 1000),
    timezoneOffset: 0,
  }
  return git.commit({ fs, dir: repo, message: 'test', author })
}

const fixtures = new URL('./fixtures/sessions', import.meta.url).pathname
const empty = '/nonexistent'
process.env.PI_CODING_AGENT_SESSION_DIR = empty

describe('Session reading', () => {
  it('maps projects to their latest message', async () => {
    assert.deepStrictEqual(await readPiActivity(fixtures), [
      {
        title: 'pi-activity',
        source: 'pi',
        activeAt: '2026-11-03T22:32:55.483Z',
      },
    ])
  })

  it('returns nothing for a missing directory', async () => {
    assert.deepStrictEqual(await readPiActivity('/nonexistent'), [])
  })

  it('serves project activity sorted by latest message first', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pi-activity-'))
    const originalDir = process.env.PI_CODING_AGENT_SESSION_DIR
    const sessions = [
      ['older', '2026-11-03T22:32:55.483Z'],
      ['newer', '2026-11-04T12:00:00.000Z'],
    ] as const

    try {
      await Promise.all(
        sessions.map(async ([project, timestamp]) => {
          const projectDir = join(dir, project)
          await mkdir(projectDir)
          await writeFile(
            join(projectDir, 'session.jsonl'),
            [
              JSON.stringify({ type: 'session', cwd: `/workspace/${project}` }),
              JSON.stringify({ type: 'message', timestamp }),
            ].join('\n'),
          )
        }),
      )
      process.env.PI_CODING_AGENT_SESSION_DIR = dir

      const res = await app.request('http://localhost/activity')
      const activity = (await res.json()) as {
        title: string
        source: string
        activeAt: string
      }[]
      assert.deepStrictEqual(
        activity.filter(({ source }) => source === 'pi'),
        [
          {
            title: 'newer',
            source: 'pi',
            activeAt: '2026-11-04T12:00:00.000Z',
          },
          {
            title: 'older',
            source: 'pi',
            activeAt: '2026-11-03T22:32:55.483Z',
          },
        ],
      )
    } finally {
      process.env.PI_CODING_AGENT_SESSION_DIR = originalDir
      await rm(dir, { recursive: true, force: true })
    }
  })
})

describe('Git activity', () => {
  it('skips Git activity when the project directory is unset or empty', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pi-activity-git-disabled-'))
    const originalCwd = process.cwd()
    const originalProjectDir = process.env.PI_ACTIVITY_PROJECT_DIR

    try {
      await createRepo(join(dir, 'project'), '2025-01-01T00:00:00Z')
      process.chdir(dir)

      delete process.env.PI_ACTIVITY_PROJECT_DIR
      assert.deepStrictEqual(await readGitActivity(), [])

      process.env.PI_ACTIVITY_PROJECT_DIR = ''
      assert.deepStrictEqual(await readGitActivity(), [])

      // An explicit directory remains available for direct test injection.
      assert.deepStrictEqual(await readGitActivity(dir), [
        {
          title: 'project',
          source: 'git',
          activeAt: '2025-01-01T00:00:00.000Z',
        },
      ])
    } finally {
      process.chdir(originalCwd)
      if (originalProjectDir === undefined)
        delete process.env.PI_ACTIVITY_PROJECT_DIR
      else process.env.PI_ACTIVITY_PROJECT_DIR = originalProjectDir
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('reads only immediate child repositories and latest commit timestamps', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pi-activity-git-'))
    const originalProjectDir = process.env.PI_ACTIVITY_PROJECT_DIR

    try {
      assert.deepStrictEqual(await readGitActivity(dir), [])
      await mkdir(join(dir, 'empty'))
      await mkdir(join(dir, 'no-commits'))
      await git.init({
        fs,
        dir: join(dir, 'no-commits'),
        defaultBranch: 'main',
      })
      await mkdir(join(dir, 'container', 'nested'), { recursive: true })
      await createRepo(join(dir, 'container', 'nested'), '2025-01-03T00:00:00Z')
      assert.deepStrictEqual(await readGitActivity(dir), [])

      await createRepo(join(dir, 'first'), '2025-01-01T00:00:00Z')
      await createRepo(join(dir, 'second'), '2025-01-02T00:00:00Z')
      const expected = [
        {
          title: 'first',
          source: 'git',
          activeAt: '2025-01-01T00:00:00.000Z',
        },
        {
          title: 'second',
          source: 'git',
          activeAt: '2025-01-02T00:00:00.000Z',
        },
      ]
      assert.deepStrictEqual(
        (await readGitActivity(dir)).sort((a, b) =>
          a.title.localeCompare(b.title),
        ),
        expected,
      )

      process.env.PI_ACTIVITY_PROJECT_DIR = dir
      assert.deepStrictEqual(
        (await readGitActivity()).sort((a, b) =>
          a.title.localeCompare(b.title),
        ),
        expected,
      )

      // A repository at the project directory itself must not be reported as a child.
      const parentRepo = await mkdtemp(
        join(tmpdir(), 'pi-activity-parent-git-'),
      )
      try {
        await createRepo(parentRepo, '2025-01-04T00:00:00Z')
        await mkdir(join(parentRepo, 'ordinary-child'))
        assert.deepStrictEqual(await readGitActivity(parentRepo), [])
      } finally {
        await rm(parentRepo, { recursive: true, force: true })
      }

      process.env.PI_ACTIVITY_PROJECT_DIR = dir
      const res = await app.request('http://localhost/activity')
      assert.deepStrictEqual(
        (
          (await res.json()) as {
            title: string
            source: string
            activeAt: string
          }[]
        )
          .filter(({ source }) => source === 'git')
          .sort((a, b) => a.title.localeCompare(b.title)),
        expected,
      )
    } finally {
      if (originalProjectDir === undefined)
        delete process.env.PI_ACTIVITY_PROJECT_DIR
      else process.env.PI_ACTIVITY_PROJECT_DIR = originalProjectDir
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('reads packed refs, detached HEADs and shallow repositories', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pi-activity-git-formats-'))
    try {
      const packed = join(dir, 'packed')
      const packedOid = await createRepo(packed, '2025-02-01T00:00:00Z')
      await writeFile(
        join(packed, '.git', 'packed-refs'),
        `# pack-refs with: peeled fully-peeled sorted\n${packedOid} refs/heads/main\n`,
      )
      await unlink(join(packed, '.git', 'refs', 'heads', 'main'))

      const detached = join(dir, 'detached')
      const detachedOid = await createRepo(detached, '2025-02-02T00:00:00Z')
      await writeFile(join(detached, '.git', 'HEAD'), `${detachedOid}\n`)
      await unlink(join(detached, '.git', 'refs', 'heads', 'main'))

      const shallow = join(dir, 'shallow')
      await createRepo(shallow, '2025-02-02T00:00:00Z')
      await writeFile(join(shallow, 'later.txt'), 'later')
      await git.add({ fs, dir: shallow, filepath: 'later.txt' })
      const shallowOid = await git.commit({
        fs,
        dir: shallow,
        message: 'latest shallow commit',
        author: {
          name: 'Test',
          email: 'test@example.com',
          timestamp: Math.floor(Date.parse('2025-02-03T00:00:00Z') / 1000),
          timezoneOffset: 0,
        },
      })
      await writeFile(join(shallow, '.git', 'shallow'), `${shallowOid}\n`)

      assert.deepStrictEqual(
        (await readGitActivity(dir)).sort((a, b) =>
          a.title.localeCompare(b.title),
        ),
        [
          {
            title: 'detached',
            source: 'git',
            activeAt: '2025-02-02T00:00:00.000Z',
          },
          {
            title: 'packed',
            source: 'git',
            activeAt: '2025-02-01T00:00:00.000Z',
          },
          {
            title: 'shallow',
            source: 'git',
            activeAt: '2025-02-03T00:00:00.000Z',
          },
        ].sort((a, b) => a.title.localeCompare(b.title)),
      )
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('surfaces unexpected repository errors', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pi-activity-invalid-git-'))
    try {
      await mkdir(join(dir, 'broken', '.git'), { recursive: true })
      await writeFile(join(dir, 'broken', '.git', 'HEAD'), 'invalid HEAD\n')
      await assert.rejects(readGitActivity(dir))
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('surfaces missing commit objects instead of treating them as empty repos', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pi-activity-missing-commit-'))
    const repo = join(dir, 'broken')
    const missingOid = 'a'.repeat(40)
    try {
      await mkdir(join(repo, '.git', 'refs', 'heads'), { recursive: true })
      await writeFile(join(repo, '.git', 'HEAD'), 'ref: refs/heads/main\n')
      await writeFile(
        join(repo, '.git', 'refs', 'heads', 'main'),
        `${missingOid}\n`,
      )
      await assert.rejects(readGitActivity(dir))
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('skips linked worktrees with a gitdir-file .git entry', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pi-activity-worktree-'))
    try {
      await mkdir(join(dir, 'linked'))
      await writeFile(
        join(dir, 'linked', '.git'),
        'gitdir: /nonexistent/common.git/worktrees/linked\n',
      )
      assert.deepStrictEqual(await readGitActivity(dir), [])
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})

// In-process tests using Hono's app.request()
describe('Activity API (in-process)', () => {
  it('should return 200 for GET /activity', async () => {
    const res = await app.request('http://localhost/activity', {
      method: 'GET',
    })
    assert.strictEqual(res.status, 200)
    assert.strictEqual(res.headers.get('content-type'), 'application/json')
    const body = (await res.json()) as {
      title: string
      source: string
      activeAt: string
    }[]
    assert.ok(Array.isArray(body))
    assert.ok(
      body.every(
        (activity) =>
          typeof activity.title === 'string' &&
          ['pi', 'git'].includes(activity.source) &&
          !Number.isNaN(Date.parse(activity.activeAt)),
      ),
    )
  })

  it('should return 404 for unknown paths', async () => {
    const res = await app.request('http://localhost/unknown', { method: 'GET' })
    assert.strictEqual(res.status, 404)
    assert.strictEqual(
      res.headers.get('content-type'),
      'text/plain; charset=UTF-8',
    )
  })

  it('should return 404 for POST to /activity (no method handler)', async () => {
    const res = await app.request('http://localhost/activity', {
      method: 'POST',
    })
    assert.strictEqual(res.status, 404)
  })

  it('should return 404 for PUT to /activity', async () => {
    const res = await app.request('http://localhost/activity', {
      method: 'PUT',
    })
    assert.strictEqual(res.status, 404)
  })

  it('should return 404 for DELETE to /activity', async () => {
    const res = await app.request('http://localhost/activity', {
      method: 'DELETE',
    })
    assert.strictEqual(res.status, 404)
  })
})

// Integration tests with actual HTTP server
describe('Activity API (HTTP server)', async () => {
  let port: number

  before(async () => {
    // Find an available port
    const { createServer } = await import('node:http')
    port = await new Promise((resolve, reject) => {
      const srv = createServer()
      srv.listen(0, '127.0.0.1', () => {
        const addr = srv.address()
        srv.close(() => {
          if (typeof addr === 'object' && addr) {
            resolve(addr.port)
          } else {
            reject(new Error('Could not determine port'))
          }
        })
      })
      srv.on('error', reject)
    })
  })

  it('should return 200 for /activity GET on real server', async () => {
    // Import dynamically to get fresh server instance
    const { serve } = await import('@hono/node-server')
    const { app: serverApp } = await import('../src/server.ts')

    const server = serve({
      fetch: serverApp.fetch,
      port,
      hostname: '127.0.0.1',
    })

    try {
      const res = await fetch(`http://127.0.0.1:${port}/activity`)
      assert.strictEqual(res.status, 200)
      assert.strictEqual(res.headers.get('content-type'), 'application/json')
      const body = (await res.json()) as {
        title: string
        source: string
        activeAt: string
      }[]
      assert.ok(Array.isArray(body))
      assert.ok(
        body.every(
          (activity) =>
            typeof activity.title === 'string' &&
            ['pi', 'git'].includes(activity.source) &&
            !Number.isNaN(Date.parse(activity.activeAt)),
        ),
      )
    } finally {
      server.close()
      await new Promise((resolve) => server.on('close', resolve))
    }
  })

  it('should return 404 for unknown paths on real server', async () => {
    const { serve } = await import('@hono/node-server')
    const { app: serverApp } = await import('../src/server.ts')

    const server = serve({
      fetch: serverApp.fetch,
      port,
      hostname: '127.0.0.1',
    })

    try {
      const res = await fetch(`http://127.0.0.1:${port}/unknown`)
      assert.strictEqual(res.status, 404)
      assert.strictEqual(
        res.headers.get('content-type'),
        'text/plain; charset=UTF-8',
      )
    } finally {
      server.close()
      await new Promise((resolve) => server.on('close', resolve))
    }
  })
})
