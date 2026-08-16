import { describe, expect, it } from "vitest"
import { FigmaCliTestDriver } from "../../src/testing/driver.js"

describe("node get", () => {
  it("extracts and normalizes the node ID from a Figma URL", async () => {
    await using driver = await FigmaCliTestDriver.create()
    driver.auth.setProfile()
    driver.figma.overrideGet({
      path: "/v1/files/AbC123/nodes",
      query: { ids: "12:34" },
      data: { nodes: { "12:34": { document: { name: "Button" } } } }
    })

    // ACT
    const result = await driver.cli.runJson({
      args: ["node", "get", "https://www.figma.com/design/AbC123/Kit?node-id=12-34", "--json"]
    })

    // ASSERT
    expect(result.exitCode).toBe(0)
    expect(result.envelope).toMatchObject({ ok: true, method: "node.get", file_key: "AbC123" })
    expect(driver.figma.listCalls()[0]).toMatchObject({ query: { ids: "12:34" } })
  })

  it("requires a node ID", async () => {
    await using driver = await FigmaCliTestDriver.create()
    driver.auth.setProfile()

    // ACT
    const result = await driver.cli.runJson({ args: ["node", "get", "AbC123", "--json"] })

    // ASSERT
    expect(result.exitCode).toBe(2)
    expect(result.errorEnvelope).toMatchObject({ ok: false, error: { type: "UsageError" } })
  })
})
