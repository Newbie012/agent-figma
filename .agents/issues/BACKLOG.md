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

## ISSUE-007 - First release

- **Status:** done
- **ADRs:** ADR-009

`0.1.0-alpha.0` was published by hand to bootstrap the trusted publisher, and every release since has
been cut by CI over OIDC with provenance. Merging to `main` with a pending intent is the whole
process.

## ISSUE-008 - Hosted authentication

- **Status:** closed, not done
- **PRDs:** PRD-003
- **ADRs:** ADR-007

Figma refused the public OAuth app: no video of the flow in the submission, and a name their reviewer
reads as Figma's own tooling beside the Figma Agent SDK. A personal access token is how the CLI signs
in, which is what the docs say.

The relay stays deployed at https://agent-figma.vercel.app with no client credentials, as the
reference deployment an operator copies. Reopening this means deciding on a name first, then a
submission with a recording — see ISSUE-010.

## ISSUE-009 - Compare a node against the code that implements it

- **Status:** done
- **PRDs:** PRD-005

`node compare` reports which of a design's tokens and sizes the named files never mention. It is a
text scan by design: parsing the framework's semantics is a different product, and PRD-005 says so
rather than implying the answer is more than it is.

## ISSUE-010 - Decide what this is called

- **Status:** todo

Figma's reviewer read `agent-figma` as Figma's own tooling, next to their Agent SDK. That blocks a
public OAuth app, and it is the kind of objection a trademark holder can raise again later about the
npm package and the repository, not only about the app.

Renaming costs a published package name, a repository, a binary, an alias, a skill id, and every doc
that names them. Deciding not to rename costs browser login for anyone who will not host a relay.
Neither is urgent while tokens work, and the choice belongs to whoever owns the name.
