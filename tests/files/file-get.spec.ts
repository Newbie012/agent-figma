import { describe, expect, it } from "vitest"
import { FigmaCliTestDriver } from "../../src/testing/driver.js"

describe("file get", () => {
  it("reads a Figma URL with a bounded depth", async () => {
    await using driver = await FigmaCliTestDriver.create()
    driver.auth.setProfile({ token: "figd_secret" })
    driver.figma.overrideGet({
      path: "/v1/files/AbC123",
      query: { depth: "2" },
      data: { name: "Checkout", document: { id: "0:0" } }
    })

    // ACT
    const result = await driver.cli.runJson({
      args: ["file", "get", "https://www.figma.com/design/AbC123/Checkout", "--depth", "2", "--json"]
    })

    // ASSERT
    expect(result.exitCode).toBe(0)
    expect(result.envelope).toMatchObject({
      ok: true,
      method: "file.get",
      file_key: "AbC123",
      paging: { next_cursor: null, has_more: false },
      data: { name: "Checkout" }
    })
    expect(driver.figma.listCalls()).toEqual([
      expect.objectContaining({
        token: "figd_secret",
        credentialKind: "personal-access-token",
        path: "/v1/files/AbC123",
        query: { depth: "2" }
      })
    ])
    expect(result.stdout).not.toContain("figd_secret")
  })

  it("returns a structured authentication failure", async () => {
    await using driver = await FigmaCliTestDriver.create()

    // ACT
    const result = await driver.cli.runJson({ args: ["file", "get", "AbC123", "--json"] })

    // ASSERT
    expect(result.exitCode).toBe(4)
    expect(result.stdout).toBe("")
    expect(result.errorEnvelope).toMatchObject({
      ok: false,
      error: {
        type: "NotAuthenticated",
        retriable: false
      }
    })
  })
})
