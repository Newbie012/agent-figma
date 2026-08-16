import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import type { AuthProfile } from "../../domain/figma.js"
import { ProfileName, Scope } from "../../domain/ids.js"
import type { TokenStore } from "../../ports/TokenStore.js"

interface StoredProfile {
  readonly name: string
  readonly credentialKind: AuthProfile["credentialKind"]
  readonly accessToken: string
  readonly scopes: readonly string[]
  readonly refreshToken?: string
  readonly tokenExpiresAt?: number
  readonly oauthRelayUrl?: string
  readonly oauthClientId?: string
  readonly userId?: string
  readonly email?: string
}

export class FileTokenStore implements TokenStore {
  constructor(
    private readonly filePath: string,
    private readonly envProfile: AuthProfile | null = null
  ) {}

  static fromEnv(env: NodeJS.ProcessEnv = process.env): FileTokenStore {
    const configDir = env.AGENT_FIGMA_CONFIG_DIR ?? join(env.HOME ?? process.cwd(), ".config", "agent-figma")
    const token = env.AGENT_FIGMA_TOKEN ?? env.FIGMA_TOKEN ?? null
    const envProfile = token === null
      ? null
      : {
          name: ProfileName.make("default"),
          credentialKind: "personal-access-token" as const,
          accessToken: token,
          scopes: parseScopes(env.AGENT_FIGMA_SCOPES)
        }
    return new FileTokenStore(join(configDir, "profiles.json"), envProfile)
  }

  async getProfile(name: string): Promise<AuthProfile | null> {
    const stored = (await this.readProfiles()).find((profile) => profile.name === name)
    if (stored !== undefined) return hydrate(stored)
    return name === "default" ? this.envProfile : null
  }

  async setProfile(profile: AuthProfile): Promise<void> {
    const profiles = await this.readProfiles()
    const stored = dehydrate(profile)
    await this.writeProfiles([stored, ...profiles.filter((item) => item.name !== stored.name)])
  }

  async listProfiles(): Promise<readonly AuthProfile[]> {
    const profiles = (await this.readProfiles()).map(hydrate)
    return this.envProfile === null
      ? profiles
      : [this.envProfile, ...profiles.filter((item) => item.name !== this.envProfile?.name)]
  }

  async deleteProfile(name: string): Promise<boolean> {
    const profiles = await this.readProfiles()
    const next = profiles.filter((profile) => profile.name !== name)
    if (next.length === profiles.length) return false
    if (next.length === 0) {
      await rm(this.filePath, { force: true })
    } else {
      await this.writeProfiles(next)
    }
    return true
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

const dehydrate = (profile: AuthProfile): StoredProfile => ({ ...profile })
const hydrate = (profile: StoredProfile): AuthProfile => ({
  ...profile,
  name: ProfileName.make(profile.name),
  scopes: profile.scopes.map((scope) => Scope.make(scope))
})
const parseScopes = (value: string | undefined) =>
  (value ?? "").split(",").map((scope) => scope.trim()).filter(Boolean).map((scope) => Scope.make(scope))
