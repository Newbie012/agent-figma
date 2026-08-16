# ADR-009 - pnpm's own release tooling, on an alpha lane

## Decision

Release with pnpm 12's built-in tooling instead of Changesets. `pnpm change` records an intent,
`pnpm version -r` applies the pending intents and writes the changelog, and `pnpm lane` keeps the
package on the `alpha` channel, recorded in `pnpm-workspace.yaml`. Publishing is OIDC trusted
publishing under the `alpha` dist-tag. pnpm is pinned to `12.0.0-rc.6` in `packageManager`.

`@changesets/cli` is removed. The intent files stay Changesets-compatible Markdown in `.changeset/`.

## Context

The first release has to be a prerelease: the CLI is worth using and the surface is not settled.
That needs a record of what changed, a changelog, and a version scheme that keeps prereleases out of
`latest`.

Changesets does all three, and its pre-mode is the part that goes wrong — a stateful thing you enter
and exit, easy to leave in the wrong state, and invisible in a diff. A lane is a fact about the
package written in the workspace file: while it says `alpha`, no intent can cut a stable release, and
graduating is one command with a visible diff.

pnpm already ships the rest, so this is one fewer dependency doing a job the package manager does.

## Consequences

- The repository depends on a release candidate of pnpm. The exact pin and the Changesets-compatible
  intent format make this reversible in an afternoon.
- Corepack cannot install pnpm 12 — it is a Rust rewrite without the JavaScript entry point corepack
  looks for. Local setup and CI both use `npm install -g --allow-scripts=pnpm pnpm@12.0.0-rc.6`.
- A change that should ship needs an intent recorded with it. Without one, main merges and nothing
  publishes. CI prints the pending plan on every pull request so the omission is visible before
  merge, not after.
- No publish credential exists. There is no token to leak, rotate, or scope, and trusted publishing
  binds to the workflow filename, so renaming `release.yml` breaks publishing until npm is updated.
- **The first version cannot be published by CI.** Trusted-publisher settings live on a package that
  does not exist yet ([npm/cli#8544](https://github.com/npm/cli/issues/8544)), so the first release
  is published once by hand and the workflow holds with a notice until the package exists.
- The lane number is taken from what is published on the registry, so a local dry run of an
  unpublished package always says `alpha.0`. Verified, not assumed.
- A lane produces the next prerelease of the *current* version and ignores the intent's bump type.
  Harmless while everything is a patch on the way to `0.1.0`; re-check before leaving alpha.

## Alternatives considered

- **Changesets with pre-mode.** Mature and well understood. Rejected for the statefulness above and
  for being a second tool to keep current. Reconsider if the pnpm release candidate disappoints.
- **A long-lived `NPM_TOKEN` secret.** A standing credential any workflow added later can read.
  OIDC removes the credential rather than protecting it.
- **`npm version` and a hand-written changelog.** No record of intent, so the bump is decided at
  release time by whoever runs the command rather than at change time by whoever knows what changed.
- **Publishing by hand every time.** Fine exactly once, which is how every irreproducible release
  process starts. It is the bootstrap, and only the bootstrap.

## Revisit when

- pnpm 12 goes stable and the pin can leave the release candidate.
- npm allows configuring a trusted publisher before a package exists, which retires the bootstrap
  and the registry check that guards it.
- The repository goes public, at which point npm generates provenance and `--provenance` should be
  verified rather than assumed.
- The surface settles enough to leave `alpha`, which is `pnpm lane main` plus the bump-type re-check.
