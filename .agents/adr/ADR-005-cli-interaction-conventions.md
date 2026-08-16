# ADR-005 - CLI interaction conventions

## Decision

`agent-figma` uses aligned help, catalog-driven discovery, bash and zsh completion, `method`-named envelopes with paging, readable terminal output, field projection, NDJSON, auth diagnostics, and a catalog-backed `api call` command.

Figma domain nouns and REST paths remain native to Figma.

## Safety

The bundled endpoint catalog contains only GET operations. Generic calls resolve an operation from that catalog and cannot accept an HTTP method, arbitrary host, or unknown path. Remote write support requires a replacement ADR.

## Consequences

- Command metadata is the source of truth for help, discovery, and completion.
- Focused wrappers and `api call` share one endpoint catalog.
- The success envelope stays uniform even where Figma has no cursor pagination.
