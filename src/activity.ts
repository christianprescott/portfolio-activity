export type ActivitySource = 'pi' | 'git'

// repoUrl is an unverified GitHub candidate until the API verifies it.
export type Activity = {
  title: string
  source: ActivitySource
  activeAt: string
  repoUrl?: string
}
