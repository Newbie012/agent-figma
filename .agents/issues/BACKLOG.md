# Backlog

## ISSUE-001 - Foundation and first vertical slice

- **Status:** done
- **PRDs:** PRD-001
- **ADRs:** ADR-001, ADR-002, ADR-003, ADR-004

Set up Effect runtime, domain types, ports, secure profiles, live and fake Figma adapters, metadata-driven discovery, `file get`, `node get`, output envelopes, tests, and bundling.

## ISSUE-002 - OAuth profiles

- **Status:** done
- **PRDs:** PRD-003
- **ADRs:** ADR-007

Add browser OAuth, refresh tokens, scopes, an encrypted hosted callback, and a deployable relay. Keep personal access token login for non-interactive use.

## ISSUE-003 - Read catalog expansion

- **Status:** done
- **ADRs:** ADR-005

Add project/team listing, comments, versions, components, styles, image renders, command discovery, completion, human tables, and a bundled GET-only endpoint catalog.

## ISSUE-004 - Cache and rate-limit policy

- **Status:** todo

Add explicit cache metadata, conditional reuse, `Retry-After` handling, and tests for plan/seat rate-limit headers.

## ISSUE-005 - Documentation

- **Status:** done
- **PRDs:** PRD-002
- **ADRs:** ADR-008, ADR-006 (superseded)

Ship Markdown documentation in `docs/`, with the command reference generated from the catalog. The hosted site is deferred until the CLI is published.

## ISSUE-006 - Generate the endpoint catalog

- **Status:** todo

Generate and validate the bundled GET-only endpoint metadata from Figma's OpenAPI package. Preserve the reviewed operation names.

## ISSUE-007 - Beta release

- **Status:** in progress
- **ADRs:** ADR-009

Releasing runs on pnpm 12's own tooling, on the `beta` lane, over OIDC trusted publishing. What is
left is the bootstrap in [`.agents/release.md`](../release.md): create the GitHub repository,
publish `0.1.0-beta.0` by hand once, then configure the trusted publisher on npm so CI takes over.

## ISSUE-008 - Hosted authentication

- **Status:** todo

Deploy the OAuth relay, register the Figma app, and complete public-app review. Browser OAuth stays
opt-in through `AGENT_FIGMA_OAUTH_RELAY_URL` until then; personal access tokens carry the beta.
