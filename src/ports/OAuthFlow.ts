import type { AuthProfile } from "../domain/figma.js"

export interface OAuthLoginRequest {
  readonly profileName: string
  readonly scopes: readonly string[]
  readonly clientId?: string
  readonly clientSecret?: string
  readonly redirectUri?: string
  readonly localCallbackUri?: string
  readonly relayUrl?: string
  readonly authUrlOut?: string
  readonly timeoutMs?: number
  readonly openBrowser?: boolean
}

export interface OAuthRefreshRequest {
  readonly refreshToken: string
  readonly relayUrl: string
}

export interface OAuthRefreshResult {
  readonly accessToken: string
  readonly expiresIn: number
  readonly refreshToken?: string
}

export interface OAuthFlow {
  login(input: OAuthLoginRequest): Promise<AuthProfile>
  refresh(input: OAuthRefreshRequest): Promise<OAuthRefreshResult>
}
