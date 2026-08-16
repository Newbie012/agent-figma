import { afterEach, describe, expect, it, vi } from "vitest"
import { FetchFigmaRestApi } from "../../src/adapters/figma-rest/FetchFigmaRestApi.js"
import {
  FigmaApiFailed,
  FigmaRateLimited,
  PermissionDenied,
  ResourceNotFound
} from "../../src/domain/errors.js"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("FetchFigmaRestApi", () => {
  it("sends personal tokens and query parameters on GET", async () => {
    const fetchMock = vi.fn<(input: URL, init?: RequestInit) => Promise<Response>>(async () => response({ name: "File" }, 200, {
      etag: "v1",
      "x-figma-plan-tier": "pro",
      "x-figma-rate-limit-type": "high"
    }))
    vi.stubGlobal("fetch", fetchMock)
    const api = new FetchFigmaRestApi({ baseUrl: "https://figma.test/" })

    const result = await api.get({
      token: "figd_secret",
      credentialKind: "personal-access-token",
      path: "/v1/files/key",
      query: { depth: "2" }
    })

    expect(result).toEqual({
      data: { name: "File" },
      headers: { etag: "v1", planTier: "pro", rateLimitType: "high" }
    })
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toBe("https://figma.test/v1/files/key?depth=2")
    expect(init).toMatchObject({ method: "GET", headers: { "X-Figma-Token": "figd_secret" } })
  })

  it("uses bearer auth for OAuth profiles", async () => {
    const fetchMock = vi.fn<(input: URL, init?: RequestInit) => Promise<Response>>(async () => response({}, 200))
    vi.stubGlobal("fetch", fetchMock)

    await new FetchFigmaRestApi().get({
      token: "oauth_secret",
      credentialKind: "oauth",
      path: "/v1/me"
    })

    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ headers: { Authorization: "Bearer oauth_secret" } })
  })

  it.each([
    [401, PermissionDenied, { err: "bad token" }],
    [404, ResourceNotFound, { message: "gone" }],
    [500, FigmaApiFailed, { err: "upstream failed" }]
  ])("maps HTTP %s to a typed failure", async (status, ErrorType, body) => {
    vi.stubGlobal("fetch", vi.fn(async () => response(body, status)))

    await expect(new FetchFigmaRestApi().get({
      token: "secret",
      credentialKind: "personal-access-token",
      path: "/v1/files/key"
    })).rejects.toBeInstanceOf(ErrorType)
  })

  it("preserves Figma rate-limit metadata", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response({}, 429, {
      "retry-after": "42",
      "x-figma-plan-tier": "starter"
    })))

    await expect(new FetchFigmaRestApi().get({
      token: "secret",
      credentialKind: "personal-access-token",
      path: "/v1/files/key"
    })).rejects.toMatchObject({
      _tag: "FigmaRateLimited",
      retryAfterSeconds: 42,
      planTier: "starter"
    } satisfies Partial<FigmaRateLimited>)
  })

  it("wraps invalid JSON and network failures", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response("not-json", 200, {}, false)))
    await expect(new FetchFigmaRestApi().get({
      token: "secret",
      credentialKind: "personal-access-token",
      path: "/v1/files/key"
    })).rejects.toBeInstanceOf(FigmaApiFailed)

    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline") }))
    await expect(new FetchFigmaRestApi().get({
      token: "secret",
      credentialKind: "personal-access-token",
      path: "/v1/files/key"
    })).rejects.toMatchObject({ _tag: "FigmaApiFailed", path: "/v1/files/key" })
  })
})

const response = (
  body: unknown,
  status: number,
  headers: Record<string, string> = {},
  json = true
): Response => {
  const value = new Response(json ? JSON.stringify(body) : String(body), { status, headers })
  Object.defineProperty(value, "url", { value: "https://api.figma.com/v1/files/key" })
  return value
}
