# ADR-006 - Fumadocs documentation site

**Superseded by [ADR-008](ADR-008-documentation-in-the-repository.md).** The site was removed before the first release; documentation ships as Markdown in `docs/`. This ADR is kept for the record of what was tried.

## Decision

Add a `docs` pnpm workspace based on Next.js and Fumadocs. It provides generated MDX collections, server-side search, copy-as-Markdown actions, LLM indexes, Open Graph routes, and Vercel configuration.

Keep the site dark, restrained, and content-first. Use Figma's five-color mark as the visual accent while keeping the interface neutral.

## Consequences

- The root package owns `docs:dev`, `docs:types`, and `docs:build` scripts.
- Documentation content lives under `docs/content/docs`.
- The docs site can deploy independently from the npm package.
- CLI release checks stay separate from the docs build, so npm publishing does not require Next.js.
