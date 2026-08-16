import { AuthTestDriver } from "./domains/auth/index.js"
import { CliTestDriver } from "./domains/cli/index.js"
import { FigmaTestDriver } from "./domains/figma/index.js"
import { createTestServices } from "./services.js"
import { createDriverState, type DriverState } from "./state.js"

export class FigmaCliTestDriver implements AsyncDisposable {
  readonly auth: AuthTestDriver
  readonly cli: CliTestDriver
  readonly figma: FigmaTestDriver

  private constructor(private readonly state: DriverState) {
    const services = createTestServices(state)
    this.auth = new AuthTestDriver(state)
    this.cli = new CliTestDriver(services)
    this.figma = new FigmaTestDriver(state)
  }

  static async create(): Promise<FigmaCliTestDriver> {
    return new FigmaCliTestDriver(createDriverState())
  }

  snapshot(): DriverState {
    return this.state
  }

  async [Symbol.asyncDispose](): Promise<void> {
    this.state.profiles.length = 0
    this.state.figmaCalls.length = 0
    this.state.figmaStubs.length = 0
    this.state.oauthLoginCalls.length = 0
    this.state.oauthRefreshCalls.length = 0
  }
}
