<div align="center">

# agent-figma

Read your Figma files from the command line: files, nodes, comments, versions, rendered images,
components, and styles. Built so your AI agents can read Figma too. Short alias: `afg`.

<pre align="center">npm install -g @eliya-oss/agent-figma@alpha</pre>

</div>

## Usage, for humans

```bash
agent-figma auth login --token "$FIGMA_TOKEN"
agent-figma node get FIGMA_NODE_URL --format tree
agent-figma node compare FIGMA_NODE_URL --code src/components/Panel.tsx,src/styles
agent-figma file comments list FIGMA_URL --format table
```

`--format tree` reads a frame one line per node, with the token behind each number and whether a size
was chosen or measured. `node compare` says which of those the code never mentions.

## Usage, for agents

```bash
agent-figma describe --json
agent-figma node get FIGMA_NODE_URL --json
agent-figma file nodes get FIGMA_URL --ids 1:2,3:4 --fields nodes --json
agent-figma file comments list FIGMA_URL --format ndjson
```

`describe` is the whole command catalog, so nothing has to be learned from prose. Every command
answers one compact JSON line on stdout; failures go to stderr as `{"ok":false,"error":{…}}` with a
type, a suggestion, and an exit code. Non-TTY stdout defaults to JSON.

## Auth

```bash
agent-figma auth login --token "$FIGMA_TOKEN"
```

Stores a local profile in the macOS Keychain, or a mode-`0600` file elsewhere. Browser OAuth needs a
relay you deploy yourself: [Authentication](./docs/authentication.md).

## Skill

```bash
npx skills add Newbie012/agent-figma --skill agent-figma
```

## Notes

Every command is read-only: only GET requests, and `api call` resolves through a bundled GET-only
catalog. It returns only what the active token, its scopes, sharing, plan and seat allow.

An alpha, published under the `alpha` tag. Docs are in [`docs/`](./docs/README.md), project contracts
in `.agents/`.

## License

MIT

## Sponsors

<p align="center">
	<a href="https://github.com/sponsors/Newbie012">
		<img src="https://cdn.jsdelivr.net/gh/newbie012/sponsors/sponsors.svg">
	</a>
</p>
