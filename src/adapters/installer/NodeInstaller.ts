import { spawn } from "node:child_process"
import { PACKAGE } from "../../domain/upgrade.js"
import type { Installer, InstallerRun } from "../../ports/Installer.js"

const ASK_MS = 2_500
const RUN_MS = 300_000

export class NodeInstaller implements Installer {
  constructor(private readonly registry: string) {}

  static fromEnv(env: NodeJS.ProcessEnv = process.env): NodeInstaller {
    return new NodeInstaller(
      env.AGENT_FIGMA_REGISTRY ?? `https://registry.npmjs.org/-/package/${encodeURIComponent(PACKAGE)}/dist-tags`
    )
  }

  // The installer's own output is left on screen: a slow install has to look
  // alive, and swallowing it to reprint a summary helps nobody.
  async run(argv: readonly string[]): Promise<InstallerRun> {
    const [command, ...rest] = argv
    if (command === undefined) return { ok: false }
    return new Promise((resolve) => {
      let settled = false
      const settle = (result: InstallerRun) => {
        if (settled) return
        settled = true
        resolve(result)
      }
      const child = spawn(command, rest, { stdio: "inherit" })
      const timer = setTimeout(() => {
        child.kill()
        settle({ ok: false })
      }, RUN_MS)
      child.on("error", () => {
        clearTimeout(timer)
        settle({ ok: false })
      })
      child.on("close", (code: number | null) => {
        clearTimeout(timer)
        settle({ ok: code === 0 })
      })
    })
  }

  async latest(tag: string): Promise<string | undefined> {
    try {
      const response = await fetch(this.registry, { signal: AbortSignal.timeout(ASK_MS) })
      if (!response.ok) return undefined
      const tags = await response.json() as Record<string, string> | null
      const found = tags === null ? undefined : tags[tag]
      return typeof found === "string" ? found : undefined
    } catch {
      return undefined
    }
  }
}
