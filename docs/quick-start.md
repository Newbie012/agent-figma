# Quick start

Authenticate and retrieve useful Figma context in a few commands.

## 1. Connect Figma

Create a personal access token in Figma account settings, then connect it:

```bash
agent-figma auth login --token "$FIGMA_TOKEN"
```

On macOS the token goes to the Keychain, and elsewhere to a file only your user can read. Profile metadata stays in the local config directory. `AGENT_FIGMA_TOKEN` or `FIGMA_TOKEN` work instead of the flag. See [Authentication](./authentication.md).

## 2. Check the profile

```bash
agent-figma auth status --json
agent-figma auth scopes --json
agent-figma auth test --json
```

## 3. Discover commands

```bash
agent-figma --help              # every command, grouped
agent-figma file --help         # the verbs under one noun
agent-figma file get --help     # one command: usage, flags, endpoint, scopes
agent-figma file get --help --json
agent-figma describe --json     # the whole catalog, for an agent
```

`-h` and `-v` work too. A mistyped command or flag is refused and told what it was nearest to, so nothing is quietly read past.

## 4. Read a file or node

```bash
agent-figma file get "https://www.figma.com/design/FILE_KEY/Product" --depth 2 --json

agent-figma node get \
  "https://www.figma.com/design/FILE_KEY/Product?node-id=12-34" \
  --json
```

Node IDs copied from a Figma URL can use `12-34`. The CLI normalizes them to the REST form `12:34`.

## 5. Reduce a large response

```bash
agent-figma file get FILE_KEY --depth 2 --fields name,lastModified,document.id --json
agent-figma file comments list FILE_KEY --format ndjson
```

Start with a shallow depth, selected fields, or streamed collections before requesting more data.
