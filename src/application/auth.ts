import { NotAuthenticated } from "../domain/errors.js"
import type { AuthProfile } from "../domain/figma.js"
import type { CliServices } from "./services.js"

const REFRESH_SKEW_SECONDS = 300

const ensureFreshToken = async (services: CliServices, profile: AuthProfile): Promise<AuthProfile> => {
  if (
    profile.credentialKind !== "oauth" ||
    profile.refreshToken === undefined ||
    profile.tokenExpiresAt === undefined ||
    profile.oauthRelayUrl === undefined ||
    profile.tokenExpiresAt - REFRESH_SKEW_SECONDS > Math.floor(Date.now() / 1000)
  ) return profile

  try {
    const refreshed = await services.oauthFlow.refresh({
      refreshToken: profile.refreshToken,
      relayUrl: profile.oauthRelayUrl
    })
    const updated: AuthProfile = {
      ...profile,
      accessToken: refreshed.accessToken,
      tokenExpiresAt: Math.floor(Date.now() / 1000) + refreshed.expiresIn,
      ...(refreshed.refreshToken === undefined ? {} : { refreshToken: refreshed.refreshToken })
    }
    await services.tokenStore.setProfile(updated)
    return updated
  } catch {
    throw new NotAuthenticated({
      message: `Figma OAuth session for ${profile.name} expired and could not be refreshed`,
      profile: profile.name
    })
  }
}

export const getProfile = async (services: CliServices, name: string): Promise<AuthProfile> => {
  const profile = await services.tokenStore.getProfile(name)
  if (profile === null) {
    throw new NotAuthenticated({
      message: `No Figma profile named ${name}`,
      profile: name
    })
  }
  return ensureFreshToken(services, profile)
}

export const sanitizeProfile = (profile: AuthProfile) => ({
  name: profile.name,
  credential_kind: profile.credentialKind,
  scopes: profile.scopes,
  authenticated: profile.accessToken.length > 0,
  refreshable: profile.refreshToken !== undefined && profile.oauthRelayUrl !== undefined,
  ...(profile.tokenExpiresAt === undefined ? {} : { token_expires_at: profile.tokenExpiresAt }),
  ...(profile.userId === undefined ? {} : { user_id: profile.userId }),
  ...(profile.email === undefined ? {} : { email: profile.email })
})
