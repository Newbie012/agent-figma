import { describe, expect, it } from "vitest"
import { FigmaCliTestDriver } from "../../src/testing/driver.js"

describe("auth profiles", () => {
  it("stores a token but never returns it", async () => {
    await using driver = await FigmaCliTestDriver.create()

    // ACT
    const result = await driver.cli.runJson({
      args: ["auth", "login", "--token", "figd_secret", "--scopes", "file_content:read", "--json"]
    })

    // ASSERT
    expect(result.exitCode).toBe(0)
    expect(result.stdout).not.toContain("figd_secret")
    expect(result.envelope).toMatchObject({
      ok: true,
      method: "auth.login",
      data: {
        name: "default",
        credential_kind: "personal-access-token",
        scopes: ["file_content:read"],
        authenticated: true
      }
    })
  })

  it("requires explicit confirmation before deleting a profile", async () => {
    await using driver = await FigmaCliTestDriver.create()
    driver.auth.setProfile()

    // ACT
    const blocked = await driver.cli.runJson({ args: ["auth", "logout", "--json"] })
    const deleted = await driver.cli.runJson({ args: ["auth", "logout", "--yes", "--json"] })

    // ASSERT
    expect(blocked.exitCode).toBe(2)
    expect(blocked.errorEnvelope).toMatchObject({ ok: false, error: { type: "UsageError" } })
    expect(deleted.envelope).toMatchObject({ data: { profile: "default", deleted: true } })
  })
})
