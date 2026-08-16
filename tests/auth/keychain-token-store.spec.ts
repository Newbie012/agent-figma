import { mkdtemp, readFile, rm } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { afterEach, describe, expect, it } from "vitest"
import { KeychainTokenStore, type KeychainSecrets } from "../../src/adapters/keychain/KeychainTokenStore.js"
import type { AuthProfile } from "../../src/domain/figma.js"
import { ProfileName, Scope } from "../../src/domain/ids.js"

const directories: string[] = []

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe("KeychainTokenStore", () => {
  it("keeps the token in the secret store and only metadata on disk", async () => {
    const directory = await tempDirectory()
    const secrets = new MemorySecrets()
    const store = new KeychainTokenStore(join(directory, "profiles.json"), secrets)

    await store.setProfile(profile("secret-one"))
    await store.setProfile(profile("secret-two"))

    expect((await store.getProfile("default"))?.accessToken).toBe("secret-two")
    expect(await store.listProfiles()).toHaveLength(1)
    expect(await store.deleteProfile("missing")).toBe(false)
    expect(await store.deleteProfile("default")).toBe(true)
    expect(secrets.values.size).toBe(0)
  })

  it("fails clearly when profile metadata outlives its keychain secret", async () => {
    const directory = await tempDirectory()
    const secrets = new MemorySecrets()
    const store = new KeychainTokenStore(join(directory, "profiles.json"), secrets)
    await store.setProfile(profile("secret"))
    secrets.values.clear()

    await expect(store.getProfile("default")).rejects.toMatchObject({ _tag: "UsageError" })
  })

  it("keeps OAuth access and refresh tokens in Keychain", async () => {
    const directory = await tempDirectory()
    const secrets = new MemorySecrets()
    const store = new KeychainTokenStore(join(directory, "profiles.json"), secrets)
    const oauth: AuthProfile = {
      ...profile("oauth-access"),
      credentialKind: "oauth",
      refreshToken: "oauth-refresh",
      tokenExpiresAt: 123,
      oauthRelayUrl: "https://relay.example.com"
    }

    await store.setProfile(oauth)

    expect([...secrets.values.values()]).toEqual(expect.arrayContaining(["oauth-access", "oauth-refresh"]))
    expect((await store.getProfile("default"))?.refreshToken).toBe("oauth-refresh")
    expect(await readFile(join(directory, "profiles.json"), "utf8")).not.toContain("oauth-refresh")
  })
})

class MemorySecrets implements KeychainSecrets {
  readonly values = new Map<string, string>()
  async get(account: string) { return this.values.get(account) ?? null }
  async set(account: string, value: string) { this.values.set(account, value) }
  async delete(account: string) { this.values.delete(account) }
}

const profile = (accessToken: string): AuthProfile => ({
  name: ProfileName.make("default"),
  credentialKind: "personal-access-token",
  accessToken,
  scopes: [Scope.make("file_content:read")],
  userId: "42",
  email: "dev@example.com"
})

const tempDirectory = async () => {
  const directory = await mkdtemp(join(tmpdir(), "agent-figma-keychain-"))
  directories.push(directory)
  return directory
}
