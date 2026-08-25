import { describe, expect, it } from "vitest"
import { FigmaCliTestDriver } from "../../src/testing/driver.js"

const panel = {
  id: "10:1",
  name: "Panel",
  type: "FRAME",
  layoutMode: "VERTICAL",
  itemSpacing: 18,
  absoluteBoundingBox: { x: 100, y: 200, width: 424, height: 600 },
  children: [
    {
      id: "10:2",
      name: "Header",
      type: "FRAME",
      absoluteBoundingBox: { x: 118, y: 218, width: 388, height: 46 },
      children: [
        {
          id: "10:3",
          name: "Title",
          type: "TEXT",
          characters: "xmrig",
          absoluteBoundingBox: { x: 154, y: 218, width: 60, height: 28 }
        }
      ]
    },
    {
      id: "10:4",
      name: "Flagged in another detection",
      type: "FRAME",
      visible: false,
      absoluteBoundingBox: { x: 118, y: 300, width: 742, height: 40 },
      children: [
        { id: "10:5", name: "Link", type: "TEXT", absoluteBoundingBox: { x: 118, y: 300, width: 200, height: 20 } }
      ]
    }
  ]
}

const arrange = async () => {
  const driver = await FigmaCliTestDriver.create()
  driver.auth.setProfile()
  driver.figma.overrideGet({
    path: "/v1/files/key/nodes",
    query: { ids: "10:1" },
    data: { nodes: { "10:1": { document: panel, styles: {} } } }
  })
  return driver
}

const treeOf = async (driver: FigmaCliTestDriver, extra: readonly string[] = []) => {
  const result = await driver.cli.run({
    args: ["node", "get", "key", "--id", "10:1", "--no-ancestors", "--format", "tree", ...extra]
  })
  return { exitCode: result.exitCode, lines: result.stdout.trimEnd().split("\n") }
}

describe("the tree a person reads", () => {
  it("places each layer against the node that was asked for, not the canvas", async () => {
    await using driver = await arrange()

    const { exitCode, lines } = await treeOf(driver)

    expect(exitCode).toBe(0)
    expect(lines[0]).not.toContain("at=")
    expect(lines[1]).toContain("at=18,18")
    expect(lines[2]).toContain("at=54,18")
  })

  it("leaves out a layer the design does not render", async () => {
    await using driver = await arrange()

    const { lines } = await treeOf(driver)

    expect(lines.join("\n")).not.toContain("Flagged in another detection")
    expect(lines.join("\n")).not.toContain("Link")
  })

  it("shows a hidden layer when it is asked for, and says it is hidden", async () => {
    await using driver = await arrange()

    const { lines } = await treeOf(driver, ["--include-hidden"])

    const flagged = lines.find((line) => line.includes("Flagged in another detection"))
    expect(flagged).toContain("hidden")
    expect(lines.some((line) => line.includes("Link"))).toBe(true)
  })
})
