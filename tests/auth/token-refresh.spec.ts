import { describe, expect, it } from "vitest"
import { FigmaCliTestDriver } from "../../src/testing/driver.js"

describe("OAuth token refresh", () => {
  it("refreshes an expiring profile before a Figma read and persists it", async () => {
    await using driver = await FigmaCliTestDriver.create()
    driver.auth.setProfile({
      credentialKind: "oauth",
      accessToken: "expired-access",
      refreshToken: "refresh-secret",
      tokenExpiresAt: Math.floor(Date.now() / 1000) - 1,
      oauthRelayUrl: "https://relay.example.com"
    })
    driver.auth.completeRefresh({ accessToken: "fresh-access", expiresIn: 3600 })
    driver.figma.overrideGet({ path: "/v1/me", data: { id: "U1", handle: "Ada" } })

    // ACT
    const result = await driver.cli.runJson({ args: ["user", "get", "--json"] })

    // ASSERT
    expect(result.exitCode).toBe(0)
    expect(driver.auth.listOAuthRefreshCalls()).toEqual([{
      refreshToken: "refresh-secret",
      relayUrl: "https://relay.example.com"
    }])
    expect(driver.figma.listCalls()[0]?.token).toBe("fresh-access")
    expect(driver.auth.getProfile("default")?.accessToken).toBe("fresh-access")
  })

  it("asks for login when refresh fails", async () => {
    await using driver = await FigmaCliTestDriver.create()
    driver.auth.setProfile({
      credentialKind: "oauth",
      accessToken: "expired-access",
      refreshToken: "refresh-secret",
      tokenExpiresAt: 0,
      oauthRelayUrl: "https://relay.example.com"
    })
    driver.auth.failRefresh(new Error("invalid refresh token"))

    // ACT
    const result = await driver.cli.runJson({ args: ["user", "get", "--json"] })

    // ASSERT
    expect(result.exitCode).toBe(4)
    expect(result.errorEnvelope).toMatchObject({
      ok: false,
      error: { type: "NotAuthenticated", suggestion: expect.stringContaining("auth login") }
    })
  })
})

