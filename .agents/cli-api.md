# Agent Figma CLI API

Working binary: `agent-figma`. Short alias: `afg`.

Goal: expose bounded, deterministic, read-only Figma context to terminals and AI agents.

## Rules

- Noun-verb commands: `file get`, `node get`, `auth status`.
- A Figma URL or raw file key is accepted anywhere a file is required.
- `--json` is always available; non-TTY stdout defaults to JSON.
- JSON is compact by default. `--pretty` restores indentation.
- `--fields a,b.c` projects machine output; `--format ndjson` streams the primary collection; `--format tree` prints one readable line per node.
- Node reads resolve what the payload only references: text style names from the response's own `styles` map, and `boundVariables` into token names through `GET /v1/files/:file_key/variables/local`. Both land in an additive `tokens` object; an id that cannot be resolved stays an id and the envelope carries a warning.
- Node reads report a `sizing` object with the node's own `layoutSizing*` and the containing frame's, because a `FILL` width is a measured number and the frame that fixes it is outside the returned subtree. `node get` reads that chain by default (`--no-ancestors` skips it); `file nodes get` reads it only with `--ancestors`.
- Data goes to stdout. Errors go to stderr as stable envelopes.
- `describe --json` is the machine-readable command catalog. Running the binary with no arguments prints a short banner to a terminal, and answers the same catalog everywhere else.
- `--help` and `-h` work at every level, in any position: on a command they print its usage line, its flags and which are required, and on a noun they list its verbs. `--version` and `-v` print the version.
- Human output is coloured for a terminal and plain everywhere else: group headings yellow, commands and flags cyan, metadata dim. `--no-color`, a `NO_COLOR` environment variable, and a piped stdout each turn it off.
- A flag the command does not declare is refused. Reading past a mistyped flag turns a typo into a silently different answer, which is the one failure a caller cannot see.
- A refusal names the way out: the nearest command when one is mistyped, a noun's verbs when the verb is missing, and the flag it was one keystroke from.
- `api endpoints list`, `api endpoint describe`, and `api call` provide one discovery and execution flow.
- `node compare` reads local files the caller names, to report which of the design's tokens and sizes the code never mentions. It is a text scan, so it proves mention rather than use, and it says so. Nothing read from disk leaves the process.
- `upgrade` runs the install command for the route this copy came from, asking the registry for the newest published version, and `--check` asks instead. An upgrade that was asked for and did not happen exits `1`; `--json` keeps the envelope and exits `0`.
- No command mutates remote Figma state.

## Commands

```bash
agent-figma describe --json
agent-figma completion bash|zsh
agent-figma upgrade [--check] [--json]
agent-figma auth login [--profile NAME] [--scopes LIST] [--no-open] [--auth-url-out PATH]
agent-figma auth login --token TOKEN [--profile NAME]
agent-figma auth login --oauth --client-id ID --client-secret SECRET --redirect-uri URI [--profile NAME]
agent-figma auth status [--profile NAME] --json
agent-figma auth scopes [--profile NAME] --json
agent-figma auth test [--profile NAME] --json
agent-figma auth profiles list --json
agent-figma auth logout [--profile NAME] --yes --json
agent-figma user get --json
agent-figma team projects list TEAM_ID --json
agent-figma project files list PROJECT_ID --json
agent-figma file get FILE_OR_URL [--depth N] --json
agent-figma file nodes get FILE_OR_URL --ids NODE_ID[,NODE_ID] [--depth N] [--ancestors] --json
agent-figma node get FIGMA_URL [--depth N] [--no-ancestors] --json
agent-figma node get FILE_OR_URL --id NODE_ID --json
agent-figma node get FIGMA_URL --format tree
agent-figma node compare FIGMA_NODE_URL --code PATH[,PATH] --json
agent-figma file comments list FILE_OR_URL --json
agent-figma file versions list FILE_OR_URL --json
agent-figma image render FILE_OR_URL --ids NODE_ID[,NODE_ID] [--format png|jpg|svg|pdf] [--scale N] --json
agent-figma component get COMPONENT_KEY --json
agent-figma component-set get COMPONENT_SET_KEY --json
agent-figma style get STYLE_KEY --json
agent-figma api endpoints list [--family FAMILY] --json
agent-figma api endpoint describe OPERATION --json
agent-figma api call OPERATION --payload JSON --json
```

`api call` accepts an operation from `api endpoints list`. Payload keys matching `:path_parameters` fill the path; other scalar values become query parameters. Every bundled operation is GET-only.

## Authentication

- `auth login --token` stores a personal access token, which is how the CLI is signed in. `AGENT_FIGMA_TOKEN` and `FIGMA_TOKEN` work in its place.
- `auth login` with `AGENT_FIGMA_OAUTH_RELAY_URL` set starts browser OAuth with PKCE and exact state verification against that relay. There is no default relay, and Figma's review refused a public app for this CLI, so this path belongs to operators who register their own.
- `--no-open` prints the authorization URL. `--auth-url-out PATH` writes it for headless browser handoff.
- `--oauth` is the self-hosted path. It requires `--client-id`, `--client-secret`, and a registered `--redirect-uri`. The CLI uses the client secret for that process and never stores it.
- Default OAuth scopes are the read-only scopes used by the command catalog. A requested scope outside the read allowlist is rejected.
- OAuth profiles refresh shortly before expiry. Failed refresh returns `NotAuthenticated` with a re-login suggestion.
- The hosted relay performs Figma's required exchange and returns an encrypted grant to `http://localhost:45454/oauth/figma/callback`. It stores no state but handles the grant in memory.

## Environment

```text
AGENT_FIGMA_TOKEN          Personal access token fallback
FIGMA_TOKEN                Conventional token fallback
AGENT_FIGMA_CONFIG_DIR     Profile metadata location override
AGENT_FIGMA_API_BASE_URL   Test or compatible API base URL
AGENT_FIGMA_OAUTH_RELAY_URL Hosted OAuth relay base URL
AGENT_FIGMA_OAUTH_AUTHORIZE_URL OAuth authorization override
AGENT_FIGMA_OAUTH_TOKEN_URL OAuth token exchange override
AGENT_FIGMA_OAUTH_LOCAL_CALLBACK_URI Local callback override
AGENT_FIGMA_OAUTH_TIMEOUT_MS Browser callback timeout override
AGENT_FIGMA_UPGRADE_ROUTE  The install `upgrade` should believe it has: npm, bun, source
AGENT_FIGMA_REGISTRY       dist-tags endpoint `upgrade` asks for the newest alpha
```

On macOS, profile tokens are stored in Keychain. Other platforms use a mode-`0600` profile file until native secret-store adapters exist.

## Success envelope

```json
{"ok":true,"method":"file.get","profile":"default","file_key":"abc","data":{},"paging":{"next_cursor":null,"has_more":false},"warnings":[]}
```

## Error envelope

```json
{"ok":false,"error":{"type":"NotAuthenticated","title":"No Figma profile named default","retriable":false,"suggestion":"Run agent-figma auth login.","trace_id":"afg_..."}}
```

A `UsageError` carries what the caller needs to correct the line it typed:

```json
{"ok":false,"error":{"type":"UsageError","title":"Unknown flag --depht for `file get`","retriable":false,"suggestion":"Did you mean --depth? Run `agent-figma file get --help` for the flags it takes.","trace_id":"afg_...","details":{"argument":"depht","command":"file get","usage":"agent-figma file get FILE_OR_URL [--profile NAME] [--depth N] [--json] [--pretty] [--fields a,b.c]","did_you_mean":"--depth"}}}
```

| Detail | Carries |
| --- | --- |
| `argument` | The flag or positional the failure is about |
| `command` | The command that wanted it |
| `usage` | That command's usage line |
| `did_you_mean` | The nearest command or flag, when the name given is one small edit away |
| `alternatives` | The verbs under a noun that was given without one |

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Success |
| `1` | Unexpected failure |
| `2` | Usage or validation error |
| `3` | Resource not found |
| `4` | Not authenticated, or permission denied |
| `5` | A write was refused |
| `6` | Figma rate-limited the read |
