import type { AuthProfile, FigmaGetInput, FigmaGetResult } from "../domain/figma.js"
import type { OAuthLoginRequest, OAuthRefreshRequest, OAuthRefreshResult } from "../ports/OAuthFlow.js"

export interface FigmaStub {
  readonly path: string
  readonly query?: Readonly<Record<string, string>>
  readonly result: FigmaGetResult
}

export interface ImageSave {
  readonly url: string
  readonly path: string
}

export interface DriverState {
  readonly profiles: AuthProfile[]
  readonly sourceFiles: Map<string, string>
  readonly installerRuns: (readonly string[])[]
  readonly imageBytes: Map<string, number>
  readonly imageSaves: ImageSave[]
  installerOk: boolean
  latestVersion: string | undefined
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
  sourceFiles: new Map(),
  installerRuns: [],
  imageBytes: new Map(),
  imageSaves: [],
  installerOk: true,
  latestVersion: undefined,
  figmaStubs: [],
  figmaCalls: [],
  oauthLoginCalls: [],
  oauthRefreshCalls: [],
  oauthLoginProfile: null,
  oauthRefreshResult: null,
  oauthRefreshError: null
})
