export interface FlagMetadata {
  readonly value?: string
  readonly summary: string
}

export interface CommandMetadata {
  readonly path: readonly string[]
  readonly summary: string
  readonly group: string
  readonly args?: readonly string[]
  readonly flags?: readonly string[]
  readonly required?: readonly string[]
  readonly endpoints?: readonly string[]
  readonly scopes?: readonly string[]
  readonly safety: "read" | "local-destructive"
  readonly output: string
  readonly examples: readonly string[]
}

export interface ParsedArgs {
  readonly tokens: readonly string[]
  readonly flags: ReadonlyMap<string, string | boolean>
  readonly positionals: readonly string[]
}

export interface CliExecution {
  readonly exitCode: number
  readonly stdout: string
  readonly stderr: string
  /** Work worth doing once the output is written, so nothing waits on it. */
  readonly finish?: () => Promise<void>
}

export interface CliExecutionOptions {
  readonly stdoutIsTty?: boolean
  readonly env?: Readonly<Record<string, string | undefined>>
  /** Where the running executable sits, which is what says Homebrew or a compiled binary put it there. */
  readonly executablePath?: string
}
