import { describe, expect, it } from "vitest"
import {
  FigmaApiFailed,
  FigmaRateLimited,
  InvalidFigmaUrl,
  NotAuthenticated,
  PermissionDenied,
  ResourceNotFound,
  UsageError,
  WriteOperationBlocked
} from "../../src/domain/errors.js"
import { errorEnvelope } from "../../src/output/envelope.js"
import { renderHumanErrorEnvelope } from "../../src/output/human.js"

describe("error envelopes", () => {
  it.each([
    new NotAuthenticated({ message: "missing", profile: "default" }),
    new PermissionDenied({ message: "denied", path: "/v1/files/key", status: 403 }),
    new FigmaRateLimited({ message: "slow", path: "/v1/files/key", retryAfterSeconds: 10, planTier: "starter" }),
    new FigmaApiFailed({ message: "failed", path: "/v1/files/key", status: 500 }),
    new InvalidFigmaUrl({ message: "invalid", input: "bad" }),
    new ResourceNotFound({ message: "gone", path: "/v1/files/key" }),
    new WriteOperationBlocked({ message: "blocked", operation: "POST" }),
    new UsageError({ message: "usage", argument: "depth" })
  ])("serializes $._tag without losing its type", (error) => {
    const result = errorEnvelope(error)
    expect(result.exitCode).toBe(error.exitCode)
    expect(result.envelope.error.type).toBe(error._tag)
    expect(result.envelope.error.trace_id).toMatch(/^afg_/)
  })

  it("normalizes unknown failures and renders readable terminal errors", () => {
    const result = errorEnvelope(new Error("boom"))
    expect(result.envelope.error).toMatchObject({ type: "FigmaApiFailed", title: "boom" })
    expect(renderHumanErrorEnvelope(result.envelope)).toContain("Error FigmaApiFailed\nboom")
  })
})
