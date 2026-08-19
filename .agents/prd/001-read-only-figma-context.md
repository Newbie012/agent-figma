# PRD-001 - Read-only Figma context

## User need

An operator or agent can authenticate once, discover the CLI without reading its source, and retrieve stable Figma data through focused commands or the catalog-backed API command.

## Behavior

- Accept a personal access token through `--token`, `AGENT_FIGMA_TOKEN`, or `FIGMA_TOKEN`. Browser OAuth is available to an operator who registers a Figma app and hosts the relay ([PRD-003](003-figma-oauth.md)).
- Keep named profiles outside the project directory.
- Accept both raw file keys and standard Figma file URLs.
- Extract `node-id` from a Figma URL when present.
- Read a whole file with an optional depth bound.
- Read one node without returning unrelated document content.
- Read identity, team projects, project files, comments, versions, rendered images, components, component sets, and styles.
- Generate shell completion and expose endpoint metadata through a command-catalog-first interface.
- Provide a raw `api call` escape hatch that can invoke only bundled GET endpoints.
- Use the same stable success-envelope shape across all commands: `method`, identity fields, `data`, `paging`, and `warnings`.
- Render useful fields and arrays as terminal summaries and tables instead of dumping JSON.
- Report auth, permission, missing-resource, rate-limit, and usage failures distinctly.
- Expose every command and flag through `describe --json`.
- Print a short banner naming the first two or three commands when a person runs the binary with no arguments, and answer the catalog when a script does.
- Print a command's usage line, flags, required flags, endpoints and scopes under `--help` or `-h`, at every level of the command line.
- Name the nearest command when one is mistyped, and a noun's verbs when the verb is missing.
- Refuse a flag the command does not declare, naming the flag it was nearest to.
- Name the command and its usage line on every usage failure, so the caller is told what it should have typed rather than only what was wrong.

## Refusals

- No POST, PUT, PATCH, or DELETE data request may reach Figma. OAuth exchange and refresh POSTs are limited to the authentication boundary described by ADR-007.
- `api call` refuses unrecognized operations; arbitrary URLs and HTTP methods are never accepted.
- No token value may appear in status output, errors, logs, or command discovery.
- No flag reaches a Figma request without being declared. A flag the catalog does not carry stops the command before it calls Figma.

## Acceptance

- A fake Figma adapter proves the exact path and query sent for each read command and generic API call.
- CLI tests prove valid compact JSON on stdout and structured failures on stderr.
- CLI tests lock the observable help, discovery, completion, envelope, and human-output conventions.
- The bundled binary passes a smoke test.
