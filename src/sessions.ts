import { createReadStream } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, join } from 'node:path'
import { createInterface } from 'node:readline'

export type ProjectActivity = {
  project: string
  lastMessage: string
}

// PI_CODING_AGENT_SESSION_DIR wins; else <PI_CODING_AGENT_DIR>/sessions
export const sessionsDir = (env = process.env): string =>
  env.PI_CODING_AGENT_SESSION_DIR ??
  join(env.PI_CODING_AGENT_DIR ?? join(homedir(), '.pi', 'agent'), 'sessions')

const newest = (a?: string, b?: string) => (a && b ? (a > b ? a : b) : (a ?? b))

// Streams one JSONL file: project cwd from the header, latest message time.
const readSession = async (file: string) => {
  const lines = createInterface({ input: createReadStream(file) })
  let cwd: string | undefined
  let last: string | undefined
  for await (const line of lines) {
    try {
      const entry = JSON.parse(line)
      if (entry.type === 'session') cwd = entry.cwd
      else if (entry.type === 'message') last = newest(last, entry.timestamp)
    } catch {
      // skip partial or corrupt lines
    }
  }
  return { cwd, last }
}

const readDirOrEmpty = (dir: string) =>
  readdir(dir, { withFileTypes: true }).catch(() => [])

// Maps each project to its most recent message timestamp (ISO 8601).
export const readActivity = async (
  dir = sessionsDir(),
): Promise<ProjectActivity[]> => {
  const projectDirs = (await readDirOrEmpty(dir)).filter((d) => d.isDirectory())
  const projects = await Promise.all(
    projectDirs.map(async (pd) => {
      const path = join(dir, pd.name)
      const files = (await readDirOrEmpty(path)).filter(
        (f) => f.isFile() && f.name.endsWith('.jsonl'),
      )
      const sessions = await Promise.all(
        files.map((f) => readSession(join(path, f.name))),
      )
      const lastMessage = sessions.map((s) => s.last).reduce(newest, undefined)
      const cwd = sessions.find((s) => s.cwd)?.cwd
      return lastMessage
        ? { project: cwd ? basename(cwd) : pd.name, lastMessage }
        : undefined
    }),
  )
  return projects.filter((p): p is ProjectActivity => p !== undefined)
}

export const mostRecent = (activity: ProjectActivity[]): string | undefined =>
  activity.map((a) => a.lastMessage).reduce(newest, undefined)
