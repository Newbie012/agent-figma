import { UsageError } from "../domain/errors.js"

type TokenStoreKind = "keychain" | "file"

export const selectTokenStoreKind = (
  env: NodeJS.ProcessEnv,
  platform: NodeJS.Platform = process.platform
): TokenStoreKind => {
  const explicit = env.AGENT_FIGMA_TOKEN_STORE
  if (platform === "darwin") {
    if (explicit === "file") {
      throw new UsageError({
        message: "Plaintext token storage is not allowed on macOS; unset AGENT_FIGMA_TOKEN_STORE",
        argument: "AGENT_FIGMA_TOKEN_STORE"
      })
    }
    return "keychain"
  }
  return explicit === "keychain" ? "keychain" : "file"
}
