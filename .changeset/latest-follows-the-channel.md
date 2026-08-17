---
"@eliya-oss/agent-figma": patch
---

`latest` follows the alpha channel instead of freezing on the first build ever published. npm pins `latest` to a package's first publish and never moves it again for a prerelease, so `npm install -g @eliya-oss/agent-figma` without a tag was serving `0.1.0-alpha.0` while the channel had moved on twice. Every version here is a prerelease, so there is no stable release for `latest` to protect, and the release job moves it with each publish.
