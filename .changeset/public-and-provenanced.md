---
"@eliya-oss/agent-figma": patch
---

Releases carry a provenance attestation now the repository is public, tying each published version to the repository and workflow that built it. CI releasing is gated on a `RELEASE_ENABLED` variable, so a run cannot version and tag a release it is not yet able to publish.
