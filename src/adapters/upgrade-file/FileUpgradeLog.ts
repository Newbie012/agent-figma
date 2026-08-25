import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import type { UpgradeCheck, UpgradeLog } from "../../ports/UpgradeLog.js"

export class FileUpgradeLog implements UpgradeLog {
  constructor(private readonly filePath: string) {}

  static fromEnv(env: NodeJS.ProcessEnv = process.env): FileUpgradeLog {
    const configDir = env.AGENT_FIGMA_CONFIG_DIR ?? join(env.HOME ?? process.cwd(), ".config", "agent-figma")
    return new FileUpgradeLog(join(configDir, "upgrade-check.json"))
  }

  // A missing or unreadable file is not a failure: it means nothing is known yet,
  // and a version hint is never worth failing a command over.
  async read(): Promise<UpgradeCheck> {
    try {
      const parsed = JSON.parse(await readFile(this.filePath, "utf8")) as UpgradeCheck | null
      return parsed === null || typeof parsed !== "object" ? {} : parsed
    } catch {
      return {}
    }
  }

  async write(check: UpgradeCheck): Promise<void> {
    try {
      await mkdir(dirname(this.filePath), { recursive: true })
      await writeFile(this.filePath, `${JSON.stringify(check, null, 2)}\n`, "utf8")
    } catch {
      return
    }
  }
}
