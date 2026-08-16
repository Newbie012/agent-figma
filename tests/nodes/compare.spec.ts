import { describe, expect, it } from "vitest"
import { FigmaCliTestDriver } from "../../src/testing/driver.js"

const panel = {
  id: "1:1",
  name: "Spend panel",
  type: "FRAME",
  layoutMode: "VERTICAL",
  itemSpacing: 12,
  boundVariables: { itemSpacing: { id: "VariableID:5112:232297" } },
  children: [
    {
      id: "1:2",
      name: "Label",
      type: "TEXT",
      characters: "Total spend",
      style: { fontSize: 14, fontWeight: 400 },
      styles: { text: "22:130524" }
    },
    {
      id: "1:3",
      name: "Value",
      type: "TEXT",
      characters: "$12,400",
      style: { fontSize: 24, fontWeight: 600 },
      styles: { text: "8449:134254" }
    }
  ]
}

const nodesPayload = {
  nodes: {
    "1:1": {
      document: panel,
      styles: {
        "22:130524": { name: "md/regular", styleType: "TEXT" },
        "8449:134254": { name: "lg/semi-bold", styleType: "TEXT" }
      }
    }
  }
}

// The reported bug: the label used the design system's text component, the value
// was raw markup inheriting the body size, and it rendered larger than designed.
const implementation = [
  'import { Text } from "@ds/text"',
  "",
  "export const SpendPanel = () => (",
  '  <div className="panel">',
  '    <Text variant="md/regular">Total spend</Text>',
  "    <span>{formatted}</span>",
  "  </div>",
  ")"
].join("\n")

const arrange = async (files: Readonly<Record<string, string>>) => {
  const driver = await FigmaCliTestDriver.create()
  driver.auth.setProfile()
  driver.figma.overrideGet({ path: "/v1/files/key/nodes", query: { ids: "1:1" }, data: nodesPayload })
  driver.figma.overrideGet({ path: "/v1/files/key/variables/local", data: { meta: { variables: {
    "VariableID:5112:232297": { id: "VariableID:5112:232297", name: "spacing/md" }
  } } } })
  driver.code.setFiles(files)
  return driver
}

const dataOf = (envelope: unknown) =>
  (envelope as { data: {
    findings: readonly { kind: string; value: string; found: boolean; file?: string; nodes: readonly string[] }[]
    missing: readonly { value: string }[]
    summary: { checked: number; missing: number; files: number }
  } }).data

describe("comparing a node against the code that implements it", () => {
  it("finds the text style the implementation never mentions", async () => {
    await using driver = await arrange({ "src/SpendPanel.tsx": implementation })

    const result = await driver.cli.runJson({
      args: ["node", "compare", "key", "--id", "1:1", "--code", "src/SpendPanel.tsx", "--json"]
    })

    expect(result.exitCode).toBe(0)
    const data = dataOf(result.envelope)
    expect(data.missing.map((item) => item.value)).toContain("lg/semi-bold")
    expect(data.findings).toContainEqual(expect.objectContaining({
      kind: "text-style",
      value: "md/regular",
      found: true,
      file: "src/SpendPanel.tsx"
    }))
    expect(data.findings).toContainEqual(expect.objectContaining({
      kind: "text-style",
      value: "lg/semi-bold",
      found: false,
      nodes: ["Value"]
    }))
  })

  it("expects the numbers only where the design named no style", async () => {
    await using driver = await FigmaCliTestDriver.create()
    driver.auth.setProfile()
    driver.figma.overrideGet({
      path: "/v1/files/key/nodes",
      query: { ids: "2:1" },
      data: { nodes: { "2:1": { document: {
        id: "2:1", name: "Loose label", type: "TEXT", style: { fontSize: 18, fontWeight: 700 }
      }, styles: {} } } }
    })
    driver.code.setFiles({ "src/loose.css": ".label { font-size: 18px }" })

    const result = await driver.cli.runJson({
      args: ["node", "compare", "key", "--id", "2:1", "--code", "src/loose.css", "--json"]
    })

    const data = dataOf(result.envelope)
    expect(data.findings).toContainEqual(expect.objectContaining({ kind: "font-size", value: "18", found: true }))
    expect(data.missing.map((item) => item.value)).toEqual(["700"])
  })

  it("names the node a missing token belongs to, so it can be found in the design", async () => {
    await using driver = await arrange({ "src/SpendPanel.tsx": implementation })

    const result = await driver.cli.runJson({
      args: ["node", "compare", "key", "--id", "1:1", "--code", "src/SpendPanel.tsx", "--json"]
    })

    const missing = dataOf(result.envelope).findings.filter((item) => !item.found)
    expect(missing.every((item) => item.nodes.length > 0)).toBe(true)
  })

  it("counts a token as implemented however the code spells it", async () => {
    await using driver = await arrange({
      "src/panel.css": ".value { font: var(--lg-semi-bold); gap: var(--spacing-md) }",
      "src/panel.tsx": '<Text variant="md/regular">x</Text>'
    })

    const result = await driver.cli.runJson({
      args: ["node", "compare", "key", "--id", "1:1", "--code", "src/panel.css,src/panel.tsx", "--json"]
    })

    expect(dataOf(result.envelope).missing).toEqual([])
  })

  it("never expects the code to mention a variable id it could not resolve", async () => {
    await using driver = await FigmaCliTestDriver.create()
    driver.auth.setProfile()
    driver.figma.overrideGet({ path: "/v1/files/key/nodes", query: { ids: "1:1" }, data: nodesPayload })
    driver.code.setFiles({ "src/panel.tsx": implementation })

    const result = await driver.cli.runJson({
      args: ["node", "compare", "key", "--id", "1:1", "--code", "src/panel.tsx", "--json"]
    })

    const values = dataOf(result.envelope).findings.map((item) => item.value)
    expect(values.some((value) => value.startsWith("VariableID:"))).toBe(false)
  })

  it("says which paths it could not read, and still compares the rest", async () => {
    await using driver = await arrange({ "src/SpendPanel.tsx": implementation })

    const result = await driver.cli.runJson({
      args: ["node", "compare", "key", "--id", "1:1", "--code", "src/SpendPanel.tsx,src/gone.tsx", "--json"]
    })

    expect(result.exitCode).toBe(0)
    expect(dataOf(result.envelope).summary.files).toBe(1)
    expect((result.envelope as { warnings: readonly string[] }).warnings.join(" ")).toContain("src/gone.tsx")
  })

  it("refuses to compare against nothing", async () => {
    await using driver = await arrange({ "src/SpendPanel.tsx": implementation })

    const result = await driver.cli.runJson({ args: ["node", "compare", "key", "--id", "1:1", "--json"] })

    expect(result.exitCode).toBe(2)
    expect(result.errorEnvelope).toMatchObject({
      ok: false,
      error: { type: "UsageError", details: { argument: "code", command: "node compare" } }
    })
  })

  it("reads a person a report, not an envelope", async () => {
    await using driver = await arrange({ "src/SpendPanel.tsx": implementation })

    const result = await driver.cli.run({
      args: ["node", "compare", "key", "--id", "1:1", "--code", "src/SpendPanel.tsx", "--no-color"],
      terminal: { stdoutIsTty: true }
    })

    expect(result.stdout).toContain("lg/semi-bold")
    expect(result.stdout).toContain("Value")
  })
})
