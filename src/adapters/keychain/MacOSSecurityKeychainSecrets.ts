import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { UsageError } from "../../domain/errors.js"
import type { KeychainSecrets } from "./KeychainTokenStore.js"

const execFileAsync = promisify(execFile)

export class MacOSSecurityKeychainSecrets implements KeychainSecrets {
  private readonly service = "agent-figma"

  async get(account: string): Promise<string | null> {
    this.assertDarwin()
    try {
      const { stdout } = await execFileAsync("security", ["find-generic-password", "-s", this.service, "-a", account, "-w"])
      return stdout.trimEnd()
    } catch {
      return null
    }
  }

  async set(account: string, value: string): Promise<void> {
    this.assertDarwin()
    await execFileAsync("security", ["add-generic-password", "-s", this.service, "-a", account, "-w", value, "-U"])
  }

  async delete(account: string): Promise<void> {
    this.assertDarwin()
    try {
      await execFileAsync("security", ["delete-generic-password", "-s", this.service, "-a", account])
    } catch {
      // Deleting a missing item is idempotent for TokenStore semantics.
    }
  }

  private assertDarwin(): void {
    if (process.platform !== "darwin") {
      throw new UsageError({ message: "Keychain token storage is only supported on macOS" })
    }
  }
}
