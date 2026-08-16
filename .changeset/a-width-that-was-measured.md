---
"@eliya-oss/agent-figma": patch
---

A node now says whether its size was chosen or measured. `width: 850` with `layoutSizingHorizontal: FILL` means the frame above it fixed the width, and that frame is outside the subtree a node read returns, so it used to be invisible: a panel deliberately built at half width read exactly like one meant to stretch. `node get` reads the chain above the node and reports `sizing.parent` and `ancestors` alongside the node's own sizing. `--no-ancestors` skips the extra read, and `file nodes get` makes it only with `--ancestors`.
