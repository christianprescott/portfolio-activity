export type ActivitySource = 'pi' | 'git'

export type Activity = {
  title: string
  source: ActivitySource
  activeAt: string
}
