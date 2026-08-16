# ADR-003 - Token-efficient bounded output

- **Status:** accepted
- **Date:** 2026-07-20
- **PRDs:** PRD-001

## Context

Figma file trees can grow large, and AI agents pay for every output token.

## Decision

Serialize machine JSON compactly by default. Support `--pretty` for inspection. Make depth-bounded file reads and node-specific reads first-class. `--raw` returns the response data without the envelope.

## Consequences

New read commands must define a bounded default or require an explicit resource identifier. A flag that normalization would need must be implemented when it is advertised: the catalog is what help, discovery and the documentation are generated from, so a flag the catalog names and the CLI ignores is a lie in three places.
