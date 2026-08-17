## 0.1.0-alpha.1

### Patch Changes

- Releases carry a provenance attestation now the repository is public, tying each published version to the repository and workflow that built it. CI releasing is gated on a `RELEASE_ENABLED` variable, so a run cannot version and tag a release it is not yet able to publish.

- The package ships what it says it ships. `files` entries are patterns rather than paths, so a bare `docs` also matched `tests/docs` and a bare `README.md` matched every nested one: `0.1.0-alpha.0` carried a test file and five internal READMEs. The entries are anchored now, and the packaging check fails on anything outside the allowlist rather than trusting the field.

- `agent-figma upgrade` upgrades. It works out whether npm, bun, or a git checkout put this copy on your machine, runs the command that replaces it, and ends by naming the version you have. A checkout is not the CLI's to pull, so that route explains itself and exits 1 rather than pretending. `--check` asks instead of telling, `--json` answers the envelope, and the docs now list every way to install alongside it.
