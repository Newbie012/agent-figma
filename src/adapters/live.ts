import type { CliServices } from "../application/services.js"
import { BundledEndpointCatalog } from "./catalog/BundledEndpointCatalog.js"
import { FetchFigmaRestApi } from "./figma-rest/FetchFigmaRestApi.js"
import { KeychainTokenStore } from "./keychain/KeychainTokenStore.js"
import { FileTokenStore } from "./profile-file/FileTokenStore.js"
import { selectTokenStoreKind } from "./token-store-kind.js"
import { NodeLocalhostOAuthFlow } from "./localhost-oauth/NodeLocalhostOAuthFlow.js"
import { NodeInstaller } from "./installer/NodeInstaller.js"
import { FileSourceCode } from "./source-fs/FileSourceCode.js"

export const createLiveServices = (env: NodeJS.ProcessEnv = process.env): CliServices => ({
  tokenStore: selectTokenStoreKind(env) === "keychain"
    ? KeychainTokenStore.fromEnv(env)
    : FileTokenStore.fromEnv(env),
  figmaRestApi: new FetchFigmaRestApi(
    env.AGENT_FIGMA_API_BASE_URL === undefined ? {} : { baseUrl: env.AGENT_FIGMA_API_BASE_URL }
  ),
  endpointCatalog: new BundledEndpointCatalog(),
  oauthFlow: NodeLocalhostOAuthFlow.fromEnv(env),
  sourceCode: new FileSourceCode(),
  installer: NodeInstaller.fromEnv(env)
})
