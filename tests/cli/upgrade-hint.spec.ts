import { describe, expect, it } from "vitest"
import { FigmaCliTestDriver } from "../../src/testing/driver.js"

const A_TERMINAL = { stdoutIsTty: true, env: {} }
const YESTERDAY = new Date(Date.now() - 2 * 86_400_000).toISOString()

const arrange = async () => {
  const driver = await FigmaCliTestDriver.create()
  driver.auth.setProfile()
  driver.figma.overrideGet({ path: "/v1/me", data: { id: "1", handle: "someone" } })
  return driver
}

describe("saying a newer version is out", () => {
  it("mentions it beside the answer, and leaves the answer alone", async () => {
    await using driver = await arrange()
    driver.install.setChecked({ latest: "9.9.9", checkedAt: new Date().toISOString() })

    const result = await driver.cli.run({ args: ["user", "get"], terminal: A_TERMINAL })

    expect(result.exitCode).toBe(0)
    expect(result.stderr).toContain("9.9.9 is out")
    expect(result.stderr).toContain("agent-figma upgrade")
    expect(result.stdout).not.toContain("9.9.9 is out")
  })

  it("says it once, not on every command after", async () => {
    await using driver = await arrange()
    driver.install.setChecked({ latest: "9.9.9", checkedAt: new Date().toISOString() })

    await driver.cli.run({ args: ["user", "get"], terminal: A_TERMINAL })
    const second = await driver.cli.run({ args: ["user", "get"], terminal: A_TERMINAL })

    expect(second.stderr).toBe("")
  })

  it("stays quiet for anything that is not a person at a terminal", async () => {
    await using driver = await arrange()
    driver.install.setChecked({ latest: "9.9.9", checkedAt: new Date().toISOString() })

    const result = await driver.cli.run({ args: ["user", "get"], terminal: { stdoutIsTty: false, env: {} } })

    expect(result.stderr).toBe("")
  })

  it("stays quiet when it is switched off, and asks the registry nothing", async () => {
    await using driver = await arrange()
    driver.install.setLatest("9.9.9")
    driver.install.setChecked({ latest: "9.9.9", checkedAt: YESTERDAY })

    const result = await driver.cli.run({
      args: ["user", "get"],
      terminal: { stdoutIsTty: true, env: { AGENT_FIGMA_NO_UPGRADE_CHECK: "1" } }
    })

    expect(result.stderr).toBe("")
    expect(driver.install.listLatestAsks()).toEqual([])
  })

  it("says nothing when the version it holds is the one that is installed", async () => {
    await using driver = await arrange()
    driver.install.setChecked({ latest: "0.0.0", checkedAt: new Date().toISOString() })

    const result = await driver.cli.run({ args: ["user", "get"], terminal: A_TERMINAL })

    expect(result.stderr).toBe("")
  })
})

describe("asking the registry in the background", () => {
  it("asks once a day, after the answer is already on screen", async () => {
    await using driver = await arrange()
    driver.install.setLatest("9.9.9")
    driver.install.setChecked({ latest: "0.0.1", checkedAt: YESTERDAY })

    await driver.cli.run({ args: ["user", "get"], terminal: A_TERMINAL })

    expect(driver.install.listLatestAsks()).toHaveLength(1)
    expect(driver.install.readCheck()?.latest).toBe("9.9.9")
  })

  it("does not ask again while what it holds is still fresh", async () => {
    await using driver = await arrange()
    driver.install.setLatest("9.9.9")
    driver.install.setChecked({ latest: "9.9.9", checkedAt: new Date().toISOString() })

    await driver.cli.run({ args: ["user", "get"], terminal: A_TERMINAL })

    expect(driver.install.listLatestAsks()).toEqual([])
  })
})
