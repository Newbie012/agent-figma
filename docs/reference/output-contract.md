# Output contract

Stable JSON envelopes, NDJSON streams, terminal rendering, errors, and exit codes.

## Success envelope

```json
{"ok":true,"method":"file.get","profile":"default","file_key":"abc","data":{"name":"Product"},"paging":{"next_cursor":null,"has_more":false},"warnings":[]}
```

| Field | Meaning |
| --- | --- |
| `method` | Stable operation name. |
| `profile` | Selected local profile, or `null`. |
| `file_key` | Referenced Figma file, or `null`. |
| `data` | Figma response or local command result. |
| `paging` | Stable paging state. Figma page URLs are reduced to a cursor when possible. |
| `warnings` | Non-fatal rate-limit or plan information. |

Machine output is compact by default. Add `--pretty` when you want indented JSON.

Terminal output is coloured for a person: group headings yellow, commands and flags cyan, metadata
dim. `--no-color`, `NO_COLOR=1`, and a piped stdout each turn it off, so nothing that is parsed ever
carries an escape sequence.

## NDJSON

`--format ndjson` writes one item per line from the response's primary collection:

```json
{"id":"2","label":"Latest"}
{"id":"1","label":"First"}
```

This format does not include the success envelope.

## Field projection

```bash
agent-figma file get FILE_KEY \
  --fields name,lastModified,document.id \
  --json
```

Field projection changes `data`, not the envelope metadata.

## Errors

```json
{"ok":false,"error":{"type":"NotAuthenticated","title":"No Figma profile named default","retriable":false,"suggestion":"Run agent-figma auth login.","trace_id":"afg_..."}}
```

Errors go to stderr. Successful data goes to stdout.

A usage error carries what you need to correct the line you typed, so you do not have to go looking for it:

```json
{"ok":false,"error":{"type":"UsageError","title":"Unknown flag --depht for `file get`","retriable":false,"suggestion":"Did you mean --depth? Run `agent-figma file get --help` for the flags it takes.","trace_id":"afg_...","details":{"argument":"depht","command":"file get","usage":"agent-figma file get FILE_OR_URL [--profile NAME] [--depth N] [--json] [--pretty] [--fields a,b.c]","did_you_mean":"--depth"}}}
```

| Detail | Meaning |
| --- | --- |
| `argument` | The flag or positional the failure is about. |
| `command` | The command that wanted it. |
| `usage` | That command's usage line. |
| `did_you_mean` | The nearest command or flag, when the name is one small edit away. |
| `alternatives` | The verbs under a noun that was given without one. |

A flag the command does not declare is refused before anything is sent to Figma. `agent-figma file get KEY --depht 2` fails rather than quietly returning the whole file.

| Exit code | Meaning |
| --- | --- |
| `0` | Success |
| `1` | Figma or unexpected failure |
| `2` | Invalid command, flag, URL, or input |
| `3` | Resource not found |
| `4` | Authentication or permission failure |
| `5` | Operation blocked by the read-only boundary |
| `6` | Rate limited |
