export interface InstallerRun {
  readonly ok: boolean
  readonly output: string
}

export interface Installer {
  /** Runs the install command for the route this build came from. */
  readonly run: (argv: readonly string[]) => Promise<InstallerRun>
  /** The newest version on a dist-tag, or undefined when the registry did not answer. */
  readonly latest: (tag: string) => Promise<string | undefined>
}
