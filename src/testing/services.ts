import { BundledEndpointCatalog } from "../adapters/catalog/BundledEndpointCatalog.js"
import type { CliServices } from "../application/services.js"
import { FigmaApiFailed } from "../domain/errors.js"
import type { AuthProfile, FigmaGetInput, FigmaGetResult } from "../domain/figma.js"
import { ProfileName } from "../domain/ids.js"
import type { FigmaRestApi } from "../ports/FigmaRestApi.js"
import type { TokenStore } from "../ports/TokenStore.js"
import type { OAuthFlow, OAuthLoginRequest, OAuthRefreshRequest, OAuthRefreshResult } from "../ports/OAuthFlow.js"
import type { DriverState } from "./state.js"

class InMemoryTokenStore implements TokenStore {
  constructor(private readonly state: DriverState) {}

  async getProfile(name: string): Promise<AuthProfile | null> {
    return this.state.profiles.find((profile) => profile.name === name) ?? null
  }

  async setProfile(profile: AuthProfile): Promise<void> {
    const index = this.state.profiles.findIndex((item) => item.name === profile.name)
    if (index >= 0) this.state.profiles[index] = profile
    else this.state.profiles.push(profile)
  }

  async listProfiles(): Promise<readonly AuthProfile[]> {
    return this.state.profiles
  }

  async deleteProfile(name: string): Promise<boolean> {
    const before = this.state.profiles.length
    const next = this.state.profiles.filter((profile) => profile.name !== name)
    this.state.profiles.length = 0
    this.state.profiles.push(...next)
    return next.length !== before
  }
}

class FakeFigmaRestApi implements FigmaRestApi {
  constructor(private readonly state: DriverState) {}

  async get(input: FigmaGetInput): Promise<FigmaGetResult> {
    this.state.figmaCalls.push(input)
    const stub = this.state.figmaStubs.find((item) =>
      item.path === input.path && JSON.stringify(item.query ?? {}) === JSON.stringify(input.query ?? {})
    )
    if (stub === undefined) {
      throw new FigmaApiFailed({ message: `No Figma stub for ${input.path}`, path: input.path })
    }
    return stub.result
  }
}

class FakeOAuthFlow implements OAuthFlow {
  constructor(private readonly state: DriverState) {}

  async login(input: OAuthLoginRequest): Promise<AuthProfile> {
    this.state.oauthLoginCalls.push(input)
    if (this.state.oauthLoginProfile === null) {
      throw new FigmaApiFailed({ message: "No OAuth login result arranged", path: "oauth.login" })
    }
    return { ...this.state.oauthLoginProfile, name: ProfileName.make(input.profileName) }
  }

  async refresh(input: OAuthRefreshRequest): Promise<OAuthRefreshResult> {
    this.state.oauthRefreshCalls.push(input)
    if (this.state.oauthRefreshError !== null) throw this.state.oauthRefreshError
    if (this.state.oauthRefreshResult === null) {
      throw new FigmaApiFailed({ message: "No OAuth refresh result arranged", path: "oauth.refresh" })
    }
    return this.state.oauthRefreshResult
  }
}

export const createTestServices = (state: DriverState): CliServices => ({
  tokenStore: new InMemoryTokenStore(state),
  figmaRestApi: new FakeFigmaRestApi(state),
  endpointCatalog: new BundledEndpointCatalog(),
  oauthFlow: new FakeOAuthFlow(state)
})
