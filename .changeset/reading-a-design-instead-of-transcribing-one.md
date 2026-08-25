---
"@eliya-oss/agent-figma": patch
---

`--format tree` now says where each layer sits, measured against the node you asked for rather than the canvas, so implementing a design is reading numbers instead of subtracting them. Layers the design does not draw are gone from that tree — a hidden banner sitting in the payload at plausible coordinates is work that does not exist — and `--include-hidden` brings them back marked `hidden` when the question is what a variant holds. `image render --out PATH` writes the render to disk for one named node, so looking at the frame is one command rather than a URL to fetch afterwards.
