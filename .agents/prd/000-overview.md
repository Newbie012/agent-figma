# PRD-000 - Agent Figma overview

## Product

Agent Figma is a terminal-first, read-only interface to Figma data. It serves AI agents and developers who need consistent file and node data without using the Figma UI.

## Principles

- Read only: never edit files or create remote resources.
- Permission preserving: return only what the active Figma token can access.
- Bounded by default: prefer a node or shallow file read over an unbounded document dump.
- Agent readable: compact JSON, structured failures, discoverable commands.
- Figma remains the source of truth.

## Non-goals

- Canvas editing or design generation.
- Replacing Figma's official MCP server.
- Agent-side summarization.
- Browser automation.
