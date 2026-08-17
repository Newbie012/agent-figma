import { flagBoolean, parseArgs } from "../cli/args.js"
import type { CliExecution, CliExecutionOptions, ParsedArgs } from "../cli/types.js"
import { errorEnvelope, serializeJson } from "../output/envelope.js"
import { renderHumanErrorEnvelope } from "../output/human.js"
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
    return {
      // An upgrade that was asked for and did not happen leaves the caller on the
      // version they started on, and `agent-figma upgrade && …` should see that.
      exitCode: result.failed === true ? 1 : 0,
      stdout: renderDispatchResult(parsed, result, options),
      stderr: ""
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
