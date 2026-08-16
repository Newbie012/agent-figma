# FAQ

Short answers about permissions, writes, tokens, URLs, output, and Figma API limits.

## Can Agent Figma edit a file?

No. Its remote adapter exposes GET only. The generic API command is also restricted to bundled GET operations.

## Does it bypass Figma permissions?

No. Figma returns only what the active account, file sharing, team membership, scopes, plan, and seat allow.

## Does it support OAuth?

Yes. `agent-figma auth login` uses browser OAuth with PKCE, exact state verification, encrypted localhost handoff, and automatic refresh. Personal access tokens remain available through `--token`.

## Where is my token stored?

On macOS, access and refresh tokens go to Keychain. Other platforms use a profile file with mode `0600`. Environment variables can provide a short-lived token.

## Can I pass a Figma URL directly?

Yes. Commands that require a file accept a raw key or a standard Figma URL. `node get` also reads and normalizes `node-id`.

## Why is JSON compact?

Compact output uses fewer tokens and moves through pipelines faster. Use `--pretty` when reading JSON yourself.

## When should I use `api call`?

Start with a focused command. Use `api call` when a bundled operation supports an option that its focused command does not.

## Is this an official Figma product?

No. Agent Figma is an independent open-source project.
