# Architecture

Build style: PRD-DD -> DDD -> TDD with Effect.

## Stack

- TypeScript and Node.js 22+
- `effect@beta` and `@effect/platform-node@beta`
- Figma's official REST API and `@figma/rest-api-spec` types
- `@effect/vitest` and fake port adapters
- Rolldown single-file ESM bundle

Do not use Commander. The metadata-driven parser accepts global flags before or after subcommands and powers `describe --json`.

## Bounded contexts

- `Auth`: named OAuth or personal access token profiles, scopes, expiry, and refresh.
- `FigmaApi`: authenticated GET requests, status mapping, and rate limits.
- `FileContext`: file keys, Figma URLs, node IDs, and focused reads across files, projects, teams, libraries, comments, versions, and images.
- `Catalog`: endpoint metadata and read-only safety classification.
- `Output`: compact JSON envelopes, NDJSON, field projection, terminal tables, structured errors, and exit codes.

Branded domain types: `FileKey`, `NodeId`, `ProjectId`, `TeamId`, `ProfileName`, `Scope`, and `FigmaPath`.

Tagged domain failures: `NotAuthenticated`, `PermissionDenied`, `FigmaRateLimited`, `FigmaApiFailed`, `InvalidFigmaUrl`, `ResourceNotFound`, `WriteOperationBlocked`, and `UsageError`.

## Ports and adapters

```text
TokenStore        -> KeychainTokenStore | FileTokenStore
OAuthFlow         -> NodeLocalhostOAuthFlow
FigmaRestApi      -> FetchFigmaRestApi
EndpointCatalog   -> BundledEndpointCatalog
```

Rules:

- Command handlers cannot access `fetch`, the filesystem, keychain, environment, or process. `CliServices` provides adapter configuration.
- Figma responses cross the adapter boundary as JSON values only.
- Commands orchestrate use cases; they do not build authorization headers.
- Every remote request is GET. The adapter rejects any future non-GET request before sending it.
- Focused commands and generic `api call` resolve through the same bundled endpoint catalog.
- Personal access tokens use `X-Figma-Token`; OAuth profiles use bearer auth.
- Figma data-plane requests remain GET-only. OAuth exchange and refresh POSTs live behind `OAuthFlow` and cannot accept arbitrary endpoints.

## Layout

```text
src/
  main.ts
  cli/          argument parser, command metadata
  domain/       IDs, URL parsing, models, tagged errors
  application/  command dispatch and output orchestration
  ports/        infrastructure contracts
  adapters/     live Figma, profile, keychain, catalog implementations
  output/       envelopes and human rendering
  testing/      TestDriver and fake adapters
docs/             Markdown documentation, indexed by docs/README.md
  reference/commands.md  generated from the command catalog
apps/oauth-relay/ stateless Figma OAuth exchange and refresh service
```

`main.ts` creates live adapters, runs `executeCli` through `NodeRuntime`, and writes the returned stdout and stderr.

`docs/` consumes the public CLI contract as prose and examples. Only `scripts/write-command-reference.mjs` reads CLI source, and it reads the command catalog alone.
