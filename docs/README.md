# Agent Figma

Read Figma context from terminals, scripts, and AI agents without changing remote state.

`agent-figma` is a read-only Figma CLI. It turns file URLs, node URLs, project IDs, and published asset keys into stable structured output.

```bash
agent-figma file get "https://www.figma.com/design/FILE_KEY/Product" --depth 2 --json
agent-figma node get "https://www.figma.com/design/FILE_KEY/Product?node-id=12-34" --json
```

## Contents

Getting started

- [Installation](./installation.md)
- [Quick start](./quick-start.md)
- [Authentication](./authentication.md)
- [Security](./security.md)

Usage

- [Reading Figma context](./guides/reading-figma-context.md)
- [Agent workflows](./recipes/agent-workflows.md)

Reference

- [Commands](./reference/commands.md)
- [Output contract](./reference/output-contract.md)
- [Figma REST coverage](./reference/rest-api.md)
- [Troubleshooting](./reference/troubleshooting.md)
- [FAQ](./faq.md)

## What it reads

- Current user and recorded token scopes
- Team projects and project files
- Files and one or many nodes
- Comments and version history
- Rendered image URLs
- Published components, component sets, and styles

## What it never does

The CLI sends only GET requests to Figma. `api call` uses a bundled GET-only catalog and accepts no HTTP method, arbitrary host, or remote write command.

## Designed for agents

Run `agent-figma describe --json` to list commands, arguments, flags, scopes, endpoints, and examples without parsing help text. Machine output is compact by default. Use NDJSON for large collections and `--fields` to select only the values you need.

Start with [installation](./installation.md), then follow the [quick start](./quick-start.md).
