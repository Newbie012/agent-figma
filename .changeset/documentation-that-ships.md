---
"@eliya-oss/agent-figma": patch
---

Documentation ships as Markdown in `docs/`, indexed by `docs/README.md` and included in the package, so an agent reads it from the install rather than the network. `docs/reference/commands.md` is generated from the command catalog and checked against it, so it cannot describe a surface the CLI no longer has.
