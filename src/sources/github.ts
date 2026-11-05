// Verify a Git remote candidate with GitHub; never trust it as a public link without verification.
export const verifyPublicGitHubRepository = async (
  candidate: string | undefined,
): Promise<string | undefined> => {
  if (!candidate) return undefined
  const [owner, repository, ...extra] = candidate.split('/')
  if (!owner || !repository || extra.length) return undefined

  try {
    const response = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'pi-activity',
        },
        signal: AbortSignal.timeout(5000),
      },
    )
    if (!response.ok) return undefined

    const data: unknown = await response.json()
    if (
      typeof data === 'object' &&
      data !== null &&
      'private' in data &&
      data.private === false &&
      'name' in data &&
      typeof data.name === 'string' &&
      data.name.length > 0
    ) {
      return `https://github.com/${owner}/${repository}`
    }
  } catch {
    // Network errors, timeouts, and invalid responses fail closed.
  }

  return undefined
}
