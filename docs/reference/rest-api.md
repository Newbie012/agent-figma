# REST escape hatch

Discover and call bundled Figma GET operations without opening a write path.

Focused commands cover common tasks. The REST command uses the same reviewed endpoint catalog for less common query options.

## List operations

```bash
agent-figma api endpoints list --json
agent-figma api endpoints list --family file --json
```

## Describe one operation

```bash
agent-figma api endpoint describe file.get --json
```

The result includes the operation name, HTTP method, path template, scopes, and safety classification.

## Call an operation

```bash
agent-figma api call file.get \
  --payload '{"key":"FILE_KEY","depth":2}' \
  --json
```

Payload keys that match `:path_parameters` fill the path. Other scalar values and scalar arrays become query parameters.

```bash
agent-figma api call file.comments.list \
  --payload '{"file_key":"FILE_KEY","as_md":true}' \
  --json
```

## Safety boundary

Every catalog entry is GET-only. Unknown operations fail before authentication or network access. The command does not accept an HTTP method, request body, arbitrary URL, or alternate host.
