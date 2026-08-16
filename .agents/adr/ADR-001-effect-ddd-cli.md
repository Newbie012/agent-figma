# ADR-001 - Effect DDD CLI architecture

- **Status:** accepted
- **Date:** 2026-07-20
- **PRDs:** PRD-000, PRD-001

## Context

The CLI needs typed failures, replaceable infrastructure, deterministic tests, and a contract-first development model.

## Decision

Use TypeScript, Effect's Node runtime, domain-first modules, interface ports, live and fake adapters, a metadata-driven parser, and a TestDriver. Run effects at the executable boundary. Do not add Commander.

## Rationale

This structure keeps network, storage, and process access replaceable in tests.

## Consequences

Application code depends on ports, not `fetch` or storage. Command metadata is the source for both human help and machine discovery.
