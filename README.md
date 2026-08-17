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
agent-figma file get FIGMA_URL --depth 2 --pretty
```

A frame reads as one line per node, with the token behind each number and whether a size was chosen
or measured:

```text
FRAME Spend panel  850x240 (own=FILL, parent=FIXED 850)  vertical  gap=spacing/md  pad=24  radius=8
  TEXT Title  text=md/regular  14/400
  FRAME Row  802x40 (own=FILL, parent=FILL 850)  horizontal  gap=spacing/md
    TEXT Value  text=lg/semi-bold  24/600
```

`node compare` then says which of those the code you point it at never mentions.

## Usage, for agents

```bash
agent-figma describe --json
agent-figma node get FIGMA_NODE_URL --json
agent-figma file nodes get FIGMA_URL --ids 1:2,3:4 --fields nodes --json
agent-figma file comments list FIGMA_URL --format ndjson
agent-figma api call file.get --payload '{"key":"FILE_KEY","depth":2}' --json
```

Nothing has to be learned from prose. `describe` answers the whole command catalog as JSON, and
every command answers one compact JSON line on stdout. Failures go to stderr as
`{"ok":false,"error":{…}}` with a type, a suggestion, and an exit code saying what to do about it.
`--fields a,b.c` trims the answer to what you read; `--format ndjson` streams a collection.

Non-TTY stdout defaults to JSON, so a piped command needs no flag.

## Auth

```bash
agent-figma auth login --token "$FIGMA_TOKEN"
```

Stores a local profile: macOS Keychain where available, a mode-`0600` file otherwise. Browser OAuth
with PKCE is also supported, and needs a relay you deploy yourself — see
[Authentication](./docs/authentication.md).

## Skill

```bash
npx skills add Newbie012/agent-figma --skill agent-figma
```

Tells a compatible agent when to reach for the CLI, how to bound a read, and never to echo a token.

## Docs

Markdown in [`docs/`](./docs/README.md), and it ships with the package.
[Quick start](./docs/quick-start.md) ·
[Implementing a design](./docs/guides/implementing-a-design.md) ·
[Commands](./docs/reference/commands.md) ·
[Output contract](./docs/reference/output-contract.md) ·
[Troubleshooting](./docs/reference/troubleshooting.md)

## Notes

Every command is read-only. The CLI sends only GET requests, and `api call` resolves through a
bundled GET-only catalog, so it never edits a file, a comment, a variable, or a webhook.

It respects Figma's permissions: it returns only what the active token, its scopes, file sharing,
team membership, plan and seat allow.

This is an alpha, published under the `alpha` tag. Product and architecture contracts live in
`.agents/`, and the release process in [`.agents/release.md`](./.agents/release.md).

## Development

```bash
npm install -g --allow-scripts=pnpm pnpm@12.0.0-rc.6   # corepack cannot install pnpm 12 yet
pnpm install
pnpm check          # security scan, types, docs, tests with coverage, build, smoke
pnpm change         # record what a change should release as, before opening a PR
```

## License

MIT

## Sponsors

<p align="center">
	<a href="https://github.com/sponsors/Newbie012">
		<img src="https://cdn.jsdelivr.net/gh/newbie012/sponsors/sponsors.svg">
	</a>
</p>
