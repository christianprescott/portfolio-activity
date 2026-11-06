import fs from 'node:fs'
import { lstat, readFile, readdir } from 'node:fs/promises'
import git from 'isomorphic-git'
import { basename, join, resolve } from 'node:path'
import type { Activity } from '../activity.ts'

const readDir = async (directory: string) => {
  try {
    return await readdir(directory, { withFileTypes: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
}

const isNotFound = (error: unknown): boolean =>
  error instanceof git.Errors.NotFoundError

const githubCandidate = (remote: string): string | undefined => {
  let path: string | undefined
  const scp = /^git@github\.com:([^?#]+)$/i.exec(remote)

  if (scp) {
    path = scp[1]
  } else {
    try {
      const url = new URL(remote)
      if (
        url.hostname.toLowerCase() !== 'github.com' ||
        !['https:', 'ssh:'].includes(url.protocol) ||
        (url.protocol === 'ssh:' && url.username !== 'git') ||
        (url.protocol === 'https:' && url.username) ||
        url.password ||
        (url.port && url.port !== (url.protocol === 'https:' ? '443' : '22')) ||
        url.search ||
        url.hash
      )
        return undefined
      path = url.pathname.replace(/^\//, '')
    } catch {
      return undefined
    }
  }

  const parts = path.split('/')
  if (parts.length !== 2) return undefined
  try {
    const [owner, rawRepository] = parts.map(decodeURIComponent)
    const repository = rawRepository.replace(/\.git$/i, '')
    if (
      !owner ||
      !repository ||
      !/^[A-Za-z0-9_.-]+$/.test(owner) ||
      !/^[A-Za-z0-9_.-]+$/.test(repository) ||
      owner === '.' ||
      owner === '..' ||
      repository === '.' ||
      repository === '..'
    )
      return undefined
    return `${owner}/${repository}`
  } catch {
    return undefined
  }
}

const readRepositoryActivity = async (
  directory: string,
): Promise<Activity[]> => {
  try {
    const marker = await lstat(join(directory, '.git'))
    if (!marker.isDirectory()) return []
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }

  let root: string
  try {
    root = await git.findRoot({ fs, filepath: directory })
  } catch (error) {
    if (isNotFound(error)) return []
    throw error
  }

  // Do not report nested repositories or the project directory itself.
  if (resolve(root) !== resolve(directory)) return []

  let commits
  try {
    commits = await git.log({ fs, dir: directory, depth: 1 })
  } catch (error) {
    if (isNotFound(error)) {
      const head = await readFile(join(directory, '.git', 'HEAD'), 'utf8')
      const branch = /^ref: (refs\/heads\/[^\n]+)\n?$/.exec(head)?.[1]
      const missingRef = (error as { data?: { what?: string } }).data?.what
      if (branch && branch === missingRef) return []
    }
    throw error
  }

  const [commit] = commits
  if (!commit) throw new Error(`HEAD has no commit in repository ${directory}`)

  const remotes = await git.listRemotes({ fs, dir: directory })
  const repoUrl = remotes
    .map(({ url }) => githubCandidate(url))
    .find((candidate): candidate is string => Boolean(candidate))

  return [
    {
      title: basename(directory),
      source: 'git',
      activeAt: new Date(
        commit.commit.committer.timestamp * 1000,
      ).toISOString(),
      ...(repoUrl ? { repoUrl } : {}),
    },
  ]
}

// Reads repositories directly inside the configured project directory.
export const readGitActivity = async (
  projectDir = process.env.PORTFOLIO_ACTIVITY_PROJECT_DIR,
): Promise<Activity[]> => {
  if (!projectDir) return []

  const children = (await readDir(projectDir)).filter((entry) =>
    entry.isDirectory(),
  )
  const activities = await Promise.all(
    children.map((entry) =>
      readRepositoryActivity(join(projectDir, entry.name)),
    ),
  )
  return activities.flat()
}
