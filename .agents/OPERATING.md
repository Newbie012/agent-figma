# Operating Guide

Use this guide when `AGENTS.md` does not provide enough detail.

1. Describe user-visible behavior in `.agents/prd/`.
2. Update domain language, ports, and adapters in `.agents/architecture.md`.
3. Add a public-interface test through the TestDriver shape in `.agents/testing.md`.
4. Implement the smallest useful slice from `.agents/issues/BACKLOG.md`.

PRDs define behavior. ADRs record durable decisions. Issues define implementation slices. `cli-api.md` defines the technical CLI surface derived from the PRDs.
