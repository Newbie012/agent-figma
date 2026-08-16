import { mkdtemp, readFile, rm } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { afterEach, describe, expect, it } from "vitest"
import { FileTokenStore } from "../../src/adapters/profile-file/FileTokenStore.js"
import type { AuthProfile } from "../../src/domain/figma.js"
import { ProfileName, Scope } from "../../src/domain/ids.js"

const directories: string[] = []

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe("FileTokenStore", () => {
  it("persists, replaces, lists, and deletes profiles with private permissions", async () => {
    const directory = await tempDirectory()
    const file = join(directory, "nested", "profiles.json")
    const store = new FileTokenStore(file)

    await store.setProfile(profile("first-token"))
    await store.setProfile(profile("second-token"))

    expect((await store.getProfile("default"))?.accessToken).toBe("second-token")
    expect(await store.listProfiles()).toHaveLength(1)
    expect(JSON.parse(await readFile(file, "utf8"))).toMatchObject({ profiles: [{ accessToken: "second-token" }] })
    expect(await store.deleteProfile("missing")).toBe(false)
    expect(await store.deleteProfile("default")).toBe(true)
    expect(await store.getProfile("default")).toBeNull()
  })

  it("uses an environment profile without writing it", async () => {
    const directory = await tempDirectory()
    const envProfile = profile("env-token")
    const store = new FileTokenStore(join(directory, "profiles.json"), envProfile)

    expect(await store.getProfile("default")).toEqual(envProfile)
    expect(await store.listProfiles()).toEqual([envProfile])
  })

  it("round-trips OAuth refresh metadata in the private fallback file", async () => {
    const directory = await tempDirectory()
    const file = join(directory, "profiles.json")
    const store = new FileTokenStore(file)
    const oauth: AuthProfile = {
      ...profile("oauth-access"),
      credentialKind: "oauth",
      refreshToken: "oauth-refresh",
      tokenExpiresAt: 123,
      oauthRelayUrl: "https://relay.example.com"
    }

    await store.setProfile(oauth)

    expect(await store.getProfile("default")).toEqual(oauth)
  })
})

const profile = (accessToken: string): AuthProfile => ({
  name: ProfileName.make("default"),
  credentialKind: "personal-access-token",
  accessToken,
  scopes: [Scope.make("file_content:read")]
})

const tempDirectory = async () => {
  const directory = await mkdtemp(join(tmpdir(), "agent-figma-"))
  directories.push(directory)
  return directory
}
