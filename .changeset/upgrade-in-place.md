---
"@eliya-oss/agent-figma": patch
---

`agent-figma upgrade` upgrades. It works out whether npm, bun, or a git checkout put this copy on your machine, runs the command that replaces it, and ends by naming the version you have. A checkout is not the CLI's to pull, so that route explains itself and exits 1 rather than pretending. `--check` asks instead of telling, `--json` answers the envelope, and the docs now list every way to install alongside it.
