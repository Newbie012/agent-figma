import { executeCli } from "../../../application/execute.js"
import type { CliServices } from "../../../application/services.js"
import type { CliExecutionOptions } from "../../../cli/types.js"

export interface CliRunResult {
  readonly exitCode: number
  readonly stdout: string
  readonly stderr: string
  readonly envelope: unknown
  readonly errorEnvelope: unknown
}

export class CliTestDriver {
  constructor(private readonly services: CliServices) {}

  async run(options: {
    readonly args?: readonly string[]
    readonly terminal?: CliExecutionOptions
  } = {}): Promise<CliRunResult> {
    const execution = await executeCli(options.args ?? [], this.services, options.terminal)
    await execution.finish?.()
    return {
      ...execution,
      envelope: parseMaybeJson(execution.stdout),
      errorEnvelope: parseMaybeJson(execution.stderr)
    }
  }

  async runJson(options: { readonly args: readonly string[] }): Promise<CliRunResult> {
    return this.run({ args: options.args })
  }
}

const parseMaybeJson = (value: string): unknown => {
  if (value.trim() === "") return null
  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}
