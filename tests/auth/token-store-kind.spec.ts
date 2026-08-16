import { describe, expect, it } from "vitest"
import { selectTokenStoreKind } from "../../src/adapters/token-store-kind.js"

describe("token store selection", () => {
  it("requires Keychain on macOS", () => {
    expect(selectTokenStoreKind({}, "darwin")).toBe("keychain")
    expect(() => selectTokenStoreKind({ AGENT_FIGMA_TOKEN_STORE: "file" }, "darwin")).toThrow(/Plaintext/)
  })

  it("defaults to file elsewhere and honors an explicit keychain", () => {
    expect(selectTokenStoreKind({}, "linux")).toBe("file")
    expect(selectTokenStoreKind({ AGENT_FIGMA_TOKEN_STORE: "keychain" }, "linux")).toBe("keychain")
  })
})
