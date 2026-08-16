import { randomUUID } from "node:crypto"
import {
  FigmaRateLimited,
  normalizeUnknownError,
  type AgentFigmaError,
  type UsageError
} from "../domain/errors.js"
import type { AuthProfile, ErrorEnvelope, Paging, SuccessEnvelope } from "../domain/figma.js"

export const successEnvelope = (input: {
  readonly method: string
  readonly profile: AuthProfile | null
  readonly fileKey?: string
  readonly data: unknown
  readonly paging?: Paging
  readonly warnings?: readonly string[]
}): SuccessEnvelope => ({
  ok: true,
  method: input.method,
  profile: input.profile?.name ?? null,
  file_key: input.fileKey ?? null,
  data: input.data,
  paging: input.paging ?? { next_cursor: null, has_more: false },
  warnings: input.warnings ?? []
})

export const errorEnvelope = (error: unknown): { readonly envelope: ErrorEnvelope; readonly exitCode: number } => {
  const normalized = normalizeUnknownError(error)
  const retryAfterSeconds = normalized instanceof FigmaRateLimited ? normalized.retryAfterSeconds : undefined
  const details = detailsFor(normalized)
  const suggestion = suggestionFor(normalized)
  return {
    exitCode: normalized.exitCode,
    envelope: {
      ok: false,
      error: {
        type: normalized._tag,
        title: normalized.message,
        retriable: normalized instanceof FigmaRateLimited,
        ...(retryAfterSeconds === undefined ? {} : { retry_after_seconds: retryAfterSeconds }),
        ...(suggestion === undefined ? {} : { suggestion }),
        trace_id: `afg_${randomUUID()}`,
        ...(Object.keys(details).length === 0 ? {} : { details })
      }
    }
  }
}

export const serializeJson = (value: unknown, pretty: boolean): string =>
  `${JSON.stringify(value, null, pretty ? 2 : undefined)}\n`

export const toNdjson = (items: readonly unknown[]): string =>
  items.map((item) => JSON.stringify(item)).join("\n") + (items.length === 0 ? "" : "\n")

const suggestionFor = (error: AgentFigmaError): string | undefined => {
  switch (error._tag) {
    case "NotAuthenticated":
      return "Run agent-figma auth login."
    case "PermissionDenied":
      return "Check the token scope and confirm the file is shared with this Figma account."
    case "FigmaRateLimited":
      return "Retry after the provided delay, reduce reads, or use a Dev/Full seat."
    case "InvalidFigmaUrl":
      return "Pass a raw file key or a https://www.figma.com/design/... URL."
    case "WriteOperationBlocked":
      return "Run agent-figma api endpoints list to see the bundled GET operations."
    case "UsageError":
      return usageSuggestion(error)
    default:
      return undefined
  }
}

const usageSuggestion = (error: UsageError): string => {
  const noun = error.alternatives?.[0]?.split(" ")[0]
  if (error.didYouMean?.startsWith("--") === true) {
    return `Did you mean ${error.didYouMean}? Run \`agent-figma ${error.command ?? "COMMAND"} --help\` for the flags it takes.`
  }
  if (error.didYouMean !== undefined) return `Run \`agent-figma ${error.didYouMean} --help\` for what it needs.`
  if (noun !== undefined) return `\`${noun}\` needs a verb after it. Run \`agent-figma ${noun} --help\` for the ones it has.`
  if (error.command !== undefined) return `Run \`agent-figma ${error.command} --help\` for what it needs.`
  return "Run `agent-figma --help` for the commands this build exposes, or `agent-figma describe --json` for the same as JSON."
}

const detailsFor = (error: AgentFigmaError): Readonly<Record<string, unknown>> => {
  switch (error._tag) {
    case "NotAuthenticated": return { profile: error.profile }
    case "PermissionDenied": return { path: error.path, status: error.status }
    case "FigmaRateLimited": return {
      path: error.path,
      ...(error.planTier === undefined ? {} : { plan_tier: error.planTier })
    }
    case "FigmaApiFailed": return {
      path: error.path,
      ...(error.status === undefined ? {} : { status: error.status })
    }
    case "InvalidFigmaUrl": return { input: error.input }
    case "ResourceNotFound": return { path: error.path }
    case "WriteOperationBlocked": return { operation: error.operation }
    case "UsageError": return {
      ...(error.argument === undefined ? {} : { argument: error.argument }),
      ...(error.command === undefined ? {} : { command: error.command }),
      ...(error.usage === undefined ? {} : { usage: error.usage }),
      ...(error.didYouMean === undefined ? {} : { did_you_mean: error.didYouMean }),
      ...(error.alternatives === undefined ? {} : { alternatives: error.alternatives })
    }
  }
}
