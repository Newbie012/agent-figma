import type { AuthProfile, FigmaGetInput, FigmaGetResult } from "../domain/figma.js"
import type { OAuthLoginRequest, OAuthRefreshRequest, OAuthRefreshResult } from "../ports/OAuthFlow.js"

export interface FigmaStub {
  readonly path: string
  readonly query?: Readonly<Record<string, string>>
  readonly result: FigmaGetResult
}

export interface DriverState {
  readonly profiles: AuthProfile[]
  readonly figmaStubs: FigmaStub[]
  readonly figmaCalls: FigmaGetInput[]
  readonly oauthLoginCalls: OAuthLoginRequest[]
  readonly oauthRefreshCalls: OAuthRefreshRequest[]
  oauthLoginProfile: AuthProfile | null
  oauthRefreshResult: OAuthRefreshResult | null
  oauthRefreshError: unknown | null
}

export const createDriverState = (): DriverState => ({
  profiles: [],
  figmaStubs: [],
  figmaCalls: [],
  oauthLoginCalls: [],
  oauthRefreshCalls: [],
  oauthLoginProfile: null,
  oauthRefreshResult: null,
  oauthRefreshError: null
})
