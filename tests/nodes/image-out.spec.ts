import { describe, expect, it } from "vitest"
import { FigmaCliTestDriver } from "../../src/testing/driver.js"

const RENDER = "https://figma-alpha-api.s3.example/render.png"

const arrange = async () => {
  const driver = await FigmaCliTestDriver.create()
  driver.auth.setProfile()
  driver.figma.overrideGet({
    path: "/v1/images/abc",
    query: { ids: "1:2", format: "png" },
    data: { images: { "1:2": RENDER } }
  })
  driver.image.setBytes(RENDER, 2048)
  return driver
}

describe("writing a render to disk", () => {
  it("saves the rendered node where it was asked to, and says where it went", async () => {
    await using driver = await arrange()

    const result = await driver.cli.runJson({
      args: ["image", "render", "abc", "--ids", "1-2", "--out", "shots/panel.png", "--json"]
    })

    expect(result.exitCode).toBe(0)
    expect(result.envelope).toMatchObject({ ok: true, data: { path: "shots/panel.png", bytes: 2048 } })
    expect(driver.image.listSaves()).toEqual([{ url: RENDER, path: "shots/panel.png" }])
  })

  it("refuses to write several renders to one path", async () => {
    await using driver = await arrange()

    const result = await driver.cli.runJson({
      args: ["image", "render", "abc", "--ids", "1:2,3:4", "--out", "shots/panel.png", "--json"]
    })

    expect(result.exitCode).not.toBe(0)
    expect(result.errorEnvelope).toMatchObject({ ok: false, error: { type: "UsageError", details: { argument: "out" } } })
    expect(driver.image.listSaves()).toEqual([])
  })

  it("says so when Figma rendered nothing for the node", async () => {
    await using driver = await FigmaCliTestDriver.create()
    driver.auth.setProfile()
    driver.figma.overrideGet({
      path: "/v1/images/abc",
      query: { ids: "1:2", format: "png" },
      data: { images: { "1:2": null } }
    })

    const result = await driver.cli.runJson({
      args: ["image", "render", "abc", "--ids", "1:2", "--out", "shots/panel.png", "--json"]
    })

    expect(result.exitCode).not.toBe(0)
    expect(driver.image.listSaves()).toEqual([])
  })
})
