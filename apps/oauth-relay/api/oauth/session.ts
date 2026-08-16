import { randomBytes } from "node:crypto"
import { challengeFor, env, parseBody, readScopes, sealSession, secureHeaders, type RequestLike, type ResponseLike, type SessionPayload } from "./shared"

export default function handler(request: RequestLike, response: ResponseLike): void {
  secureHeaders(response)
  response.setHeader("content-type", "application/json; charset=utf-8")
  try {
    if (request.method !== "POST") return json(response, 405, { error: "Method not allowed" })
    const body = parseBody(request.body)
    const callbackUri = required(body.callbackUri, "callbackUri")
    const publicKey = required(body.publicKey, "publicKey")
    const codeVerifier = required(body.codeVerifier, "codeVerifier")
    const codeChallenge = required(body.codeChallenge, "codeChallenge")
    const scopes = Array.isArray(body.scopes) ? body.scopes.filter((scope): scope is string => typeof scope === "string") : []
    if (body.codeChallengeMethod !== "S256" || challengeFor(codeVerifier) !== codeChallenge) throw new Error("Invalid PKCE challenge")
    if (scopes.length === 0 || scopes.some((scope) => !readScopes.has(scope))) throw new Error("Only approved read scopes are allowed")
    const session: SessionPayload = {
      callbackUri,
      publicKey,
      codeVerifier,
      scopes,
      issuedAt: Date.now(),
      nonce: randomBytes(24).toString("base64url")
    }
    const state = sealSession(session, env("AGENT_FIGMA_OAUTH_SESSION_SECRET"))
    const redirectUri = env("AGENT_FIGMA_OAUTH_REDIRECT_URI")
    const authorizationUrl = new URL("https://www.figma.com/oauth")
    authorizationUrl.searchParams.set("client_id", env("FIGMA_CLIENT_ID"))
    authorizationUrl.searchParams.set("redirect_uri", redirectUri)
    authorizationUrl.searchParams.set("scope", scopes.join(","))
    authorizationUrl.searchParams.set("state", state)
    authorizationUrl.searchParams.set("response_type", "code")
    authorizationUrl.searchParams.set("code_challenge", codeChallenge)
    authorizationUrl.searchParams.set("code_challenge_method", "S256")
    json(response, 200, { state, authorization_url: authorizationUrl.toString() })
  } catch (error) {
    json(response, 400, { error: error instanceof Error ? error.message : "Invalid OAuth session" })
  }
}

const required = (value: unknown, name: string): string => {
  if (typeof value !== "string" || value === "") throw new Error(`Missing ${name}`)
  return value
}

const json = (response: ResponseLike, status: number, value: unknown): void => {
  response.statusCode = status
  response.end(JSON.stringify(value))
}
