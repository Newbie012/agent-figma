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
- The repository is public, so releases publish with `--provenance` and each version carries an
  attestation tying it to this repository and workflow.
- Releasing is gated on a `RELEASE_ENABLED` repository variable. An OIDC publish fails until npm has
  a trusted publisher for the repository and workflow, and a run that versions and tags without
  publishing leaves `main` ahead of the registry — which the next run then refuses. The gate holds
  before any of that happens, with a notice saying what to configure.
- **The first version cannot be published by CI.** Trusted-publisher settings live on a package that
  does not exist yet ([npm/cli#8544](https://github.com/npm/cli/issues/8544)), so the first release
  is published once by hand and the workflow holds with a notice until the package exists.
- The lane number is taken from what is published on the registry, so a local dry run of an
  unpublished package always says `alpha.0`. Verified, not assumed.
- A lane produces the next prerelease of the *current* version and ignores the intent's bump type.
  Harmless while everything is a patch on the way to `0.1.0`; re-check before leaving alpha.
- npm sets `latest` on a package's first publish whatever `--tag` says, so `0.1.0-alpha.0` is both
  `alpha` and `latest`. The lane governs every release after it. Observed on the first release.
- `package.json` `files` entries are patterns, not paths, **and pnpm reads them differently from
  npm**. Bare `docs` matched `tests/docs`, and pnpm includes every `README.md` at any depth whatever
  anchoring says, so `0.1.0-alpha.0` and `0.1.0-alpha.1` both shipped a test file and five internal
  READMEs. Anchoring with `./` fixed `npm pack` and changed nothing about what pnpm published: the
  check was measuring the wrong tool. `docs/**` plus `!**/README.md` and a re-include of
  `docs/README.md` is what pnpm honours, and `security:package` now packs with pnpm and reads the
  tarball, so what is checked is what is published.

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
- The first CI release runs, at which point the provenance attestation should be verified on the
  published version rather than assumed from the flag.
- The surface settles enough to leave `alpha`, which is `pnpm lane main` plus the bump-type re-check.
