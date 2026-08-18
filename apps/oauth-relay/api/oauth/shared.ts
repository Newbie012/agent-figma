import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createPublicKey,
  diffieHellman,
  generateKeyPairSync,
  randomBytes
} from "node:crypto"

export interface SessionPayload {
  readonly callbackUri: string
  readonly publicKey: string
  readonly codeVerifier: string
  readonly scopes: readonly string[]
  readonly issuedAt: number
  readonly nonce: string
}

export interface TokenGrant {
  readonly accessToken: string
  readonly refreshToken?: string
  readonly expiresIn: number
  readonly userId?: string
  readonly scopes: readonly string[]
}

export const readScopes = new Set([
  "current_user:read",
  "projects:read",
  "file_content:read",
  "file_comments:read",
  "file_versions:read",
  "library_assets:read",
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

export const sealSession = (session: SessionPayload, secret: string): string => {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", secretKey(secret), iv)
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(session), "utf8"), cipher.final()])
  return Buffer.from(JSON.stringify({
    iv: iv.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
    ciphertext: ciphertext.toString("base64url")
  })).toString("base64url")
}

export const openSession = (state: string, secret: string): SessionPayload => {
  const envelope = JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as Record<string, unknown>
  if (typeof envelope.iv !== "string" || typeof envelope.tag !== "string" || typeof envelope.ciphertext !== "string") throw new Error("Invalid OAuth state")
  const decipher = createDecipheriv("aes-256-gcm", secretKey(secret), Buffer.from(envelope.iv, "base64url"))
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64url"))
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, "base64url")),
    decipher.final()
  ]).toString("utf8")
  const session = JSON.parse(plaintext) as SessionPayload
  validateSession(session)
  if (Date.now() - session.issuedAt > 5 * 60_000 || session.issuedAt > Date.now() + 30_000) throw new Error("OAuth state expired")
  return session
}

export const encryptGrant = (grant: TokenGrant, publicKeyValue: string, state: string): string => {
  const publicKey = createPublicKey({ key: Buffer.from(publicKeyValue, "base64url"), format: "der", type: "spki" })
  if (publicKey.asymmetricKeyType !== "x25519") throw new Error("Invalid client encryption key")
  const ephemeral = generateKeyPairSync("x25519")
  const sharedSecret = diffieHellman({ privateKey: ephemeral.privateKey, publicKey })
  const key = createHash("sha256").update(sharedSecret).update(state).digest()
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  cipher.setAAD(Buffer.from(state))
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(grant), "utf8"), cipher.final()])
  return Buffer.from(JSON.stringify({
    ephemeralPublicKey: ephemeral.publicKey.export({ format: "der", type: "spki" }).toString("base64url"),
    iv: iv.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
    ciphertext: ciphertext.toString("base64url")
  })).toString("base64url")
}

export const validateSession = (session: SessionPayload): void => {
  const callback = new URL(session.callbackUri)
  if (callback.protocol !== "http:" || !["localhost", "127.0.0.1", "::1", "[::1]"].includes(callback.hostname)) throw new Error("Callback must use loopback HTTP")
  if (callback.pathname !== "/oauth/figma/callback") throw new Error("Invalid callback path")
  if (!/^[A-Za-z0-9_-]{43,128}$/.test(session.codeVerifier)) throw new Error("Invalid PKCE verifier")
  if (!Array.isArray(session.scopes) || session.scopes.length === 0 || session.scopes.some((scope) => !readScopes.has(scope))) throw new Error("Invalid OAuth scopes")
  const key = createPublicKey({ key: Buffer.from(session.publicKey, "base64url"), format: "der", type: "spki" })
  if (key.asymmetricKeyType !== "x25519") throw new Error("Invalid client encryption key")
}

export const challengeFor = (verifier: string): string => createHash("sha256").update(verifier).digest("base64url")

// A relay missing its own credentials is not a caller's bad request. It answers
// 503 and names what is unset, so the operator reads the fault instead of guessing.
export class ConfigurationError extends Error {}

export const env = (name: string): string => {
  const value = process.env[name]
  if (value === undefined || value === "") throw new ConfigurationError(`This relay is not configured: ${name} is unset`)
  return value
}

export const statusFor = (error: unknown): number => (error instanceof ConfigurationError ? 503 : 400)

export const parseBody = (body: unknown): Record<string, unknown> => {
  if (typeof body === "string") return JSON.parse(body) as Record<string, unknown>
  if (typeof body === "object" && body !== null && !Array.isArray(body)) return body as Record<string, unknown>
  throw new Error("Expected a JSON object")
}

export const firstValue = (value: unknown): string | undefined => {
  if (typeof value === "string" && value !== "") return value
  if (Array.isArray(value) && typeof value[0] === "string" && value[0] !== "") return value[0]
  return undefined
}

export const secureHeaders = (response: ResponseLike): void => {
  response.setHeader("cache-control", "no-store")
  response.setHeader("referrer-policy", "no-referrer")
  response.setHeader("x-content-type-options", "nosniff")
}

export interface RequestLike {
  readonly method?: string
  readonly body?: unknown
  readonly query?: Readonly<Record<string, unknown>>
}

export interface ResponseLike {
  statusCode: number
  setHeader(name: string, value: string): void
  end(body?: string): void
}

const secretKey = (secret: string): Buffer => createHash("sha256").update(secret).digest()
