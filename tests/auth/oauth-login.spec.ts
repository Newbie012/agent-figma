import { describe, expect, it } from "vitest"
import { FigmaCliTestDriver } from "../../src/testing/driver.js"

describe("auth browser OAuth login", () => {
  it("uses browser OAuth by default and never returns its tokens", async () => {
    await using driver = await FigmaCliTestDriver.create()
    driver.auth.completeOAuth({
      accessToken: "figo_access_secret",
      refreshToken: "figr_refresh_secret",
      expiresIn: 3600,
      userId: "123456789012345678",
      scopes: ["current_user:read", "file_content:read"]
    })

    // ACT
    const result = await driver.cli.runJson({ args: ["auth", "login", "--profile", "work", "--json"] })

    // ASSERT
    expect(result.exitCode).toBe(0)
    expect(result.stdout).not.toContain("figo_access_secret")
    expect(result.stdout).not.toContain("figr_refresh_secret")
    expect(driver.auth.listOAuthLoginCalls()).toMatchObject([{
      profileName: "work",
      openBrowser: true,
      scopes: expect.arrayContaining(["current_user:read", "file_content:read"])
    }])
    expect(result.envelope).toMatchObject({
      ok: true,
      method: "auth.login",
      data: {
        name: "work",
        credential_kind: "oauth",
        user_id: "123456789012345678",
        authenticated: true,
        refreshable: true
      }
    })
  })

  it("keeps personal access token login as an explicit headless path", async () => {
    await using driver = await FigmaCliTestDriver.create()

    // ACT
    const result = await driver.cli.runJson({ args: ["auth", "login", "--token", "figd_secret", "--json"] })

    // ASSERT
    expect(result.exitCode).toBe(0)
    expect(driver.auth.listOAuthLoginCalls()).toEqual([])
    expect(result.envelope).toMatchObject({ data: { credential_kind: "personal-access-token", refreshable: false } })
  })

  it("rejects write scopes before opening OAuth", async () => {
    await using driver = await FigmaCliTestDriver.create()

    // ACT
    const result = await driver.cli.runJson({ args: ["auth", "login", "--scopes", "file_comments:write", "--json"] })

    // ASSERT
    expect(result.exitCode).toBe(2)
    expect(result.errorEnvelope).toMatchObject({ ok: false, error: { type: "UsageError" } })
    expect(driver.auth.listOAuthLoginCalls()).toEqual([])
  })
})

