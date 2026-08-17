import { describe, expect, it } from "vitest"
import { newer, planFor, routeOf } from "../../src/domain/upgrade.js"
import { FigmaCliTestDriver } from "../../src/testing/driver.js"

const npmInstall = "/usr/local/lib/node_modules/@eliya-oss/agent-figma/dist/main.js"
const bunInstall = "/opt/bunhome/.bun/install/global/node_modules/@eliya-oss/agent-figma/dist/main.js"
const checkout = "/srv/projects/agent-figma/src/application/commands.ts"

describe("working out how this copy was installed", () => {
  it("reads the route from where the running module sits", () => {
    expect(routeOf(npmInstall)).toBe("npm")
    expect(routeOf(bunInstall)).toBe("bun")
    expect(routeOf(checkout)).toBe("source")
  })

  it("names the command that replaces each install", () => {
    expect(planFor("npm", npmInstall).command).toBe("npm install -g @eliya-oss/agent-figma@alpha")
    expect(planFor("bun", bunInstall).command).toBe("bun add -g @eliya-oss/agent-figma@alpha")
    expect(planFor("source", checkout).command).toContain("git -C /srv/projects/agent-figma pull")
  })

  it("refuses to pull a checkout, and says why", () => {
    const plan = planFor("source", checkout)
    expect(plan.runnable).toBe(false)
    expect(plan.reason).toContain("checkout")
  })

  it("orders prereleases the way a release channel does", () => {
    expect(newer("0.1.0-alpha.1", "0.1.0-alpha.0")).toBe(true)
    expect(newer("0.1.0-alpha.10", "0.1.0-alpha.9")).toBe(true)
    expect(newer("0.1.0", "0.1.0-alpha.9")).toBe(true)
    expect(newer("0.1.0-alpha.0", "0.1.0")).toBe(false)
    expect(newer("0.1.0-alpha.0", "0.1.0-alpha.0")).toBe(false)
    expect(newer("0.2.0-alpha.0", "0.1.0-alpha.30")).toBe(true)
  })
})

describe("upgrade", () => {
  it("runs the install for the route it found, and names the version it landed on", async () => {
    await using driver = await FigmaCliTestDriver.create()
    driver.install.setLatest("9.9.9")

    const result = await driver.cli.run({
      args: ["upgrade"],
      terminal: { stdoutIsTty: true, env: { AGENT_FIGMA_UPGRADE_ROUTE: "npm" } }
    })

    expect(result.exitCode).toBe(0)
    expect(driver.install.listRuns()).toEqual([["npm", "install", "-g", "@eliya-oss/agent-figma@alpha"]])
    expect(result.stdout).toBe("agent-figma 9.9.9 is installed.\n")
  })

  it("asks instead of telling under --check, and runs nothing", async () => {
    await using driver = await FigmaCliTestDriver.create()
    driver.install.setLatest("9.9.9")

    const result = await driver.cli.run({
      args: ["upgrade", "--check"],
      terminal: { stdoutIsTty: true, env: { AGENT_FIGMA_UPGRADE_ROUTE: "npm" } }
    })

    expect(result.exitCode).toBe(0)
    expect(driver.install.listRuns()).toEqual([])
    expect(result.stdout).toContain("9.9.9 is out")
    expect(result.stdout).toContain("npm install -g @eliya-oss/agent-figma@alpha")
  })

  it("says one line and runs nothing when the install is already current", async () => {
    await using driver = await FigmaCliTestDriver.create()
    driver.install.setLatest("0.0.0")

    const result = await driver.cli.run({
      args: ["upgrade"],
      terminal: { stdoutIsTty: true, env: { AGENT_FIGMA_UPGRADE_ROUTE: "npm" } }
    })

    expect(result.exitCode).toBe(0)
    expect(driver.install.listRuns()).toEqual([])
    expect(result.stdout).toContain("is the newest alpha build")
  })

  it("explains a checkout rather than pulling it, and exits 1 because nothing happened", async () => {
    await using driver = await FigmaCliTestDriver.create()
    driver.install.setLatest("9.9.9")

    const result = await driver.cli.run({
      args: ["upgrade"],
      terminal: { stdoutIsTty: true, env: { AGENT_FIGMA_UPGRADE_ROUTE: "source" } }
    })

    expect(result.exitCode).toBe(1)
    expect(driver.install.listRuns()).toEqual([])
    expect(result.stdout).toContain("checkout")
    expect(result.stdout).toContain("pnpm build")
  })

  it("exits 1 when the install command itself failed", async () => {
    await using driver = await FigmaCliTestDriver.create()
    driver.install.setLatest("9.9.9")
    driver.install.setInstallerFails()

    const result = await driver.cli.run({
      args: ["upgrade"],
      terminal: { stdoutIsTty: true, env: { AGENT_FIGMA_UPGRADE_ROUTE: "npm" } }
    })

    expect(result.exitCode).toBe(1)
    expect(result.stdout).toContain("Run it yourself")
  })

  it("keeps the envelope for a caller, whatever the exit code says", async () => {
    await using driver = await FigmaCliTestDriver.create()
    driver.install.setLatest("9.9.9")

    const result = await driver.cli.runJson({ args: ["upgrade", "--check", "--json"] })

    expect(result.exitCode).toBe(0)
    expect(result.envelope).toMatchObject({
      ok: true,
      method: "upgrade",
      data: { latest: "9.9.9", upToDate: false, ran: false, checked: true }
    })
  })

  it("still answers when the registry does not, without claiming a version", async () => {
    await using driver = await FigmaCliTestDriver.create()

    const result = await driver.cli.run({
      args: ["upgrade", "--check"],
      terminal: { stdoutIsTty: true, env: { AGENT_FIGMA_UPGRADE_ROUTE: "npm" } }
    })

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain("registry did not answer")
  })
})
