# ADR-008 - Documentation lives in the repository

## Decision

Documentation ships as Markdown under `docs/`, indexed by `docs/README.md` and included in the npm tarball. The Fumadocs site described by [ADR-006](ADR-006-fumadocs-site.md) is removed from the repository; that ADR is superseded.

`docs/reference/commands.md` is generated from the command catalog by `scripts/write-command-reference.mjs`. `pnpm docs:check` fails when the two disagree.

## Context

The site was a Next.js workspace with its own dependency tree, type check, build, and deployment. Releasing the CLI meant getting all of that green and hosted first, and none of it is the CLI. A first release blocked on a website is a first release that does not happen.

Markdown in the repository is also where the two readers already are: GitHub renders it, an editor opens it, and an agent reads it from the installed package without a network request, which is what the LLM routes on the site existed to provide.

## Consequences

- The root package owns `docs:check` and `docs:write`. There is no `docs:dev` or `docs:build`, and `release:check` no longer builds a site.
- `pnpm-workspace.yaml` carries the CLI and the OAuth relay only.
- The command reference is derived, so a new command or flag reaches the docs by running one script rather than by remembering.
- A hosted site can come back later against the same Markdown. Nothing in `docs/` depends on how it is rendered.
