---
"@eliya-oss/agent-figma": patch
---

Help is coloured for the person reading it: group headings in yellow, commands and flags in cyan, versions and hints dim, and a destructive command marked as one. The bare command opens with what to run first, and says the alias and where output goes. `--no-color`, `NO_COLOR`, and a piped stdout each turn it off, so nothing a parser sees ever carries an escape sequence. Help rendering moved to `src/output/`, where the rest of the rendering lives.
