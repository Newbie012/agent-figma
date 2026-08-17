---
"@eliya-oss/agent-figma": patch
---

The package ships what it says it ships. `files` entries are patterns rather than paths, so a bare `docs` also matched `tests/docs` and a bare `README.md` matched every nested one: `0.1.0-alpha.0` carried a test file and five internal READMEs. The entries are anchored now, and the packaging check fails on anything outside the allowlist rather than trusting the field.
