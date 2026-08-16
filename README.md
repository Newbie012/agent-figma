# agent-figma

Read Figma data from the command line with commands that work well in scripts and AI agents. Short alias: `afg`.

```bash
npm install -g @eliya-oss/agent-figma@alpha

agent-figma auth login --token "$FIGMA_TOKEN"
agent-figma file get "https://www.figma.com/design/FILE_KEY/name" --depth 2 --json
agent-figma node get "https://www.figma.com/design/FILE_KEY/name?node-id=1-2" --json
agent-figma api endpoints list --json
```

The CLI reads users, teams, projects, files, nodes, comments, versions, rendered images, components, component sets, and styles. `api call` covers less common bundled GET operations.

Every command is read-only. The CLI never edits Figma files, comments, variables, webhooks, or other remote state.

Browser login uses Figma OAuth with PKCE and automatic refresh. Figma requires a hosted service to hold the OAuth app secret for token exchange and refresh. You can deploy the service in `apps/oauth-relay`.

To use browser OAuth, register a Figma app, deploy a trusted relay, and set `AGENT_FIGMA_OAUTH_RELAY_URL`. This repository does not provide hosted credentials.

Nothing has to be learned from prose. `agent-figma --help` lists every command, `agent-figma COMMAND --help` prints one command's flags and which are required, and `agent-figma describe --json` answers the same catalog as JSON.

## Documentation

The docs are Markdown in [`docs/`](./docs/README.md), and ship with the package.

- [Installation](./docs/installation.md)
- [Quick start](./docs/quick-start.md)
- [Authentication](./docs/authentication.md)
- [Commands](./docs/reference/commands.md)
- [Output contract](./docs/reference/output-contract.md)
- [Agent workflows](./docs/recipes/agent-workflows.md)
- [Troubleshooting](./docs/reference/troubleshooting.md)

This is an alpha. Every release goes out under the `alpha` tag, so name the tag when you install; `npm install -g @eliya-oss/agent-figma` on its own will not find it until the surface settles.

## Development

pnpm 12 is a Rust rewrite and still a release candidate, so [corepack cannot install it](https://pnpm.io/installation):

```bash
npm install -g --allow-scripts=pnpm pnpm@12.0.0-rc.6
pnpm install

pnpm check          # security scan, types, docs, tests with coverage, build, smoke
pnpm docs:write     # rewrite docs/reference/commands.md from the command catalog
pnpm change         # record what a change should release as, before opening a PR
pnpm oauth:types
```

Product and architecture contracts live in `.agents/`, and the release process in
[`.agents/release.md`](./.agents/release.md).
