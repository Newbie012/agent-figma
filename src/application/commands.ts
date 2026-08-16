import { flagBoolean, flagString, requireFlag, requirePositional } from "../cli/args.js"
import {
  CLI_VERSION,
  commandPathOf,
  describeAllCommands,
  findCommandMetadata,
  flagsFor,
  nearestFlag,
  renderBanner,
  renderCompletion,
  renderHumanHelp,
  suggestCommand,
  usageOf
} from "../cli/metadata.js"
import type { CliExecutionOptions, ParsedArgs } from "../cli/types.js"
import { UsageError, WriteOperationBlocked } from "../domain/errors.js"
import { normalizeNodeId, parseFigmaReference, type AuthProfile, type Paging } from "../domain/figma.js"
import { ProfileName, Scope } from "../domain/ids.js"
import { serializeJson, successEnvelope, toNdjson } from "../output/envelope.js"
import { renderHumanEnvelope } from "../output/human.js"
import { projectFields } from "../output/projection.js"
import type { EndpointMetadata } from "../ports/EndpointCatalog.js"
import { getProfile, sanitizeProfile } from "./auth.js"
import type { CliServices } from "./services.js"

export interface DispatchResult {
  readonly method: string
  readonly profile: AuthProfile | null
  readonly fileKey?: string
  readonly data: unknown
  readonly rawStdout?: string
  readonly paging?: Paging
  readonly warnings?: readonly string[]
}

export const dispatch = async (parsed: ParsedArgs, services: CliServices, options: CliExecutionOptions = {}): Promise<DispatchResult> => {
  const [first, second, third] = parsed.positionals

  if (flagBoolean(parsed, "version")) return rawResult("version", `${CLI_VERSION}\n`)
  if (flagBoolean(parsed, "help") && !flagBoolean(parsed, "json")) return rawResult("help", renderHumanHelp(parsed.positionals))
  if (flagBoolean(parsed, "help") && flagBoolean(parsed, "json")) {
    const metadata = findCommandMetadata(parsed.positionals)
    if (metadata === null) throw unknownCommand(parsed.positionals)
    return localResult("describe", metadata)
  }

  if (parsed.positionals.length === 0) {
    if (options.stdoutIsTty === true && !flagBoolean(parsed, "json")) return rawResult("banner", renderBanner())
    return localResult("describe", { ...describeAllCommands(), endpoints: services.endpointCatalog.list() })
  }

  assertKnownCommand(parsed)

  if (first === "describe") {
    return localResult("describe", { ...describeAllCommands(), endpoints: services.endpointCatalog.list() })
  }

  if (first === "completion") {
    const shell = requirePositional(parsed, 1, "SHELL")
    const completion = renderCompletion(shell)
    if (completion === "") throw new UsageError({ message: "Unsupported completion shell", argument: "SHELL" })
    return rawResult("completion", completion)
  }

  if (first === "api") return apiCommand(parsed, services)
  if (first === "auth") return authCommand(parsed, services)

  if (first === "user" && second === "get") return remoteCall(parsed, services, "user.get", {})
  if (first === "team" && second === "projects" && third === "list") {
    return remoteCall(parsed, services, "team.projects.list", { team_id: requirePositional(parsed, 3, "TEAM_ID") })
  }
  if (first === "project" && second === "files" && third === "list") {
    return remoteCall(parsed, services, "project.files.list", { project_id: requirePositional(parsed, 3, "PROJECT_ID") })
  }

  if (first === "file" && second === "get") {
    const reference = fileReference(parsed, 2)
    const depth = parsePositiveInteger(flagString(parsed, "depth"), "depth")
    return remoteCall(parsed, services, "file.get", { key: reference.fileKey, ...(depth === undefined ? {} : { depth }) }, { fileKey: reference.fileKey })
  }

  if (first === "file" && second === "nodes" && third === "get") {
    const reference = fileReference(parsed, 3)
    const ids = normalizeIds(requireFlag(parsed, "ids"))
    return remoteCall(parsed, services, "file.nodes.get", { key: reference.fileKey, ids }, { fileKey: reference.fileKey })
  }

  if (first === "node" && second === "get") {
    const reference = fileReference(parsed, 2)
    const rawNodeId = flagString(parsed, "id") ?? reference.nodeId
    if (rawNodeId === undefined) throw new UsageError({ message: "Pass a Figma node URL or provide --id NODE_ID", argument: "id" })
    return remoteCall(parsed, services, "file.nodes.get", { key: reference.fileKey, ids: normalizeNodeId(rawNodeId) }, { method: "node.get", fileKey: reference.fileKey })
  }

  if (first === "file" && second === "comments" && third === "list") {
    const reference = fileReference(parsed, 3)
    return remoteCall(parsed, services, "file.comments.list", { file_key: reference.fileKey }, { fileKey: reference.fileKey })
  }
  if (first === "file" && second === "versions" && third === "list") {
    const reference = fileReference(parsed, 3)
    return remoteCall(parsed, services, "file.versions.list", { file_key: reference.fileKey }, { fileKey: reference.fileKey })
  }

  if (first === "image" && second === "render") {
    const reference = fileReference(parsed, 2)
    const format = flagString(parsed, "format", "png") ?? "png"
    if (!["png", "jpg", "svg", "pdf"].includes(format)) throw new UsageError({ message: "--format must be png, jpg, svg, or pdf", argument: "format" })
    const scale = parseScale(flagString(parsed, "scale"))
    return remoteCall(parsed, services, "image.render", {
      key: reference.fileKey,
      ids: normalizeIds(requireFlag(parsed, "ids")),
      format,
      ...(scale === undefined ? {} : { scale })
    }, { fileKey: reference.fileKey })
  }

  if (first === "component" && second === "get") return remoteCall(parsed, services, "component.get", { key: requirePositional(parsed, 2, "COMPONENT_KEY") })
  if (first === "component-set" && second === "get") return remoteCall(parsed, services, "component-set.get", { key: requirePositional(parsed, 2, "COMPONENT_SET_KEY") })
  if (first === "style" && second === "get") return remoteCall(parsed, services, "style.get", { key: requirePositional(parsed, 2, "STYLE_KEY") })

  throw unknownCommand(parsed.positionals)
}

const unknownCommand = (positionals: readonly string[]): UsageError =>
  new UsageError({ message: `Unknown command: ${positionals.join(" ")}`, ...suggestCommand(positionals) })

const assertKnownCommand = (parsed: ParsedArgs): void => {
  const path = commandPathOf(parsed.positionals)
  const found = findCommandMetadata(path)
  if (found === null) throw unknownCommand(parsed.positionals)
  const known = flagsFor(path)
  for (const name of parsed.flags.keys()) {
    if (known.includes(`--${name}`)) continue
    const near = nearestFlag(name, known)
    throw new UsageError({
      message: `Unknown flag --${name} for \`${path.join(" ")}\``,
      argument: name,
      command: path.join(" "),
      usage: usageOf(found),
      ...(near === undefined ? {} : { didYouMean: near })
    })
  }
}

export const withCommandContext = (error: unknown, parsed: ParsedArgs | null): unknown => {
  if (!(error instanceof UsageError) || parsed === null || error.command !== undefined) return error
  const found = findCommandMetadata(commandPathOf(parsed.positionals))
  if (found === null) return error
  return new UsageError({
    message: error.message,
    ...(error.argument === undefined ? {} : { argument: error.argument }),
    command: found.path.join(" "),
    usage: usageOf(found),
    ...(error.didYouMean === undefined ? {} : { didYouMean: error.didYouMean }),
    ...(error.alternatives === undefined ? {} : { alternatives: error.alternatives })
  })
}

const authCommand = async (parsed: ParsedArgs, services: CliServices): Promise<DispatchResult> => {
  const [, second, third] = parsed.positionals
  const profileName = flagString(parsed, "profile", "default") ?? "default"
  if (second === "login") {
    const token = flagString(parsed, "token")
    if (token !== undefined && !flagBoolean(parsed, "oauth")) {
      const profile: AuthProfile = {
        name: ProfileName.make(profileName),
        credentialKind: "personal-access-token",
        accessToken: token,
        scopes: splitCsv(flagString(parsed, "scopes")).map((scope) => Scope.make(scope))
      }
      await services.tokenStore.setProfile(profile)
      return { method: "auth.login", profile, data: sanitizeProfile(profile) }
    }

    const requestedScopes = splitCsv(flagString(parsed, "scopes"))
    const scopes = requestedScopes.length === 0 ? defaultOAuthScopes : requestedScopes
    const rejected = scopes.filter((scope) => !readOAuthScopes.has(scope))
    if (rejected.length > 0) throw new UsageError({ message: `OAuth accepts read scopes only: ${rejected.join(", ")}`, argument: "scopes" })
    const selfHosted = flagBoolean(parsed, "oauth")
    const clientId = flagString(parsed, "client-id")
    const clientSecret = flagString(parsed, "client-secret")
    const redirectUri = flagString(parsed, "redirect-uri")
    if (selfHosted && (clientId === undefined || clientSecret === undefined || redirectUri === undefined)) {
      throw new UsageError({ message: "Self-hosted OAuth needs --client-id, --client-secret, and --redirect-uri", argument: "oauth" })
    }
    const timeoutMs = parsePositiveInteger(flagString(parsed, "timeout-ms"), "timeout-ms")
    const authUrlOut = flagString(parsed, "auth-url-out")
    const profile = await services.oauthFlow.login({
      profileName,
      scopes,
      ...(selfHosted ? { clientId: clientId!, clientSecret: clientSecret!, redirectUri: redirectUri! } : {}),
      ...(authUrlOut === undefined ? {} : { authUrlOut }),
      ...(timeoutMs === undefined ? {} : { timeoutMs }),
      openBrowser: !flagBoolean(parsed, "no-open")
    })
    await services.tokenStore.setProfile(profile)
    return { method: "auth.login", profile, data: sanitizeProfile(profile) }
  }
  if (second === "status") {
    const profile = await getProfile(services, profileName)
    return { method: "auth.status", profile, data: sanitizeProfile(profile) }
  }
  if (second === "scopes") {
    const profile = await getProfile(services, profileName)
    return { method: "auth.scopes", profile, data: { profile: profile.name, scopes: profile.scopes } }
  }
  if (second === "test") return remoteCall(parsed, services, "user.get", {}, { method: "auth.test" })
  if (second === "profiles" && third === "list") {
    const profiles = await services.tokenStore.listProfiles()
    return localResult("auth.profiles.list", profiles.map(sanitizeProfile))
  }
  if (second === "logout") {
    if (!flagBoolean(parsed, "yes")) throw new UsageError({ message: "Refusing to delete a local profile without --yes", argument: "yes" })
    const deleted = await services.tokenStore.deleteProfile(profileName)
    return localResult("auth.logout", { profile: profileName, deleted })
  }
  throw unknownCommand(parsed.positionals)
}

const defaultOAuthScopes = [
  "current_user:read",
  "projects:read",
  "file_content:read",
  "file_comments:read",
  "file_versions:read",
  "library_assets:read"
] as const

const readOAuthScopes = new Set([
  ...defaultOAuthScopes,
  "file_dev_resources:read",
  "file_metadata:read",
  "file_variables:read",
  "library_analytics:read",
  "library_content:read",
  "org:activity_log_read",
  "org:ai_metering_usage_read",
  "org:developer_log_read",
  "org:discovery_read",
  "project_metadata:read",
  "selections:read",
  "team_library_content:read",
  "webhooks:read"
])

const apiCommand = async (parsed: ParsedArgs, services: CliServices): Promise<DispatchResult> => {
  const [, second, third] = parsed.positionals
  if (second === "endpoints" && third === "list") {
    return localResult("api.endpoints.list", services.endpointCatalog.list(flagString(parsed, "family")))
  }
  if (second === "endpoint" && third === "describe") {
    const operation = requirePositional(parsed, 3, "OPERATION")
    const endpoint = services.endpointCatalog.describe(operation)
    if (endpoint === null) throw new UsageError({ message: `No bundled metadata for ${operation}`, argument: "OPERATION" })
    return localResult("api.endpoint.describe", endpoint)
  }
  if (second === "call") {
    const operation = requirePositional(parsed, 2, "OPERATION")
    const endpoint = services.endpointCatalog.describe(operation)
    if (endpoint === null) throw new WriteOperationBlocked({ message: `Only bundled GET operations may be called: ${operation}`, operation })
    return remoteCall(parsed, services, operation, parsePayload(flagString(parsed, "payload", "{}") ?? "{}"), { endpoint })
  }
  throw unknownCommand(parsed.positionals)
}

const remoteCall = async (
  parsed: ParsedArgs,
  services: CliServices,
  operation: string,
  payload: Readonly<Record<string, unknown>>,
  options: { readonly method?: string; readonly fileKey?: string; readonly endpoint?: EndpointMetadata } = {}
): Promise<DispatchResult> => {
  const endpoint = options.endpoint ?? services.endpointCatalog.describe(operation)
  if (endpoint === null) throw new WriteOperationBlocked({ message: `Operation is not a bundled GET endpoint: ${operation}`, operation })
  const { path, query } = resolveEndpoint(endpoint, payload)
  const profile = await getProfile(services, flagString(parsed, "profile", "default") ?? "default")
  const result = await services.figmaRestApi.get({
    token: profile.accessToken,
    credentialKind: profile.credentialKind,
    path,
    ...(Object.keys(query).length === 0 ? {} : { query })
  })
  return {
    method: options.method ?? operation,
    profile,
    ...(options.fileKey === undefined ? {} : { fileKey: options.fileKey }),
    data: result.data,
    paging: pagingFrom(result.data),
    warnings: rateWarnings(result.headers)
  }
}

const resolveEndpoint = (endpoint: EndpointMetadata, payload: Readonly<Record<string, unknown>>): { path: string; query: Record<string, string> } => {
  const consumed = new Set<string>()
  const path = endpoint.path.replace(/:([a-z_]+)/g, (_, name: string) => {
    const value = payload[name]
    if (value === undefined || value === null || typeof value === "object") throw new UsageError({ message: `Missing path value ${name} for ${endpoint.operation}`, argument: name })
    consumed.add(name)
    return encodeURIComponent(String(value))
  })
  const query: Record<string, string> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (consumed.has(key) || value === undefined || value === null) continue
    if (Array.isArray(value) && value.every(isScalar)) query[key] = value.map(String).join(",")
    else if (isScalar(value)) query[key] = String(value)
    else throw new UsageError({ message: `Payload field ${key} must be a scalar or scalar array`, argument: "payload" })
  }
  return { path, query }
}

export const renderDispatchResult = (parsed: ParsedArgs, result: DispatchResult, options: CliExecutionOptions): string => {
  if (result.rawStdout !== undefined) return result.rawStdout
  const data = projectFields(result.data, flagString(parsed, "fields"))
  const envelope = successEnvelope({
    method: result.method,
    profile: result.profile,
    ...(result.fileKey === undefined ? {} : { fileKey: result.fileKey }),
    data,
    ...(result.paging === undefined ? {} : { paging: result.paging }),
    ...(result.warnings === undefined ? {} : { warnings: result.warnings })
  })
  const format = flagString(parsed, "format")
  if (format !== undefined && !["json", "ndjson", "table", "png", "jpg", "svg", "pdf"].includes(format)) {
    throw new UsageError({ message: "--format must be json, ndjson, or table for output", argument: "format" })
  }
  if (flagBoolean(parsed, "raw")) return serializeJson(data, flagBoolean(parsed, "pretty"))
  if (format === "ndjson") return toNdjson(primaryItems(data))
  const json = format === "json" || (format !== "table" && (flagBoolean(parsed, "json") || options.stdoutIsTty !== true))
  return json ? serializeJson(envelope, flagBoolean(parsed, "pretty")) : renderHumanEnvelope(envelope, { color: options.stdoutIsTty === true && !flagBoolean(parsed, "no-color") })
}

const primaryItems = (data: unknown): readonly unknown[] => {
  if (Array.isArray(data)) return data
  if (typeof data === "object" && data !== null) {
    for (const key of ["projects", "files", "comments", "versions", "components", "component_sets", "styles", "nodes", "items"]) {
      const value = (data as Record<string, unknown>)[key]
      if (Array.isArray(value)) return value
      if (key === "nodes" && typeof value === "object" && value !== null) return Object.values(value)
    }
  }
  return [data]
}

const rawResult = (method: string, rawStdout: string): DispatchResult => ({ method, profile: null, data: null, rawStdout })
const localResult = (method: string, data: unknown): DispatchResult => ({ method, profile: null, data })
const fileReference = (parsed: ParsedArgs, index: number) => parseFigmaReference(requirePositional(parsed, index, "FILE_OR_URL"))
const splitCsv = (value: string | undefined): readonly string[] => value === undefined ? [] : value.split(",").map((item) => item.trim()).filter(Boolean)
const normalizeIds = (value: string): string => splitCsv(value).map(normalizeNodeId).join(",")
const parsePositiveInteger = (value: string | undefined, name: string): number | undefined => {
  if (value === undefined) return undefined
  if (!/^\d+$/.test(value) || Number(value) < 1) throw new UsageError({ message: `--${name} must be a positive integer`, argument: name })
  return Number(value)
}
const parseScale = (value: string | undefined): number | undefined => {
  if (value === undefined) return undefined
  const scale = Number(value)
  if (!Number.isFinite(scale) || scale < 0.01 || scale > 4) throw new UsageError({ message: "--scale must be between 0.01 and 4", argument: "scale" })
  return scale
}
const parsePayload = (value: string): Readonly<Record<string, unknown>> => {
  try {
    const parsed: unknown = JSON.parse(value)
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("not an object")
    return parsed as Readonly<Record<string, unknown>>
  } catch {
    throw new UsageError({ message: "--payload must be a JSON object", argument: "payload" })
  }
}
const isScalar = (value: unknown): value is string | number | boolean => ["string", "number", "boolean"].includes(typeof value)
const rateWarnings = (headers: { readonly planTier?: string; readonly rateLimitType?: string }): readonly string[] => headers.rateLimitType === "low" ? [`Figma applied low read limits for this ${headers.planTier ?? "current"} plan/seat.`] : []
const pagingFrom = (data: unknown): Paging => {
  if (typeof data !== "object" || data === null) return { next_cursor: null, has_more: false }
  const pagination = (data as Record<string, unknown>).pagination
  if (typeof pagination !== "object" || pagination === null) return { next_cursor: null, has_more: false }
  const nextPage = (pagination as Record<string, unknown>).next_page
  if (typeof nextPage !== "string" || nextPage === "") return { next_cursor: null, has_more: false }
  try {
    const url = new URL(nextPage)
    return { next_cursor: url.searchParams.get("after") ?? url.searchParams.get("before") ?? nextPage, has_more: true }
  } catch {
    return { next_cursor: nextPage, has_more: true }
  }
}
