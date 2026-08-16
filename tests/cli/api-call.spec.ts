import { describe, expect, it } from "vitest"
import { FigmaCliTestDriver } from "../../src/testing/driver.js"

describe("API discovery and call", () => {
  it("lists and describes bundled GET endpoints", async () => {
    await using driver = await FigmaCliTestDriver.create()

    const list = await driver.cli.runJson({ args: ["api", "endpoints", "list", "--family", "file", "--json"] })
    const described = await driver.cli.runJson({ args: ["api", "endpoint", "describe", "file.get", "--json"] })

    expect(list.envelope).toMatchObject({ method: "api.endpoints.list" })
    expect((list.envelope as { data: Array<{ operation: string }> }).data.every((item) => item.operation.startsWith("file."))).toBe(true)
    expect(described.envelope).toMatchObject({ data: { operation: "file.get", method: "GET" } })
  })

  it("calls only a cataloged GET operation", async () => {
    await using driver = await FigmaCliTestDriver.create()
    driver.auth.setProfile()
    driver.figma.overrideGet({
      path: "/v1/files/abc",
      query: { depth: "2" },
      data: { name: "Kit" }
    })

    const result = await driver.cli.runJson({
      args: ["api", "call", "file.get", "--payload", '{"key":"abc","depth":2}', "--json"]
    })

    expect(result.envelope).toMatchObject({ method: "file.get", data: { name: "Kit" } })
    expect(driver.figma.listCalls()).toEqual([expect.objectContaining({ path: "/v1/files/abc", query: { depth: "2" } })])
  })

  it("refuses unknown operations before making a request", async () => {
    await using driver = await FigmaCliTestDriver.create()
    driver.auth.setProfile()

    const result = await driver.cli.runJson({
      args: ["api", "call", "comments.post", "--payload", "{}", "--json"]
    })

    expect(result.errorEnvelope).toMatchObject({ ok: false, error: { type: "WriteOperationBlocked" } })
    expect(driver.figma.listCalls()).toEqual([])
  })
})
