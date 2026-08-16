import { env, parseBody, secureHeaders, type RequestLike, type ResponseLike } from "./shared"

export default async function handler(request: RequestLike, response: ResponseLike): Promise<void> {
  secureHeaders(response)
  response.setHeader("content-type", "application/json; charset=utf-8")
  try {
    if (request.method !== "POST") return json(response, 405, { error: "Method not allowed" })
    const body = parseBody(request.body)
    if (typeof body.refreshToken !== "string" || body.refreshToken === "") throw new Error("Missing refresh token")
    const refreshed = await fetch("https://api.figma.com/v1/oauth/refresh", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "authorization": `Basic ${Buffer.from(`${env("FIGMA_CLIENT_ID")}:${env("FIGMA_CLIENT_SECRET")}`).toString("base64")}`
      },
      body: new URLSearchParams({ refresh_token: body.refreshToken })
    })
    const value = await refreshed.json() as Record<string, unknown>
    if (!refreshed.ok || typeof value.access_token !== "string" || typeof value.expires_in !== "number") throw new Error("Figma token refresh failed")
    json(response, 200, { accessToken: value.access_token, expiresIn: value.expires_in })
  } catch (error) {
    json(response, 400, { error: error instanceof Error ? error.message : "OAuth refresh failed" })
  }
}

const json = (response: ResponseLike, status: number, value: unknown): void => {
  response.statusCode = status
  response.end(JSON.stringify(value))
}
