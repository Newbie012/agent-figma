# AGENTS.md

Talk tachles: concise, direct, practical.

This repo is built in this order:

1. PRD-DD: define human-readable behavior in `.agents/prd/`.
2. DDD: model the domain and architecture in `.agents/architecture.md`.
3. TDD: write public-interface tests using `.agents/testing.md`.

## Setup

pnpm 12 is a Rust rewrite still on a release candidate, so corepack cannot install it:

```bash
npm install -g --allow-scripts=pnpm pnpm@12.0.0-rc.6
pnpm install
pnpm check          # security scan, types, docs, tests with coverage, build, smoke
```

## Dev workflow

1. Update the owning PRD before changing behavior. Record durable technical choices in `.agents/adr/`, and update `.agents/cli-api.md` when the command contract changes.
2. Write or update a public-interface test and watch it fail before editing `src/`.
3. Implement the smallest passing slice.
4. Run `pnpm typecheck`, `pnpm test`, and `pnpm build`.
5. Record a change intent with `pnpm change` when the change should reach users. No intent, no release.

Before changing behavior, read:

1. `.agents/prd/000-overview.md`
2. `.agents/prd/CONTEXT.md`
3. The owning PRD
4. `.agents/architecture.md`
5. `.agents/testing.md`

Hard boundary: the CLI is read-only. Do not add Figma mutations without a new PRD and ADR.
