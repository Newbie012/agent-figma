import { flagBoolean, parseArgs } from "../cli/args.js"
import { CLI_VERSION } from "../cli/metadata.js"
import type { CliExecution, CliExecutionOptions, ParsedArgs } from "../cli/types.js"
import { errorEnvelope, serializeJson } from "../output/envelope.js"
import { renderHumanErrorEnvelope } from "../output/human.js"
import { hintFor, isStale, NOTE, TAG } from "../domain/upgrade.js"
import { dispatch, renderDispatchResult, withCommandContext } from "./commands.js"
import type { CliServices } from "./services.js"

export const executeCli = async (
  argv: readonly string[],
  services: CliServices,
  options: CliExecutionOptions = {}
): Promise<CliExecution> => {
  let parsed: ParsedArgs | null = null
  try {
    parsed = parseArgs(argv)
    const result = await dispatch(parsed, services, options)
    const said = await mention(parsed, services, options)
    return {
      ...(said.refresh === undefined ? {} : { finish: said.refresh }),
      // An upgrade that was asked for and did not happen leaves the caller on the
      // version they started on, and `agent-figma upgrade && …` should see that.
      exitCode: result.failed === true ? 1 : 0,
      stdout: renderDispatchResult(parsed, result, options),
      stderr: said.hint
    }
  } catch (error) {
    const { envelope, exitCode } = errorEnvelope(withCommandContext(error, parsed))
    const pretty = parsed === null ? argv.includes("--pretty") : flagBoolean(parsed, "pretty")
    const json = parsed === null
      ? argv.includes("--json") || options.stdoutIsTty !== true
      : flagBoolean(parsed, "json") || options.stdoutIsTty !== true
    return {
      exitCode,
      stdout: "",
      stderr: json ? serializeJson(envelope, pretty) : renderHumanErrorEnvelope(envelope, {
        color: options.stdoutIsTty === true && (parsed === null ? !argv.includes("--no-color") : !flagBoolean(parsed, "no-color"))
      })
    }
  }
}

interface Mention {
  readonly hint: string
  readonly refresh?: () => Promise<void>
}

const NOTHING: Mention = { hint: "" }

// A version notice is worth a line to a person and worth nothing to a script, so it
// goes to stderr, only for a terminal, and never from the command that already asks.
const mention = async (
  parsed: ParsedArgs,
  services: CliServices,
  options: CliExecutionOptions
): Promise<Mention> => {
  if (options.env?.["AGENT_FIGMA_NO_UPGRADE_CHECK"] !== undefined) return NOTHING
  if (options.stdoutIsTty !== true || flagBoolean(parsed, "json")) return NOTHING
  if (parsed.positionals[0] === "upgrade") return NOTHING
  try {
    const held = await services.upgradeLog.read()
    const hint = hintFor(held, CLI_VERSION)
    const latest = held.latest
    if (hint !== undefined && latest !== undefined) await services.upgradeLog.write({ ...held, note: NOTE, told: latest })
    if (!isStale(held, Date.now())) return { hint: hint === undefined ? "" : `${hint}\n` }
    return {
      hint: hint === undefined ? "" : `${hint}\n`,
      // Asked for after the answer is on screen, so nobody waits on the registry.
      refresh: async () => {
        const latest = await services.installer.latest(TAG)
        if (latest === undefined) return
        const now = await services.upgradeLog.read()
        await services.upgradeLog.write({ ...now, note: NOTE, checkedAt: new Date().toISOString(), latest })
      }
    }
  } catch {
    return NOTHING
  }
}
