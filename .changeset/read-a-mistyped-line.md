---
"@eliya-oss/agent-figma": patch
---

A flag the command does not declare is now refused before anything reaches Figma. `agent-figma file get KEY --depht 2` used to drop the flag and answer with the whole file, which is the one failure a caller cannot see. A mistyped command names the nearest one, a noun given without a verb lists its verbs, and every usage failure carries the command and the usage line it should have been typed as.
