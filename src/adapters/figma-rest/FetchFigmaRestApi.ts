import {
  FigmaApiFailed,
  FigmaRateLimited,
  PermissionDenied,
  ResourceNotFound,
  isAgentFigmaError
} from "../../domain/errors.js"
import type { FigmaGetInput, FigmaGetResult } from "../../domain/figma.js"
import type { FigmaRestApi } from "../../ports/FigmaRestApi.js"

export class FetchFigmaRestApi implements FigmaRestApi {
  private readonly baseUrl: string

  constructor(options: { readonly baseUrl?: string } = {}) {
    this.baseUrl = (options.baseUrl ?? "https://api.figma.com").replace(/\/$/, "")
  }

  async get(input: FigmaGetInput): Promise<FigmaGetResult> {
    const url = new URL(`${this.baseUrl}${input.path}`)
    for (const [key, value] of Object.entries(input.query ?? {})) {
      url.searchParams.set(key, value)
    }

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: input.credentialKind === "personal-access-token"
          ? { "X-Figma-Token": input.token }
          : { Authorization: `Bearer ${input.token}` }
      })
      const data = await decodeBody(response)
      if (response.status === 401 || response.status === 403) {
        throw new PermissionDenied({
          message: errorMessage(data, "Figma denied this request"),
          path: input.path,
          status: response.status
        })
      }
      if (response.status === 404) {
        throw new ResourceNotFound({
          message: errorMessage(data, "Figma resource not found"),
          path: input.path
        })
      }
      if (response.status === 429) {
        const retryAfter = parseInteger(response.headers.get("retry-after"))
        const planTier = response.headers.get("x-figma-plan-tier") ?? undefined
        throw new FigmaRateLimited({
          message: errorMessage(data, "Figma rate limit reached"),
          path: input.path,
          ...(retryAfter === undefined ? {} : { retryAfterSeconds: retryAfter }),
          ...(planTier === undefined ? {} : { planTier })
        })
      }
      if (!response.ok) {
        throw new FigmaApiFailed({
          message: errorMessage(data, `Figma returned HTTP ${response.status}`),
          path: input.path,
          status: response.status
        })
      }

      const etag = response.headers.get("etag") ?? undefined
      const planTier = response.headers.get("x-figma-plan-tier") ?? undefined
      const rateLimitType = response.headers.get("x-figma-rate-limit-type") ?? undefined
      return {
        data,
        headers: {
          ...(etag === undefined ? {} : { etag }),
          ...(planTier === undefined ? {} : { planTier }),
          ...(rateLimitType === undefined ? {} : { rateLimitType })
        }
      }
    } catch (error) {
      if (isAgentFigmaError(error)) throw error
      throw new FigmaApiFailed({
        message: `Figma request failed: ${input.path}`,
        path: input.path,
        cause: error
      })
    }
  }
}

const decodeBody = async (response: Response): Promise<unknown> => {
  const text = await response.text()
  if (text === "") return null
  try {
    return JSON.parse(text) as unknown
  } catch (cause) {
    throw new FigmaApiFailed({
      message: "Figma returned invalid JSON",
      path: new URL(response.url).pathname,
      status: response.status,
      cause
    })
  }
}

const errorMessage = (data: unknown, fallback: string): string => {
  if (typeof data !== "object" || data === null) return fallback
  const record = data as Record<string, unknown>
  if (typeof record.err === "string") return record.err
  if (typeof record.message === "string") return record.message
  return fallback
}

const parseInteger = (value: string | null): number | undefined => {
  if (value === null || !/^\d+$/.test(value)) return undefined
  return Number.parseInt(value, 10)
}
