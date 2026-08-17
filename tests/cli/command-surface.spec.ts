import { describe, expect, it } from "vitest"
import { FigmaCliTestDriver } from "../../src/testing/driver.js"

describe("CLI surface", () => {
  it("renders version and human help", async () => {
    await using driver = await FigmaCliTestDriver.create()

    const version = await driver.cli.run({ args: ["--version"], terminal: { stdoutIsTty: true } })
    const help = await driver.cli.run({ args: ["file", "get", "--help"], terminal: { stdoutIsTty: true } })
    const jsonHelp = await driver.cli.runJson({ args: ["file", "get", "--help", "--json"] })

    expect(version.stdout).toMatch(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?\n$/)
    expect(help.stdout).toContain("agent-figma file get FILE_OR_URL")
    expect(jsonHelp.envelope).toMatchObject({ data: { path: ["file", "get"] } })
  })

  it("lists and inspects sanitized profiles", async () => {
    await using driver = await FigmaCliTestDriver.create()
    driver.auth.setProfile({ name: "work", token: "do-not-print" })

    const status = await driver.cli.runJson({ args: ["auth", "status", "--profile", "work", "--json"] })
    const list = await driver.cli.runJson({ args: ["auth", "profiles", "list", "--json"] })

    expect(status.envelope).toMatchObject({ profile: "work", data: { name: "work" } })
    expect(list.envelope).toMatchObject({ data: [{ name: "work" }] })
    expect(status.stdout + list.stdout).not.toContain("do-not-print")
  })

  it("supports raw file keys, node --id, human output, and low-limit warnings", async () => {
    await using driver = await FigmaCliTestDriver.create()
    driver.auth.setProfile()
    driver.figma.overrideGet({
      path: "/v1/files/key",
      data: { name: "File" },
      headers: { planTier: "starter", rateLimitType: "low" }
    })
    driver.figma.overrideGet({
      path: "/v1/files/key/nodes",
      query: { ids: "1:2" },
      data: { nodes: {} }
    })

    const file = await driver.cli.run({ args: ["file", "get", "key", "--no-color"], terminal: { stdoutIsTty: true } })
    const node = await driver.cli.runJson({ args: ["node", "get", "key", "--id", "1:2", "--json"] })

    expect(file.stdout).toContain("OK file.get")
    expect(file.stdout).toContain("File")
    expect(node.envelope).toMatchObject({ method: "node.get" })
    expect(driver.figma.listCalls()).toHaveLength(2)
  })

  it("keeps top-level help and completion conventions stable", async () => {
    await using driver = await FigmaCliTestDriver.create()

    const help = await driver.cli.run({ args: ["--help", "--no-color"], terminal: { stdoutIsTty: true } })
    const completion = await driver.cli.run({ args: ["completion", "zsh"], terminal: { stdoutIsTty: true } })

    expect(help.stdout).toMatch(/^agent-figma \d+\.\d+\.\d+/)
    expect(help.stdout).toContain("Read Figma context from the command line. Every command is read-only.")
    expect(help.stdout).toContain("Usage\n  agent-figma COMMAND [flags]")
    expect(help.stdout).toContain("Figma reads")
    expect(help.stdout).toContain("  api call")
    expect(completion.stdout).toContain("#compdef agent-figma afg")
    expect(completion.stdout).toContain("'file get:")
  })

  it("teaches the loop when a person runs it with nothing, and answers the catalog when a script does", async () => {
    await using driver = await FigmaCliTestDriver.create()

    const person = await driver.cli.run({ args: [], terminal: { stdoutIsTty: true } })
    const script = await driver.cli.runJson({ args: [] })

    expect(person.stdout).toContain("agent-figma auth login")
    expect(person.stdout).not.toContain('"read_only"')
    expect(script.envelope).toMatchObject({ ok: true, method: "describe", data: { read_only: true } })
  })

  it("names each flag a command takes on its own help page", async () => {
    await using driver = await FigmaCliTestDriver.create()

    const help = await driver.cli.run({ args: ["file", "get", "-h", "--no-color"], terminal: { stdoutIsTty: true } })

    expect(help.stdout).toContain("Usage\n  agent-figma file get FILE_OR_URL [--profile NAME] [--depth N]")
    expect(help.stdout).toContain("--depth N")
    expect(help.stdout).toContain("Bound how deep the document tree is read.")
    expect(help.stdout).toContain("Reads\n  GET /v1/files/:key")
  })

  it("colours help for a person, and leaves it plain when asked", async () => {
    await using driver = await FigmaCliTestDriver.create()

    const painted = await driver.cli.run({ args: ["--help"], terminal: { stdoutIsTty: true } })
    const asked = await driver.cli.run({ args: ["--help", "--no-color"], terminal: { stdoutIsTty: true } })
    const declined = await driver.cli.run({ args: ["--help"], terminal: { stdoutIsTty: true, env: { NO_COLOR: "1" } } })
    const piped = await driver.cli.run({ args: ["--help"] })

    expect(painted.stdout).toContain("\u001b[33mFigma reads\u001b[39m")
    expect(asked.stdout).not.toContain("\u001b[")
    expect(declined.stdout).not.toContain("\u001b[")
    expect(piped.stdout).not.toContain("\u001b[")
  })

  it("prints the version for -v", async () => {
    await using driver = await FigmaCliTestDriver.create()

    const version = await driver.cli.run({ args: ["-v"], terminal: { stdoutIsTty: true } })

    expect(version.stdout).toMatch(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?\n$/)
  })

  it("refuses a flag the command does not have, instead of reading past it", async () => {
    await using driver = await FigmaCliTestDriver.create()
    driver.auth.setProfile()

    const result = await driver.cli.runJson({ args: ["file", "get", "key", "--depht", "2", "--json"] })

    expect(result.exitCode).toBe(2)
    expect(result.errorEnvelope).toMatchObject({
      ok: false,
      error: {
        type: "UsageError",
        details: { argument: "depht", command: "file get", did_you_mean: "--depth" }
      }
    })
    expect(driver.figma.listCalls()).toHaveLength(0)
  })

  it("names the nearest command when one is mistyped", async () => {
    await using driver = await FigmaCliTestDriver.create()

    const result = await driver.cli.runJson({ args: ["fil", "get", "key", "--json"] })

    expect(result.errorEnvelope).toMatchObject({
      ok: false,
      error: { type: "UsageError", details: { did_you_mean: "file get" }, suggestion: "Run `agent-figma file get --help` for what it needs." }
    })
  })

  it("lists the verbs a noun has when it is given without one", async () => {
    await using driver = await FigmaCliTestDriver.create()

    const result = await driver.cli.runJson({ args: ["auth", "--json"] })

    expect(result.errorEnvelope).toMatchObject({
      ok: false,
      error: { type: "UsageError", details: { alternatives: expect.arrayContaining(["auth status", "auth login"]) } }
    })
  })

  it("names the command and its usage when a required flag is missing", async () => {
    await using driver = await FigmaCliTestDriver.create()
    driver.auth.setProfile()

    const result = await driver.cli.runJson({ args: ["file", "nodes", "get", "key", "--json"] })

    expect(result.errorEnvelope).toMatchObject({
      ok: false,
      error: {
        type: "UsageError",
        details: {
          argument: "ids",
          command: "file nodes get",
          usage: "agent-figma file nodes get FILE_OR_URL --ids ID[,ID] [--depth N] [--ancestors] [--profile NAME] [--json] [--format json|ndjson|table|tree] [--fields a,b.c]"
        },
        suggestion: "Run `agent-figma file nodes get --help` for what it needs."
      }
    })
  })

  it.each([
    [["file", "get", "key", "--depth", "0", "--json"], "UsageError"],
    [["missing", "command", "--json"], "UsageError"],
    [["file", "get", "--help", "--json", "extra"], "UsageError"]
  ])("returns structured usage errors for %j", async (args, type) => {
    await using driver = await FigmaCliTestDriver.create()
    driver.auth.setProfile()
    const result = await driver.cli.runJson({ args })
    expect(result.errorEnvelope).toMatchObject({ ok: false, error: { type } })
  })
})
