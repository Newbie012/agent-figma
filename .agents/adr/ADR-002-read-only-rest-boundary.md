# ADR-002 - Enforce a read-only REST boundary

- **Status:** accepted
- **Date:** 2026-07-20
- **PRDs:** PRD-001

## Context

Figma REST includes comments, variables, dev resources, and webhook mutations. The first product must be safely read-only.

## Decision

The public port exposes only `get`. The live adapter accepts only GET requests. There is no generic method flag or request-body path.

## Rationale

Types and the adapter shape enforce read-only safety. Command names and agent judgment do not.

## Consequences

Adding any mutation requires a new PRD, ADR, port method, command metadata, and explicit safety tests.
