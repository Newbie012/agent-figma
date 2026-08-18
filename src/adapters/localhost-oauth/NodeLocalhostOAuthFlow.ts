import {
  createDecipheriv,
  createHash,
  createPublicKey,
  diffieHellman,
  generateKeyPairSync,
  randomBytes,
  type KeyObject
} from "node:crypto"
import { spawn } from "node:child_process"
import { writeFile } from "node:fs/promises"
import { createServer } from "node:http"
import type { AddressInfo } from "node:net"
import { FigmaApiFailed, PermissionDenied, UsageError } from "../../domain/errors.js"
import type { AuthProfile } from "../../domain/figma.js"
import { ProfileName, Scope } from "../../domain/ids.js"
import type { OAuthFlow, OAuthLoginRequest, OAuthRefreshRequest, OAuthRefreshResult } from "../../ports/OAuthFlow.js"

interface OAuthFlowOptions {
  readonly relayUrl?: string
  readonly authorizeUrl?: string
  readonly tokenUrl?: string
  readonly defaultLocalCallbackUri?: string
  readonly defaultTimeoutMs?: number
  readonly openBrowser?: (url: string) => Promise<boolean>
}

interface OAuthGrant {
  readonly accessToken: string
  readonly refreshToken?: string
  readonly expiresIn: number
  readonly userId?: string
  readonly scopes: readonly string[]
}

interface EncryptedGrant {
  readonly ephemeralPublicKey: string
  readonly iv: string
  readonly tag: string
  readonly ciphertext: string
}

const defaultAuthorizeUrl = "https://www.figma.com/oauth"
const defaultTokenUrl = "https://api.figma.com/v1/oauth/token"
const defaultCallbackUri = "http://localhost:45454/oauth/figma/callback"

export class NodeLocalhostOAuthFlow implements OAuthFlow {
  constructor(private readonly options: OAuthFlowOptions = {}) {}

  static fromEnv(env: NodeJS.ProcessEnv = process.env): NodeLocalhostOAuthFlow {
    return new NodeLocalhostOAuthFlow({
      ...(env.AGENT_FIGMA_OAUTH_RELAY_URL === undefined ? {} : { relayUrl: env.AGENT_FIGMA_OAUTH_RELAY_URL }),
      authorizeUrl: env.AGENT_FIGMA_OAUTH_AUTHORIZE_URL ?? defaultAuthorizeUrl,
      tokenUrl: env.AGENT_FIGMA_OAUTH_TOKEN_URL ?? defaultTokenUrl,
      defaultLocalCallbackUri: env.AGENT_FIGMA_OAUTH_LOCAL_CALLBACK_URI ?? defaultCallbackUri,
      ...(env.AGENT_FIGMA_OAUTH_TIMEOUT_MS === undefined ? {} : { defaultTimeoutMs: Number(env.AGENT_FIGMA_OAUTH_TIMEOUT_MS) })
    })
  }

  async login(input: OAuthLoginRequest): Promise<AuthProfile> {
    const verifier = randomBytes(32).toString("base64url")
    const challenge = createHash("sha256").update(verifier).digest("base64url")
    const direct = input.clientId !== undefined || input.clientSecret !== undefined
    if (direct && (input.clientId === undefined || input.clientSecret === undefined)) {
      throw new UsageError({ message: "Self-hosted OAuth needs both --client-id and --client-secret" })
    }
    const relayUrl = direct ? undefined : requireRelayUrl(input.relayUrl ?? this.options.relayUrl)

    const server = createServer()
    const callbackUri = input.localCallbackUri ?? (direct ? input.redirectUri : undefined) ?? this.options.defaultLocalCallbackUri ?? defaultCallbackUri
    const started = await listen(server, callbackUri)
    const keyPair = generateKeyPairSync("x25519")
    let state: string
    let authorizationUrl: string

    if (direct) {
      if (input.redirectUri !== undefined && !isSameLoopbackCallback(input.redirectUri, started.callbackUri)) {
        closeServer(server)
        throw new UsageError({ message: "Self-hosted OAuth redirect URI must match the localhost callback", argument: "redirect-uri" })
      }
      state = randomBytes(24).toString("base64url")
      authorizationUrl = buildAuthorizationUrl({
        authorizeUrl: this.options.authorizeUrl ?? defaultAuthorizeUrl,
        clientId: input.clientId!,
        redirectUri: started.callbackUri,
        scopes: input.scopes,
        state,
        challenge
      })
    } else {
      if (relayUrl === undefined) throw new Error("OAuth relay URL invariant failed")
      const publicKey = keyPair.publicKey.export({ format: "der", type: "spki" }).toString("base64url")
      try {
        const response = await fetch(new URL("/api/oauth/session", relayUrl), {
          method: "POST",
          headers: { "content-type": "application/json", "accept": "application/json" },
          body: JSON.stringify({
            callbackUri: started.callbackUri,
            publicKey,
            codeVerifier: verifier,
            codeChallenge: challenge,
            codeChallengeMethod: "S256",
            scopes: input.scopes
          })
        })
        if (!response.ok) throw oauthRelayUnavailable(relayUrl, response.status)
        const body = await readJson(response, "OAuth relay session") as { readonly state?: unknown; readonly authorization_url?: unknown }
        if (typeof body.state !== "string" || typeof body.authorization_url !== "string") {
          throw new FigmaApiFailed({ message: "OAuth relay did not create a valid session", path: "/api/oauth/session", status: response.status })
        }
        state = body.state
        authorizationUrl = body.authorization_url
      } catch (error) {
        closeServer(server)
        if (error instanceof UsageError || error instanceof FigmaApiFailed) throw error
        throw oauthRelayUnavailable(relayUrl)
      }
    }

    try {
      await presentAuthorizationUrl({
        authorizationUrl,
        ...(input.authUrlOut === undefined ? {} : { authUrlOut: input.authUrlOut }),
        ...(input.openBrowser === undefined ? {} : { openBrowser: input.openBrowser }),
        opener: this.options.openBrowser ?? openSystemBrowser
      })
    } catch (error) {
      closeServer(server)
      throw error
    }

    const pending = waitForCallback({
      server,
      callbackUri: started.callbackUri,
      state,
      privateKey: keyPair.privateKey,
      timeoutMs: input.timeoutMs ?? this.options.defaultTimeoutMs ?? 120_000,
      ...(direct ? { exchangeDirect: async (code: string) => exchangeDirect({
        tokenUrl: this.options.tokenUrl ?? defaultTokenUrl,
        clientId: input.clientId!,
        clientSecret: input.clientSecret!,
        redirectUri: started.callbackUri,
        code,
        verifier,
        scopes: input.scopes
      }) } : {})
    })

    const grant = await pending
    return {
      name: ProfileName.make(input.profileName),
      credentialKind: "oauth",
      accessToken: grant.accessToken,
      scopes: grant.scopes.map((scope) => Scope.make(scope)),
      tokenExpiresAt: Math.floor(Date.now() / 1000) + grant.expiresIn,
      ...(grant.refreshToken === undefined ? {} : { refreshToken: grant.refreshToken }),
      ...(grant.userId === undefined ? {} : { userId: grant.userId }),
      ...(relayUrl === undefined ? { oauthClientId: input.clientId! } : { oauthRelayUrl: relayUrl })
    }
  }

  async refresh(input: OAuthRefreshRequest): Promise<OAuthRefreshResult> {
    const response = await fetch(new URL("/api/oauth/refresh", input.relayUrl), {
      method: "POST",
      headers: { "content-type": "application/json", "accept": "application/json" },
      body: JSON.stringify({ refreshToken: input.refreshToken })
    })
    const body = await readJson(response, "OAuth token refresh") as Partial<OAuthRefreshResult> & { readonly error?: unknown }
    if (!response.ok || typeof body.accessToken !== "string" || typeof body.expiresIn !== "number") {
      throw new PermissionDenied({
        message: typeof body.error === "string" ? body.error : "Figma OAuth token refresh failed",
        path: "/api/oauth/refresh",
        status: response.status
      })
    }
    return {
      accessToken: body.accessToken,
      expiresIn: body.expiresIn,
      ...(typeof body.refreshToken === "string" ? { refreshToken: body.refreshToken } : {})
    }
  }
}

const waitForCallback = (input: {
  readonly server: ReturnType<typeof createServer>
  readonly callbackUri: string
  readonly state: string
  readonly privateKey: KeyObject
  readonly timeoutMs: number
  readonly exchangeDirect?: (code: string) => Promise<OAuthGrant>
}): Promise<OAuthGrant> => new Promise((resolve, reject) => {
  const expectedPath = new URL(input.callbackUri).pathname
  const timer = setTimeout(() => {
    closeServer(input.server)
    reject(new UsageError({ message: "Timed out waiting for Figma OAuth callback" }))
  }, input.timeoutMs)

  input.server.on("request", async (request, response) => {
    const requestUrl = new URL(request.url ?? "/", input.callbackUri)
    if (requestUrl.pathname !== expectedPath) {
      response.writeHead(404).end("Not found")
      return
    }
    try {
      if (requestUrl.searchParams.get("state") !== input.state) {
        throw new PermissionDenied({ message: "Figma OAuth state mismatch", path: expectedPath, status: 400 })
      }
      const oauthError = requestUrl.searchParams.get("error")
      if (oauthError !== null) {
        throw new PermissionDenied({ message: `Figma OAuth failed: ${oauthError}`, path: expectedPath, status: 403 })
      }
      let grant: OAuthGrant
      if (input.exchangeDirect !== undefined) {
        const code = requestUrl.searchParams.get("code")
        if (code === null || code === "") throw new UsageError({ message: "Figma OAuth callback did not include a code" })
        grant = await input.exchangeDirect(code)
      } else {
        const encrypted = requestUrl.searchParams.get("grant")
        if (encrypted === null || encrypted === "") throw new UsageError({ message: "Figma OAuth callback did not include an encrypted grant" })
        grant = decryptGrant(encrypted, input.privateKey, input.state)
      }
      clearTimeout(timer)
      response.writeHead(200, { "content-type": "text/html; charset=utf-8", "connection": "close" }).end(callbackPage("Figma connected", true), () => closeServer(input.server))
      resolve(grant)
    } catch (error) {
      clearTimeout(timer)
      response.writeHead(400, { "content-type": "text/html; charset=utf-8", "connection": "close" }).end(callbackPage("Figma authentication failed", false), () => closeServer(input.server))
      reject(error)
    }
  })
})

const decryptGrant = (encoded: string, privateKey: KeyObject, state: string): OAuthGrant => {
  let envelope: EncryptedGrant
  try {
    envelope = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as EncryptedGrant
    const ephemeralPublicKey = createPublicKey({ key: Buffer.from(envelope.ephemeralPublicKey, "base64url"), format: "der", type: "spki" })
    const sharedSecret = diffieHellman({ privateKey, publicKey: ephemeralPublicKey })
    const key = createHash("sha256").update(sharedSecret).update(state).digest()
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(envelope.iv, "base64url"))
    decipher.setAAD(Buffer.from(state))
    decipher.setAuthTag(Buffer.from(envelope.tag, "base64url"))
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, "base64url")),
      decipher.final()
    ]).toString("utf8")
    const value = JSON.parse(plaintext) as Partial<OAuthGrant>
    if (typeof value.accessToken !== "string" || typeof value.expiresIn !== "number" || !Array.isArray(value.scopes)) throw new Error("invalid grant")
    return {
      accessToken: value.accessToken,
      expiresIn: value.expiresIn,
      scopes: value.scopes.filter((scope): scope is string => typeof scope === "string"),
      ...(typeof value.refreshToken === "string" ? { refreshToken: value.refreshToken } : {}),
      ...(typeof value.userId === "string" ? { userId: value.userId } : {})
    }
  } catch (cause) {
    throw new FigmaApiFailed({ message: "Could not decrypt the OAuth grant", path: "oauth.callback", cause })
  }
}

const exchangeDirect = async (input: {
  readonly tokenUrl: string
  readonly clientId: string
  readonly clientSecret: string
  readonly redirectUri: string
  readonly code: string
  readonly verifier: string
  readonly scopes: readonly string[]
}): Promise<OAuthGrant> => {
  const response = await fetch(input.tokenUrl, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "authorization": `Basic ${Buffer.from(`${input.clientId}:${input.clientSecret}`).toString("base64")}`
    },
    body: new URLSearchParams({
      redirect_uri: input.redirectUri,
      code: input.code,
      grant_type: "authorization_code",
      code_verifier: input.verifier
    })
  })
  const body = await readJson(response, "Figma OAuth exchange") as Record<string, unknown>
  if (!response.ok || typeof body.access_token !== "string" || typeof body.expires_in !== "number") {
    throw new PermissionDenied({ message: "Figma OAuth token exchange failed", path: "/v1/oauth/token", status: response.status })
  }
  return {
    accessToken: body.access_token,
    expiresIn: body.expires_in,
    scopes: input.scopes,
    ...(typeof body.refresh_token === "string" ? { refreshToken: body.refresh_token } : {}),
    ...(typeof body.user_id_string === "string" ? { userId: body.user_id_string } : {})
  }
}

const buildAuthorizationUrl = (input: {
  readonly authorizeUrl: string
  readonly clientId: string
  readonly redirectUri: string
  readonly scopes: readonly string[]
  readonly state: string
  readonly challenge: string
}): string => {
  const url = new URL(input.authorizeUrl)
  url.searchParams.set("client_id", input.clientId)
  url.searchParams.set("redirect_uri", input.redirectUri)
  url.searchParams.set("scope", input.scopes.join(","))
  url.searchParams.set("state", input.state)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("code_challenge", input.challenge)
  url.searchParams.set("code_challenge_method", "S256")
  return url.toString()
}

const listen = (server: ReturnType<typeof createServer>, callbackUri: string): Promise<{ readonly callbackUri: string }> =>
  new Promise((resolve, reject) => {
    const parsed = new URL(callbackUri)
    if (parsed.protocol !== "http:" || !isLoopbackHost(parsed.hostname)) {
      reject(new UsageError({ message: "OAuth local callback must use loopback HTTP", argument: "local-callback-uri" }))
      return
    }
    const port = parsed.port === "" ? 80 : Number(parsed.port)
    if (!Number.isInteger(port) || port < 0 || port > 65_535) {
      reject(new UsageError({ message: "OAuth local callback has an invalid port", argument: "local-callback-uri" }))
      return
    }
    server.once("error", reject)
    server.listen(port, parsed.hostname, () => {
      const actualPort = (server.address() as AddressInfo).port
      resolve({ callbackUri: `http://${parsed.hostname}:${actualPort}${parsed.pathname}` })
    })
  })

const isSameLoopbackCallback = (left: string, right: string): boolean => {
  const a = new URL(left)
  const b = new URL(right)
  return a.protocol === "http:" && isLoopbackHost(a.hostname) && a.hostname === b.hostname && a.port === b.port && a.pathname === b.pathname
}

const isLoopbackHost = (host: string): boolean => ["localhost", "127.0.0.1", "::1", "[::1]"].includes(host)

const requireRelayUrl = (value: string | undefined): string => {
  if (value === undefined || value.trim() === "") {
    throw new UsageError({
      message: "Browser OAuth needs AGENT_FIGMA_OAUTH_RELAY_URL pointing to a trusted deployed relay, or use auth login --token TOKEN.",
      argument: "oauth"
    })
  }
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new UsageError({ message: "OAuth relay URL is invalid", argument: "oauth-relay-url" })
  }
  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLoopbackHost(url.hostname))) {
    throw new UsageError({ message: "OAuth relay URL must use HTTPS (loopback HTTP is allowed for local development)", argument: "oauth-relay-url" })
  }
  if (url.username !== "" || url.password !== "" || url.search !== "" || url.hash !== "") {
    throw new UsageError({ message: "OAuth relay URL must not contain credentials, query parameters, or a fragment", argument: "oauth-relay-url" })
  }
  return url.toString().replace(/\/$/, "")
}

const presentAuthorizationUrl = async (input: {
  readonly authorizationUrl: string
  readonly authUrlOut?: string
  readonly openBrowser?: boolean
  readonly opener: (url: string) => Promise<boolean>
}): Promise<void> => {
  if (input.authUrlOut !== undefined) {
    await writeFile(input.authUrlOut, input.authorizationUrl, "utf8")
    return
  }
  if (input.openBrowser === false) {
    process.stderr.write(`Open this Figma OAuth URL:\n${input.authorizationUrl}\n`)
    return
  }
  const opened = await input.opener(input.authorizationUrl)
  process.stderr.write(opened
    ? `Opening Figma OAuth in your browser.\nIf it did not open, visit:\n${input.authorizationUrl}\n`
    : `Could not open a browser automatically. Visit:\n${input.authorizationUrl}\n`)
}

const readJson = async (response: Response, label: string): Promise<unknown> => {
  try {
    return await response.json()
  } catch (cause) {
    throw new FigmaApiFailed({ message: `${label} returned invalid JSON`, path: response.url, status: response.status, cause })
  }
}

const callbackPage = (title: string, success: boolean): string => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Agent Figma</title><style>:root{color-scheme:dark}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#000;color:#fff;font:16px/1.5 ui-monospace,monospace}main{text-align:center}i{display:block;width:52px;height:52px;margin:0 auto 24px;border-radius:14px;background:${success ? "#a259ff" : "#555"}}h1{font-size:20px;font-weight:400}</style></head><body><main><i></i><h1>${title}</h1><p>Return to the terminal.</p></main></body></html>`

const oauthRelayUnavailable = (relayUrl: string, status?: number): UsageError => new UsageError({
  message: `Browser OAuth is not configured at ${relayUrl}${status === undefined ? "" : ` (HTTP ${status})`}. Deploy apps/oauth-relay and set AGENT_FIGMA_OAUTH_RELAY_URL, or use auth login --token TOKEN.`,
  argument: "oauth"
})

const closeServer = (server: ReturnType<typeof createServer>): void => {
  server.close()
  server.closeAllConnections()
}

const openSystemBrowser = (url: string): Promise<boolean> => new Promise((resolve) => {
  const command = process.platform === "darwin"
    ? { file: "open", args: [url] }
    : process.platform === "win32"
      ? { file: "cmd", args: ["/c", "start", "", url] }
      : { file: "xdg-open", args: [url] }
  const child = spawn(command.file, command.args, { detached: true, stdio: "ignore" })
  child.once("error", () => resolve(false))
  child.once("spawn", () => {
    child.unref()
    resolve(true)
  })
})
