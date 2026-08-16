import { encryptGrant, env, firstValue, openSession, secureHeaders, type RequestLike, type ResponseLike, type TokenGrant } from "./shared"

export default async function handler(request: RequestLike, response: ResponseLike): Promise<void> {
  secureHeaders(response)
  try {
    const state = firstValue(request.query?.state)
    if (state === undefined) throw new Error("Missing OAuth state")
    const session = openSession(state, env("AGENT_FIGMA_OAUTH_SESSION_SECRET"))
    const target = new URL(session.callbackUri)
    target.searchParams.set("state", state)
    const oauthError = firstValue(request.query?.error)
    if (oauthError !== undefined) {
      target.searchParams.set("error", oauthError)
      return redirect(response, target)
    }
    const code = firstValue(request.query?.code)
    if (code === undefined) throw new Error("Missing authorization code")
    const token = await fetch("https://api.figma.com/v1/oauth/token", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "authorization": `Basic ${Buffer.from(`${env("FIGMA_CLIENT_ID")}:${env("FIGMA_CLIENT_SECRET")}`).toString("base64")}`
      },
      body: new URLSearchParams({
        redirect_uri: env("AGENT_FIGMA_OAUTH_REDIRECT_URI"),
        code,
        grant_type: "authorization_code",
        code_verifier: session.codeVerifier
      })
    })
    const body = await token.json() as Record<string, unknown>
    if (!token.ok || typeof body.access_token !== "string" || typeof body.expires_in !== "number") throw new Error("Figma token exchange failed")
    const grant: TokenGrant = {
      accessToken: body.access_token,
      expiresIn: body.expires_in,
      scopes: session.scopes,
      ...(typeof body.refresh_token === "string" ? { refreshToken: body.refresh_token } : {}),
      ...(typeof body.user_id_string === "string" ? { userId: body.user_id_string } : {})
    }
    target.searchParams.set("grant", encryptGrant(grant, session.publicKey, state))
    redirect(response, target)
  } catch (error) {
    response.statusCode = 400
    response.setHeader("content-type", "application/json; charset=utf-8")
    response.end(JSON.stringify({ error: error instanceof Error ? error.message : "OAuth callback failed" }))
  }
}

const redirect = (response: ResponseLike, target: URL): void => {
  response.statusCode = 302
  response.setHeader("location", target.toString())
  response.end()
}
