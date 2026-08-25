import type { EndpointCatalog } from "../ports/EndpointCatalog.js"
import type { FigmaRestApi } from "../ports/FigmaRestApi.js"
import type { TokenStore } from "../ports/TokenStore.js"
import type { OAuthFlow } from "../ports/OAuthFlow.js"
import type { Installer } from "../ports/Installer.js"
import type { SourceCode } from "../ports/SourceCode.js"
import type { ImageDownload } from "../ports/ImageDownload.js"
import type { UpgradeLog } from "../ports/UpgradeLog.js"

export interface CliServices {
  readonly tokenStore: TokenStore
  readonly figmaRestApi: FigmaRestApi
  readonly endpointCatalog: EndpointCatalog
  readonly oauthFlow: OAuthFlow
  readonly sourceCode: SourceCode
  readonly installer: Installer
  readonly imageDownload: ImageDownload
  readonly upgradeLog: UpgradeLog
}
