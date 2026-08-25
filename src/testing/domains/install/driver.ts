import type { UpgradeCheck } from "../../../ports/UpgradeLog.js"
import type { DriverState } from "../../state.js"

export class InstallTestDriver {
  constructor(private readonly state: DriverState) {}

  setLatest(version: string): void {
    this.state.latestVersion = version
  }

  setInstallerFails(): void {
    this.state.installerOk = false
  }

  setChecked(check: UpgradeCheck): void {
    this.state.upgradeCheck = check
  }

  readCheck(): UpgradeCheck {
    return this.state.upgradeCheck
  }

  listRuns(): readonly (readonly string[])[] {
    return this.state.installerRuns
  }

  listLatestAsks(): readonly string[] {
    return this.state.latestAsks
  }
}
