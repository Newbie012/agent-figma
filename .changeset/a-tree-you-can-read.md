---
"@eliya-oss/agent-figma": patch
---

`--format tree` prints a frame as one indented line per node, carrying the name, size, sizing chain, layout mode, gap, padding, radius and resolved token names. It is the output someone implementing a design actually wants, instead of a throwaway script to walk the JSON. `--depth` also works on `node get` and `file nodes get` now, the way it always did on `file get`.
