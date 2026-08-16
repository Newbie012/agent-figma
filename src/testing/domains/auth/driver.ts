import type { AuthProfile } from "../../../domain/figma.js"
import { ProfileName, Scope } from "../../../domain/ids.js"
import type { DriverState } from "../../state.js"
import type { OAuthLoginRequest, OAuthRefreshRequest, OAuthRefreshResult } from "../../../ports/OAuthFlow.js"

export class AuthTestDriver {
  constructor(private readonly state: DriverState) {}

  setProfile(options: {
    readonly name?: string
    readonly token?: string
    readonly scopes?: readonly string[]
    readonly credentialKind?: AuthProfile["credentialKind"]
    readonly accessToken?: string
    readonly refreshToken?: string
    readonly tokenExpiresAt?: number
    readonly oauthRelayUrl?: string
  } = {}): AuthProfile {
    const profile: AuthProfile = {
      name: ProfileName.make(options.name ?? "default"),
      credentialKind: options.credentialKind ?? "personal-access-token",
      accessToken: options.accessToken ?? options.token ?? "figd_test_token",
      scopes: (options.scopes ?? ["file_content:read"]).map((scope) => Scope.make(scope)),
      ...(options.refreshToken === undefined ? {} : { refreshToken: options.refreshToken }),
      ...(options.tokenExpiresAt === undefined ? {} : { tokenExpiresAt: options.tokenExpiresAt }),
      ...(options.oauthRelayUrl === undefined ? {} : { oauthRelayUrl: options.oauthRelayUrl })
    }
    const index = this.state.profiles.findIndex((item) => item.name === profile.name)
    if (index >= 0) this.state.profiles[index] = profile
    else this.state.profiles.push(profile)
    return profile
  }

  clearProfiles(): void {
    this.state.profiles.length = 0
  }

  completeOAuth(input: {
    readonly accessToken: string
    readonly refreshToken?: string
    readonly expiresIn: number
    readonly userId?: string
    readonly scopes: readonly string[]
  }): void {
    this.state.oauthLoginProfile = {
      name: ProfileName.make("default"),
      credentialKind: "oauth",
      accessToken: input.accessToken,
      scopes: input.scopes.map((scope) => Scope.make(scope)),
      tokenExpiresAt: Math.floor(Date.now() / 1000) + input.expiresIn,
      oauthRelayUrl: "https://relay.example.com",
      ...(input.refreshToken === undefined ? {} : { refreshToken: input.refreshToken }),
      ...(input.userId === undefined ? {} : { userId: input.userId })
    }
  }

  completeRefresh(result: OAuthRefreshResult): void {
    this.state.oauthRefreshResult = result
    this.state.oauthRefreshError = null
  }

  failRefresh(error: unknown): void {
    this.state.oauthRefreshError = error
  }

  listOAuthLoginCalls(): readonly OAuthLoginRequest[] {
    return this.state.oauthLoginCalls
  }

  listOAuthRefreshCalls(): readonly OAuthRefreshRequest[] {
    return this.state.oauthRefreshCalls
  }

  getProfile(name: string): AuthProfile | undefined {
    return this.state.profiles.find((profile) => profile.name === name)
  }
}
