import type { DriverState } from "../../state.js"

export class InstallTestDriver {
  constructor(private readonly state: DriverState) {}

  setLatest(version: string): void {
    this.state.latestVersion = version
  }

  setInstallerFails(): void {
    this.state.installerOk = false
  }

  listRuns(): readonly (readonly string[])[] {
    return this.state.installerRuns
  }
}
