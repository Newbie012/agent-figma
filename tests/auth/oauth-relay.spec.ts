import { generateKeyPairSync } from "node:crypto"
import { describe, expect, it } from "vitest"
import { openSession, sealSession, validateSession, type SessionPayload } from "../../apps/oauth-relay/api/oauth/shared.js"

describe("OAuth relay sessions", () => {
  it("seals a short-lived PKCE session without server-side state", () => {
    const session = makeSession()

    // ACT
    const state = sealSession(session, "test-session-secret-with-enough-entropy")

    // ASSERT
    expect(state).not.toContain(session.codeVerifier)
    expect(openSession(state, "test-session-secret-with-enough-entropy")).toEqual(session)
  })

  it("rejects non-loopback callbacks and write scopes", () => {
    expect(() => validateSession(makeSession({ callbackUri: "https://attacker.example/callback" }))).toThrow("loopback")
    expect(() => validateSession(makeSession({ scopes: ["file_comments:write"] }))).toThrow("scopes")
  })
})

const makeSession = (overrides: Partial<SessionPayload> = {}): SessionPayload => {
  const publicKey = generateKeyPairSync("x25519").publicKey.export({ format: "der", type: "spki" }).toString("base64url")
  return {
    callbackUri: "http://localhost:45454/oauth/figma/callback",
    publicKey,
    codeVerifier: "a".repeat(43),
    scopes: ["current_user:read", "file_content:read"],
    issuedAt: Date.now(),
    nonce: "nonce",
    ...overrides
  }
}
