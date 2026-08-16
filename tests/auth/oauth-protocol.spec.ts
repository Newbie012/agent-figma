import { createCipheriv, createHash, createPublicKey, diffieHellman, generateKeyPairSync, randomBytes } from "node:crypto"
import { createServer } from "node:http"
import type { AddressInfo } from "node:net"
import { afterEach, describe, expect, it, vi } from "vitest"
import { NodeLocalhostOAuthFlow } from "../../src/adapters/localhost-oauth/NodeLocalhostOAuthFlow.js"

const servers: ReturnType<typeof createServer>[] = []

afterEach(() => {
  vi.restoreAllMocks()
  for (const server of servers.splice(0)) {
    server.closeAllConnections()
    server.close()
  }
})

describe("hosted OAuth protocol", () => {
  it("requires an explicitly configured relay", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    const flow = new NodeLocalhostOAuthFlow({
      defaultLocalCallbackUri: "http://127.0.0.1:0/oauth/figma/callback",
      openBrowser: async () => true
    })

    await expect(flow.login({
      profileName: "default",
      scopes: ["current_user:read"],
      openBrowser: true
    })).rejects.toMatchObject({
      _tag: "UsageError",
      message: expect.stringContaining("AGENT_FIGMA_OAUTH_RELAY_URL")
    })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("rejects a non-HTTPS remote relay", async () => {
    const flow = new NodeLocalhostOAuthFlow({
      relayUrl: "http://relay.example.com",
      defaultLocalCallbackUri: "http://127.0.0.1:0/oauth/figma/callback",
      openBrowser: async () => true
    })

    await expect(flow.login({
      profileName: "default",
      scopes: ["current_user:read"],
      openBrowser: true
    })).rejects.toMatchObject({
      _tag: "UsageError",
      message: expect.stringContaining("HTTPS")
    })
  })

  it("creates a PKCE relay session and decrypts the localhost grant", async () => {
    let session: Record<string, unknown> | undefined
    const relay = createServer(async (request, response) => {
      const chunks: Buffer[] = []
      for await (const chunk of request) chunks.push(Buffer.from(chunk))
      session = JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>
      response.setHeader("content-type", "application/json")
      response.end(JSON.stringify({
        state: "opaque-state",
        authorization_url: "https://www.figma.com/oauth?state=opaque-state&response_type=code"
      }))
    })
    servers.push(relay)
    await new Promise<void>((resolve) => relay.listen(0, "127.0.0.1", resolve))
    const relayUrl = `http://127.0.0.1:${(relay.address() as AddressInfo).port}`
    let openedUrl = ""
    const flow = new NodeLocalhostOAuthFlow({
      relayUrl,
      defaultLocalCallbackUri: "http://127.0.0.1:0/oauth/figma/callback",
      openBrowser: async (url) => {
        openedUrl = url
        return true
      }
    })

    // ACT
    const pending = flow.login({
      profileName: "default",
      scopes: ["current_user:read", "file_content:read"],
      openBrowser: true
    })
    await waitFor(() => session !== undefined && openedUrl !== "")
    const callbackUri = String(session?.callbackUri)
    const publicKey = String(session?.publicKey)
    const grant = encryptGrant(publicKey, "opaque-state", {
      accessToken: "figo_secret",
      refreshToken: "figr_secret",
      expiresIn: 3600,
      userId: "123456789012345678",
      scopes: ["current_user:read", "file_content:read"]
    })
    const callback = new URL(callbackUri)
    callback.searchParams.set("state", "opaque-state")
    callback.searchParams.set("grant", grant)
    const callbackResponse = await fetch(callback)
    const profile = await pending

    // ASSERT
    expect(callbackResponse.status).toBe(200)
    expect(openedUrl).toContain("figma.com/oauth")
    expect(session).toMatchObject({
      callbackUri: expect.stringMatching(/^http:\/\/127\.0\.0\.1:\d+\/oauth\/figma\/callback$/),
      codeChallenge: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
      codeChallengeMethod: "S256",
      scopes: ["current_user:read", "file_content:read"]
    })
    expect(profile).toMatchObject({
      credentialKind: "oauth",
      accessToken: "figo_secret",
      refreshToken: "figr_secret",
      userId: "123456789012345678",
      oauthRelayUrl: relayUrl
    })
  })

  it("rejects a callback with the wrong state", async () => {
    let callbackUri = ""
    const relay = createServer(async (request, response) => {
      const chunks: Buffer[] = []
      for await (const chunk of request) chunks.push(Buffer.from(chunk))
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as { callbackUri: string }
      callbackUri = body.callbackUri
      response.setHeader("content-type", "application/json")
      response.end(JSON.stringify({ state: "right-state", authorization_url: "https://www.figma.com/oauth?state=right-state" }))
    })
    servers.push(relay)
    await new Promise<void>((resolve) => relay.listen(0, "127.0.0.1", resolve))
    const flow = new NodeLocalhostOAuthFlow({
      relayUrl: `http://127.0.0.1:${(relay.address() as AddressInfo).port}`,
      defaultLocalCallbackUri: "http://127.0.0.1:0/oauth/figma/callback",
      openBrowser: async () => true
    })

    // ACT
    const pending = flow.login({ profileName: "default", scopes: ["current_user:read"], openBrowser: true })
    const rejection = expect(pending).rejects.toMatchObject({ _tag: "PermissionDenied" })
    await waitFor(() => callbackUri !== "")
    await fetch(`${callbackUri}?state=wrong-state&grant=anything`)

    // ASSERT
    await rejection
  })

  it("explains how to authenticate when the relay is not deployed", async () => {
    const relay = createServer((_request, response) => {
      response.writeHead(404, { "content-type": "text/plain" }).end("DEPLOYMENT_NOT_FOUND")
    })
    servers.push(relay)
    await new Promise<void>((resolve) => relay.listen(0, "127.0.0.1", resolve))
    const flow = new NodeLocalhostOAuthFlow({
      relayUrl: `http://127.0.0.1:${(relay.address() as AddressInfo).port}`,
      defaultLocalCallbackUri: "http://127.0.0.1:0/oauth/figma/callback",
      openBrowser: async () => true
    })

    await expect(flow.login({
      profileName: "default",
      scopes: ["current_user:read"],
      openBrowser: true
    })).rejects.toMatchObject({
      _tag: "UsageError",
      message: expect.stringContaining("AGENT_FIGMA_OAUTH_RELAY_URL")
    })
  })
})

const encryptGrant = (publicKeyValue: string, state: string, value: unknown): string => {
  const publicKey = createPublicKey({ key: Buffer.from(publicKeyValue, "base64url"), format: "der", type: "spki" })
  const ephemeral = generateKeyPairSync("x25519")
  const sharedSecret = diffieHellman({ privateKey: ephemeral.privateKey, publicKey })
  const key = createHash("sha256").update(sharedSecret).update(state).digest()
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  cipher.setAAD(Buffer.from(state))
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()])
  return Buffer.from(JSON.stringify({
    ephemeralPublicKey: ephemeral.publicKey.export({ format: "der", type: "spki" }).toString("base64url"),
    iv: iv.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
    ciphertext: ciphertext.toString("base64url")
  })).toString("base64url")
}

const waitFor = async (predicate: () => boolean): Promise<void> => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (predicate()) return
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  throw new Error("Timed out waiting for OAuth test state")
}
