# Release

`agent-figma` is on the `alpha` lane, recorded in `pnpm-workspace.yaml`, so every release is a
prerelease: `0.1.0-alpha.N`. The version says so; the dist-tag is `latest`, because that is the one
the publish can set.
Versioning is pnpm 12's own tooling, not Changesets ([ADR-009](adr/ADR-009-pnpm-native-releases.md)).

pnpm 12 cannot be installed by corepack yet:

```bash
npm install -g --allow-scripts=pnpm pnpm@12.0.0-rc.6
```

## Recording what a change releases as

```bash
pnpm change                 # interactive: pick the bump and write the summary
pnpm change status          # the pending intents, and the version they produce
```

The summary becomes the changelog entry, so write it for someone deciding whether to upgrade. A
change with no intent releases nothing: the release workflow finds no pending plan and holds. That
is the correct default, not a failure.

## Cutting a release

Merging to `main` runs `.github/workflows/release.yml`, which:

1. holds if the package is not on the registry yet, or if no intent is pending,
2. runs `pnpm release:check`,
3. applies the intents with `pnpm version -r`, commits `release <version>` and tags `v<version>`,
4. publishes with `pnpm publish --provenance` over OIDC trusted publishing, which points `latest`
   at the new version,
5. drafts a prerelease on GitHub from the generated changelog.

The repository is public, so npm attaches a provenance attestation to each release.

No npm token exists anywhere. The workflow requests an OIDC identity with `id-token: write`, and
npm verifies the repository and the workflow filename against the trusted publisher configured on
the package. **Renaming `release.yml` breaks publishing** until the trusted publisher is updated.

## The first release, once

npm's trusted-publisher settings live on a package, and a package that has never been published has
no settings page, so CI cannot create one ([npm/cli#8544](https://github.com/npm/cli/issues/8544)).
The first version is published by hand:

```bash
pnpm release:check
pnpm version -r                       # 0.1.0 -> 0.1.0-alpha.0, writes the changelog and ledger
git add -A && git commit -m "release 0.1.0-alpha.0"
git tag -a v0.1.0-alpha.0 -m "release 0.1.0-alpha.0"
git push --atomic origin main refs/tags/v0.1.0-alpha.0
pnpm build && pnpm publish --no-git-checks
```

Then configure the trusted publisher on npmjs.com for `@eliya-oss/agent-figma`
(repository `Newbie012/agent-figma`, workflow `release.yml`), and turn CI releasing on:

```bash
gh variable set RELEASE_ENABLED --body true
```

Until that variable is `true` the release job holds with a notice, because an OIDC publish fails
until npm knows the repository and the workflow file, and a run that versions and tags without
publishing leaves `main` ahead of the registry. Every release after this one is credential-free.

Check the tags afterwards:

```bash
npm view @eliya-oss/agent-figma dist-tags
```

**There is one dist-tag, and the publish sets it.** npm pins `latest` on a package's first publish
and never moves it again for a prerelease, so it froze on `0.1.0-alpha.0` while a separate `alpha`
tag moved on — a bare `npm install` served the oldest build ever published. Moving a tag afterwards
needs credentials that trusted publishing does not grant: `npm dist-tag add` answers `401` in CI,
because OIDC authenticates the publish and nothing else. So releases publish to `latest` and the
prerelease lives in the version, where it is visible anyway: `0.1.0-alpha.4`, not a tag someone has
to know to ask for. The `alpha` tag is frozen at `0.1.0-alpha.3`; remove it once, at your
convenience, with `npm dist-tag rm @eliya-oss/agent-figma alpha`.

Applying a version renames the changelog file rather than adding one, so
`.changeset/changelogs/` only ever holds the newest release. Each version's notes live on its GitHub
release, which the workflow writes from that file. Consumed intent files are removed once the ledger
records them; the ledger is what pnpm reads.

## How the version is chosen

The lane number comes from what is already published: with `0.1.0-alpha.4` on the registry, the next
release is `0.1.0-alpha.5`. `package.json` carries `0.1.0` until the first release, which is the
stable version the lane is building toward.

Two things to know about the release candidate, both verified rather than assumed:

- **A lane ignores the bump type.** A `minor` intent on a lane produces the next prerelease of the
  current version, not of the bumped one. It does not matter while every intent is a patch on the
  way to `0.1.0`, and it must be re-checked before leaving alpha.
- **An unpublished package cannot increment.** Until something is on the registry, every dry run
  says `0.1.0-alpha.0`. That is expected before the bootstrap above, and self-corrects after it.

## Going stable

```bash
pnpm lane main --filter @eliya-oss/agent-figma
```

That is a visible diff in `pnpm-workspace.yaml`, and it is the only thing standing between an alpha
and `latest`. Re-check the bump behavior above first, and drop `publishConfig.tag` and the
`--tag alpha` in `release:publish` in the same change.
