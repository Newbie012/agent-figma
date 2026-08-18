import { AuthTestDriver } from "./domains/auth/index.js"
import { CliTestDriver } from "./domains/cli/index.js"
import { CodeTestDriver } from "./domains/code/index.js"
import { FigmaTestDriver } from "./domains/figma/index.js"
import { InstallTestDriver } from "./domains/install/index.js"
import { createTestServices } from "./services.js"
import { createDriverState, type DriverState } from "./state.js"

export class FigmaCliTestDriver implements AsyncDisposable {
  readonly auth: AuthTestDriver
  readonly cli: CliTestDriver
  readonly code: CodeTestDriver
  readonly figma: FigmaTestDriver
  readonly install: InstallTestDriver

  private constructor(private readonly state: DriverState) {
    const services = createTestServices(state)
    this.auth = new AuthTestDriver(state)
    this.cli = new CliTestDriver(services)
    this.code = new CodeTestDriver(state)
    this.figma = new FigmaTestDriver(state)
    this.install = new InstallTestDriver(state)
  }

  static async create(): Promise<FigmaCliTestDriver> {
    return new FigmaCliTestDriver(createDriverState())
  }

  async [Symbol.asyncDispose](): Promise<void> {
    this.state.profiles.length = 0
    this.state.figmaCalls.length = 0
    this.state.figmaStubs.length = 0
    this.state.oauthLoginCalls.length = 0
    this.state.oauthRefreshCalls.length = 0
    this.state.sourceFiles.clear()
    this.state.installerRuns.length = 0
    this.state.installerOk = true
    this.state.latestVersion = undefined
  }
}
