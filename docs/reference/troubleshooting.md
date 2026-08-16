# Troubleshooting

Diagnose authentication, permissions, invalid URLs, rate limits, and large responses.

## Not authenticated

```bash
agent-figma auth status --json
agent-figma auth profiles list --json
```

Connect the selected profile again:

```bash
agent-figma auth login --token "$FIGMA_TOKEN" --profile default
```

If a trusted OAuth relay is configured, omit `--token` to use browser login.

## Browser login does not return

Figma authorization codes expire after 30 seconds. Retry the command if approval or the callback was interrupted. Check that the OAuth relay is reachable, its redirect URL exactly matches the Figma app, and localhost port `45454` is available. Use `--no-open` to inspect the authorization URL.

## Permission denied

Check that:

1. The token belongs to the expected Figma account.
2. The account can open the file in Figma.
3. The token has the scope listed by `api endpoint describe`.
4. The selected `--profile` is correct.

```bash
agent-figma auth test --profile work --json
agent-figma auth scopes --profile work --json
```

## Invalid Figma URL

Pass a raw file key or a standard HTTPS Figma design, file, prototype, board, or slides URL. For nodes, keep the `node-id` query parameter or provide `--id`.

## Rate limited

Respect `retry_after_seconds` from the error envelope. Reduce the number of reads, file depth, node IDs, or repeated calls. Figma can apply different limits based on plan and seat.

## Response is too large

```bash
agent-figma file get FILE_KEY --depth 2 --fields name,document --json
agent-figma file comments list FILE_KEY --format ndjson
```

## Inspect the exact command contract

```bash
agent-figma describe --json
agent-figma file get --help --json
```

Use `trace_id` to match a structured error with terminal or automation logs.
