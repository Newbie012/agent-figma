import { describe, expect, it } from "vitest"
import { FigmaCliTestDriver } from "../../src/testing/driver.js"

describe("describe", () => {
  it("exposes a read-only machine-readable catalog", async () => {
    await using driver = await FigmaCliTestDriver.create()

    // ACT
    const result = await driver.cli.runJson({ args: ["describe", "--json"] })

    // ASSERT
    expect(result.exitCode).toBe(0)
    expect(result.envelope).toMatchObject({
      ok: true,
      method: "describe",
      paging: { next_cursor: null, has_more: false },
      data: {
        name: "agent-figma",
        aliases: ["afg"],
        read_only: true
      }
    })
    const commands = (result.envelope as { data: { commands: Array<{ safety: string }> } }).data.commands
    expect(commands.filter((command) => command.safety !== "read")).toEqual([
      expect.objectContaining({ safety: "local-destructive" })
    ])
    expect(commands).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: ["completion"] }),
      expect.objectContaining({ path: ["auth", "test"] }),
      expect.objectContaining({ path: ["api", "call"] }),
      expect.objectContaining({ path: ["file", "comments", "list"] })
    ]))
  })
})
