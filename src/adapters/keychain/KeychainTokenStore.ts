import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { UsageError } from "../../domain/errors.js"
import type { AuthProfile } from "../../domain/figma.js"
import { ProfileName, Scope } from "../../domain/ids.js"
import type { TokenStore } from "../../ports/TokenStore.js"
import { MacOSSecurityKeychainSecrets } from "./MacOSSecurityKeychainSecrets.js"

export interface KeychainSecrets {
  get(account: string): Promise<string | null>
  set(account: string, value: string): Promise<void>
  delete(account: string): Promise<void>
}

interface StoredProfile {
  readonly name: string
  readonly credentialKind: AuthProfile["credentialKind"]
  readonly scopes: readonly string[]
  readonly tokenAccount: string
  readonly refreshTokenAccount?: string
  readonly tokenExpiresAt?: number
  readonly oauthRelayUrl?: string
  readonly oauthClientId?: string
  readonly userId?: string
  readonly email?: string
}

export class KeychainTokenStore implements TokenStore {
  constructor(
    private readonly filePath: string,
    private readonly secrets: KeychainSecrets = new MacOSSecurityKeychainSecrets(),
    private readonly envProfile: AuthProfile | null = null
  ) {}

  static fromEnv(env: NodeJS.ProcessEnv = process.env): KeychainTokenStore {
    const configDir = env.AGENT_FIGMA_CONFIG_DIR ?? join(env.HOME ?? process.cwd(), ".config", "agent-figma")
    const token = env.AGENT_FIGMA_TOKEN ?? env.FIGMA_TOKEN ?? null
    const envProfile = token === null
      ? null
      : {
          name: ProfileName.make("default"),
          credentialKind: "personal-access-token" as const,
          accessToken: token,
          scopes: (env.AGENT_FIGMA_SCOPES ?? "").split(",").map((scope) => scope.trim()).filter(Boolean).map((scope) => Scope.make(scope))
        }
    return new KeychainTokenStore(join(configDir, "profiles.keychain.json"), new MacOSSecurityKeychainSecrets(), envProfile)
  }

  async getProfile(name: string): Promise<AuthProfile | null> {
    const profile = (await this.readProfiles()).find((item) => item.name === name)
    if (profile !== undefined) return this.hydrate(profile)
    return name === "default" ? this.envProfile : null
  }

  async setProfile(profile: AuthProfile): Promise<void> {
    const profiles = await this.readProfiles()
    const previous = profiles.find((item) => item.name === profile.name)
    const tokenAccount = `profile:${profile.name}:accessToken`
    const refreshTokenAccount = profile.refreshToken === undefined ? undefined : `profile:${profile.name}:refreshToken`
    await this.secrets.set(tokenAccount, profile.accessToken)
    if (refreshTokenAccount !== undefined) await this.secrets.set(refreshTokenAccount, profile.refreshToken!)
    if (refreshTokenAccount === undefined && previous?.refreshTokenAccount !== undefined) {
      await this.secrets.delete(previous.refreshTokenAccount)
    }
    const stored: StoredProfile = {
      name: profile.name,
      credentialKind: profile.credentialKind,
      scopes: profile.scopes,
      tokenAccount,
      ...(refreshTokenAccount === undefined ? {} : { refreshTokenAccount }),
      ...(profile.tokenExpiresAt === undefined ? {} : { tokenExpiresAt: profile.tokenExpiresAt }),
      ...(profile.oauthRelayUrl === undefined ? {} : { oauthRelayUrl: profile.oauthRelayUrl }),
      ...(profile.oauthClientId === undefined ? {} : { oauthClientId: profile.oauthClientId }),
      ...(profile.userId === undefined ? {} : { userId: profile.userId }),
      ...(profile.email === undefined ? {} : { email: profile.email })
    }
    await this.writeProfiles([stored, ...profiles.filter((item) => item.name !== stored.name)])
  }

  async listProfiles(): Promise<readonly AuthProfile[]> {
    const profiles = await Promise.all((await this.readProfiles()).map((profile) => this.hydrate(profile)))
    return this.envProfile === null
      ? profiles
      : [this.envProfile, ...profiles.filter((profile) => profile.name !== this.envProfile?.name)]
  }

  async deleteProfile(name: string): Promise<boolean> {
    const profiles = await this.readProfiles()
    const found = profiles.find((profile) => profile.name === name)
    if (found === undefined) return false
    await this.secrets.delete(found.tokenAccount)
    if (found.refreshTokenAccount !== undefined) await this.secrets.delete(found.refreshTokenAccount)
    const next = profiles.filter((profile) => profile.name !== name)
    if (next.length === 0) {
      await rm(this.filePath, { force: true })
    } else {
      await this.writeProfiles(next)
    }
    return true
  }

  private async hydrate(profile: StoredProfile): Promise<AuthProfile> {
    const accessToken = await this.secrets.get(profile.tokenAccount)
    if (accessToken === null) {
      throw new UsageError({ message: `Missing Keychain secret for profile ${profile.name}` })
    }
    const refreshToken = profile.refreshTokenAccount === undefined ? null : await this.secrets.get(profile.refreshTokenAccount)
    if (profile.refreshTokenAccount !== undefined && refreshToken === null) {
      throw new UsageError({ message: `Missing Keychain refresh secret for profile ${profile.name}` })
    }
    return {
      name: ProfileName.make(profile.name),
      credentialKind: profile.credentialKind,
      accessToken,
      scopes: profile.scopes.map((scope) => Scope.make(scope)),
      ...(refreshToken === null ? {} : { refreshToken }),
      ...(profile.tokenExpiresAt === undefined ? {} : { tokenExpiresAt: profile.tokenExpiresAt }),
      ...(profile.oauthRelayUrl === undefined ? {} : { oauthRelayUrl: profile.oauthRelayUrl }),
      ...(profile.oauthClientId === undefined ? {} : { oauthClientId: profile.oauthClientId }),
      ...(profile.userId === undefined ? {} : { userId: profile.userId }),
      ...(profile.email === undefined ? {} : { email: profile.email })
    }
  }

  private async readProfiles(): Promise<readonly StoredProfile[]> {
    try {
      const parsed = JSON.parse(await readFile(this.filePath, "utf8")) as { readonly profiles?: readonly StoredProfile[] }
      return parsed.profiles ?? []
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return []
      throw error
    }
  }

  private async writeProfiles(profiles: readonly StoredProfile[]): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true, mode: 0o700 })
    await writeFile(this.filePath, JSON.stringify({ profiles }, null, 2), { mode: 0o600 })
  }
}
