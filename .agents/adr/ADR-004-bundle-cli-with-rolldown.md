# ADR-004 - Bundle the CLI with Rolldown

- **Status:** accepted
- **Date:** 2026-07-20
- **PRDs:** PRD-000

## Decision

Bundle the CLI and dependencies into one ESM file at `dist/main.js`. Keep TypeScript for typechecking only.

## Rationale

A single-file bundle reduces startup work and keeps the published package small.
