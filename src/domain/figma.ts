import { FileKey, NodeId, type ProfileName, type Scope } from "./ids.js"
import { InvalidFigmaUrl } from "./errors.js"

export type CredentialKind = "personal-access-token" | "oauth"

export interface AuthProfile {
  readonly name: ProfileName
  readonly credentialKind: CredentialKind
  readonly accessToken: string
  readonly scopes: readonly Scope[]
  readonly userId?: string
  readonly email?: string
  readonly refreshToken?: string
  readonly tokenExpiresAt?: number
  readonly oauthRelayUrl?: string
  readonly oauthClientId?: string
}

export interface FigmaReference {
  readonly fileKey: FileKey
  readonly nodeId?: NodeId
}

export interface FigmaGetInput {
  readonly token: string
  readonly credentialKind: CredentialKind
  readonly path: string
  readonly query?: Readonly<Record<string, string>>
}

export interface FigmaGetResult {
  readonly data: unknown
  readonly headers: {
    readonly etag?: string
    readonly planTier?: string
    readonly rateLimitType?: string
  }
}

export interface SuccessEnvelope {
  readonly ok: true
  readonly method: string
  readonly profile: string | null
  readonly file_key: string | null
  readonly data: unknown
  readonly paging: Paging
  readonly warnings: readonly string[]
}

export interface Paging {
  readonly next_cursor: string | null
  readonly has_more: boolean
}

export interface ErrorEnvelope {
  readonly ok: false
  readonly error: {
    readonly type: string
    readonly title: string
    readonly retriable: boolean
    readonly retry_after_seconds?: number
    readonly suggestion?: string
    readonly trace_id: string
    readonly details?: Readonly<Record<string, unknown>>
  }
}

const figmaFileKinds = new Set(["design", "file", "proto", "board", "slides"])

export const parseFigmaReference = (input: string): FigmaReference => {
  const trimmed = input.trim()
  if (trimmed === "") {
    throw invalidReference(input)
  }
  if (!trimmed.includes("://")) {
    return { fileKey: FileKey.make(trimmed) }
  }

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw invalidReference(input)
  }

  if (url.protocol !== "https:" || (url.hostname !== "figma.com" && url.hostname !== "www.figma.com")) {
    throw invalidReference(input)
  }

  const segments = url.pathname.split("/").filter(Boolean)
  const kind = segments[0]
  const key = segments[1]
  if (kind === undefined || key === undefined || !figmaFileKinds.has(kind)) {
    throw invalidReference(input)
  }

  const rawNodeId = url.searchParams.get("node-id")
  if (rawNodeId === "") {
    throw invalidReference(input)
  }
  return {
    fileKey: FileKey.make(key),
    ...(rawNodeId === null ? {} : { nodeId: NodeId.make(normalizeNodeId(rawNodeId)) })
  }
}

export const normalizeNodeId = (value: string): string => {
  const decoded = decodeURIComponent(value.trim())
  return /^\d+-\d+$/.test(decoded) ? decoded.replace("-", ":") : decoded
}

const invalidReference = (input: string) =>
  new InvalidFigmaUrl({
    message: "Expected a Figma file URL or raw file key",
    input
  })
