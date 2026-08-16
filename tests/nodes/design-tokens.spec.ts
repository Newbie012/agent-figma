import { describe, expect, it } from "vitest"
import { FigmaCliTestDriver } from "../../src/testing/driver.js"

const frame = {
  id: "67307:140172",
  name: "Card",
  type: "FRAME",
  layoutMode: "VERTICAL",
  layoutSizingHorizontal: "FILL",
  layoutSizingVertical: "HUG",
  itemSpacing: 12,
  paddingLeft: 24,
  paddingRight: 24,
  cornerRadius: 8,
  absoluteBoundingBox: { width: 1120, height: 240 },
  boundVariables: {
    itemSpacing: { type: "VARIABLE_ALIAS", id: "VariableID:5112:232297" },
    fills: [{ type: "VARIABLE_ALIAS", id: "VariableID:2538:133336" }]
  },
  children: [
    {
      id: "67307:140173",
      name: "Title",
      type: "TEXT",
      characters: "Total spend",
      style: { fontSize: 14, fontWeight: 400 },
      styles: { text: "22:130524" }
    },
    {
      id: "67307:140174",
      name: "Row",
      type: "FRAME",
      layoutMode: "HORIZONTAL",
      itemSpacing: 12,
      boundVariables: { itemSpacing: { type: "VARIABLE_ALIAS", id: "VariableID:5112:232297" } },
      children: [
        { id: "67307:140175", name: "Value", type: "TEXT", characters: "$12,400", styles: { text: "8449:134254" } }
      ]
    }
  ]
}

const nodesPayload = {
  nodes: {
    "67307:140172": {
      document: frame,
      styles: {
        "22:130524": { name: "md/regular", styleType: "TEXT" },
        "8449:134254": { name: "lg/semi-bold", styleType: "TEXT" }
      }
    }
  }
}

const variablesPayload = {
  meta: {
    variables: {
      "VariableID:5112:232297": { id: "VariableID:5112:232297", name: "spacing/md" },
      "VariableID:2538:133336": { id: "VariableID:2538:133336", name: "neutral/0" }
    }
  }
}

const branchPayload = {
  document: {
    id: "0:0",
    name: "Document",
    type: "DOCUMENT",
    children: [
      {
        id: "0:1",
        name: "Page 1",
        type: "CANVAS",
        children: [
          {
            id: "2147:204810",
            name: "Wrapper",
            type: "FRAME",
            layoutMode: "VERTICAL",
            layoutSizingHorizontal: "FIXED",
            absoluteBoundingBox: { width: 850, height: 600 },
            children: [frame]
          }
        ]
      }
    ]
  }
}

const arrange = async (options: {
  readonly variables?: unknown
  readonly variablesFail?: boolean
  readonly ancestorsFail?: boolean
} = {}) => {
  const driver = await FigmaCliTestDriver.create()
  driver.auth.setProfile()
  driver.figma.overrideGet({ path: "/v1/files/key/nodes", query: { ids: "67307:140172" }, data: nodesPayload })
  if (options.variablesFail !== true) {
    driver.figma.overrideGet({ path: "/v1/files/key/variables/local", data: options.variables ?? variablesPayload })
  }
  if (options.ancestorsFail !== true) {
    driver.figma.overrideGet({ path: "/v1/files/key", query: { ids: "67307:140172" }, data: branchPayload })
  }
  return driver
}

const nodesOf = (envelope: unknown): Record<string, { document: Record<string, unknown> }> =>
  (envelope as { data: { nodes: Record<string, { document: Record<string, unknown> }> } }).data.nodes

const child = (document: Record<string, unknown>, index: number): Record<string, unknown> =>
  (document["children"] as Record<string, unknown>[])[index] as Record<string, unknown>

describe("design tokens in node output", () => {
  it("resolves text style names from the response, without a second request", async () => {
    await using driver = await arrange({ variablesFail: true })

    const result = await driver.cli.runJson({ args: ["node", "get", "key", "--id", "67307:140172", "--json"] })

    expect(result.exitCode).toBe(0)
    const document = nodesOf(result.envelope)["67307:140172"]?.document as Record<string, unknown>
    expect(child(document, 0)["tokens"]).toEqual({ text: "md/regular" })
    expect(driver.figma.listCalls().filter((call) => call.path.endsWith("/nodes"))).toHaveLength(1)
  })

  it("resolves bound variables to token names, once per file", async () => {
    await using driver = await arrange()

    const result = await driver.cli.runJson({ args: ["node", "get", "key", "--id", "67307:140172", "--json"] })

    const document = nodesOf(result.envelope)["67307:140172"]?.document as Record<string, unknown>
    expect(document["tokens"]).toEqual({ itemSpacing: "spacing/md", fills: ["neutral/0"] })
    expect(child(document, 1)["tokens"]).toEqual({ itemSpacing: "spacing/md" })
    expect(driver.figma.listCalls().filter((call) => call.path.includes("variables"))).toHaveLength(1)
    expect((result.envelope as { warnings: readonly string[] }).warnings).toEqual([])
  })

  it("keeps the raw id and says why when the variables endpoint refuses", async () => {
    await using driver = await arrange({ variablesFail: true })

    const result = await driver.cli.runJson({ args: ["node", "get", "key", "--id", "67307:140172", "--json"] })

    expect(result.exitCode).toBe(0)
    const document = nodesOf(result.envelope)["67307:140172"]?.document as Record<string, unknown>
    expect(document["tokens"]).toEqual({
      itemSpacing: "VariableID:5112:232297",
      fills: ["VariableID:2538:133336"]
    })
    const warnings = (result.envelope as { warnings: readonly string[] }).warnings
    expect(warnings.join(" ")).toContain("/v1/files/key/variables/local")
    expect(warnings.join(" ")).toContain("raw")
  })

  it("asks for no variables at all when nothing is bound to one", async () => {
    await using driver = await FigmaCliTestDriver.create()
    driver.auth.setProfile()
    driver.figma.overrideGet({
      path: "/v1/files/key/nodes",
      query: { ids: "1:2" },
      data: { nodes: { "1:2": { document: { id: "1:2", name: "Plain", type: "FRAME" }, styles: {} } } }
    })

    const result = await driver.cli.runJson({ args: ["node", "get", "key", "--id", "1:2", "--json"] })

    expect(result.exitCode).toBe(0)
    expect(driver.figma.listCalls().filter((call) => call.path.includes("variables"))).toHaveLength(0)
  })

  it("leaves every field the payload already had untouched", async () => {
    await using driver = await arrange()

    const result = await driver.cli.runJson({ args: ["node", "get", "key", "--id", "67307:140172", "--json"] })

    const document = nodesOf(result.envelope)["67307:140172"]?.document as Record<string, unknown>
    expect(document["itemSpacing"]).toBe(12)
    expect(document["absoluteBoundingBox"]).toEqual({ width: 1120, height: 240 })
    expect(child(document, 0)["styles"]).toEqual({ text: "22:130524" })
    expect(child(document, 0)["style"]).toEqual({ fontSize: 14, fontWeight: 400 })
  })

  it("renders a tree a person can read top to bottom", async () => {
    await using driver = await arrange()

    const result = await driver.cli.run({
      args: ["node", "get", "key", "--id", "67307:140172", "--format", "tree"]
    })

    expect(result.exitCode).toBe(0)
    const lines = result.stdout.trimEnd().split("\n")
    expect(lines[0]).toContain("FRAME Card")
    expect(lines[0]).toContain("1120x240")
    expect(lines[0]).toContain("vertical")
    expect(lines[0]).toContain("gap=spacing/md")
    expect(lines[0]).toContain("radius=8")
    expect(lines[1]).toMatch(/^ {2}TEXT Title/)
    expect(lines[1]).toContain("text=md/regular")
    expect(lines[3]).toMatch(/^ {4}TEXT Value/)
    expect(lines[3]).toContain("text=lg/semi-bold")
  })

  it("bounds a node read by depth, the way a file read does", async () => {
    await using driver = await FigmaCliTestDriver.create()
    driver.auth.setProfile()
    driver.figma.overrideGet({
      path: "/v1/files/key/nodes",
      query: { ids: "1:2", depth: "2" },
      data: { nodes: { "1:2": { document: { id: "1:2", name: "Plain", type: "FRAME" }, styles: {} } } }
    })

    const node = await driver.cli.runJson({ args: ["node", "get", "key", "--id", "1:2", "--depth", "2", "--json"] })
    const nodes = await driver.cli.runJson({ args: ["file", "nodes", "get", "key", "--ids", "1:2", "--depth", "2", "--json"] })

    expect(node.exitCode).toBe(0)
    expect(nodes.exitCode).toBe(0)
    expect(
      driver.figma.listCalls().filter((call) => call.path.endsWith("/nodes")).map((call) => call.query?.["depth"])
    ).toEqual(["2", "2"])
  })
})

describe("the sizing chain", () => {
  it("reports a node's own sizing and the parent that constrains it", async () => {
    await using driver = await arrange()

    const result = await driver.cli.runJson({ args: ["node", "get", "key", "--id", "67307:140172", "--json"] })

    const entry = nodesOf(result.envelope)["67307:140172"] as unknown as Record<string, unknown>
    const document = entry["document"] as Record<string, unknown>
    expect(document["sizing"]).toEqual({
      width: 1120,
      height: 240,
      horizontal: "FILL",
      vertical: "HUG",
      parent: { name: "Wrapper", horizontal: "FIXED", width: 850 }
    })
    expect(entry["ancestors"]).toEqual([
      { id: "0:1", name: "Page 1", type: "CANVAS" },
      { id: "2147:204810", name: "Wrapper", type: "FRAME", layoutMode: "VERTICAL", horizontal: "FIXED", width: 850 }
    ])
  })

  it("says a FILL width is measured, not fixed, in the tree", async () => {
    await using driver = await arrange()

    const result = await driver.cli.run({
      args: ["node", "get", "key", "--id", "67307:140172", "--format", "tree"]
    })

    expect(result.stdout).toContain("1120x240 (own=FILL, parent=FIXED 850)")
  })

  it("skips the extra request when asked to, and on a bulk node read", async () => {
    await using driver = await arrange()

    await driver.cli.runJson({ args: ["node", "get", "key", "--id", "67307:140172", "--no-ancestors", "--json"] })
    await driver.cli.runJson({ args: ["file", "nodes", "get", "key", "--ids", "67307:140172", "--json"] })

    expect(driver.figma.listCalls().filter((call) => call.path === "/v1/files/key")).toHaveLength(0)
  })

  it("reads the chain for a bulk node read when it is asked for", async () => {
    await using driver = await arrange()

    await driver.cli.runJson({ args: ["file", "nodes", "get", "key", "--ids", "67307:140172", "--ancestors", "--json"] })

    expect(driver.figma.listCalls().filter((call) => call.path === "/v1/files/key")).toHaveLength(1)
  })

  it("names the frame that fixed the width when the parent only filled it", async () => {
    await using driver = await FigmaCliTestDriver.create()
    driver.auth.setProfile()
    driver.figma.overrideGet({
      path: "/v1/files/key/nodes",
      query: { ids: "9:9" },
      data: { nodes: { "9:9": { document: { id: "9:9", name: "Panel", type: "FRAME", layoutSizingHorizontal: "FILL", absoluteBoundingBox: { width: 850, height: 100 } }, styles: {} } } }
    })
    driver.figma.overrideGet({
      path: "/v1/files/key",
      query: { ids: "9:9" },
      data: { document: { id: "0:0", type: "DOCUMENT", children: [
        { id: "0:1", name: "Page", type: "CANVAS", children: [
          { id: "1:1", name: "Header", type: "FRAME", layoutSizingHorizontal: "FIXED", absoluteBoundingBox: { width: 850, height: 400 }, children: [
            { id: "2:2", name: "Column", type: "FRAME", layoutSizingHorizontal: "FILL", absoluteBoundingBox: { width: 850, height: 200 }, children: [
              { id: "9:9", name: "Panel", type: "FRAME", layoutSizingHorizontal: "FILL", absoluteBoundingBox: { width: 850, height: 100 } }
            ] }
          ] }
        ] }
      ] } }
    })

    const result = await driver.cli.runJson({ args: ["node", "get", "key", "--id", "9:9", "--json"] })
    const document = nodesOf(result.envelope)["9:9"]?.document as Record<string, unknown>

    expect(document["sizing"]).toMatchObject({
      horizontal: "FILL",
      parent: { name: "Column", horizontal: "FILL", width: 850 },
      constrainedBy: { name: "Header", horizontal: "FIXED", width: 850 }
    })
  })

  it("still answers, with a warning, when the chain cannot be read", async () => {
    await using driver = await arrange({ ancestorsFail: true })

    const result = await driver.cli.runJson({ args: ["node", "get", "key", "--id", "67307:140172", "--json"] })

    expect(result.exitCode).toBe(0)
    const document = nodesOf(result.envelope)["67307:140172"]?.document as Record<string, unknown>
    expect(document["sizing"]).toEqual({ width: 1120, height: 240, horizontal: "FILL", vertical: "HUG" })
    expect((result.envelope as { warnings: readonly string[] }).warnings.join(" ")).toContain("ancestors")
  })
})
