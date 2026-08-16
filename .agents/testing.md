# Testing Strategy

Use the simplest test that catches the behavior:

- Pure domain tests for Figma URL parsing and branded IDs.
- Fake-port tests for auth, permissions, rate limits, and API responses.
- Fake-port tests for browser OAuth, exact state handling, refresh, and secret-free output.
- Relay unit tests for short-lived sealed sessions, read-scope allowlisting, loopback callbacks, and encrypted grants.
- CLI tests for arguments, stdout/stderr, envelopes, and exit codes.
- Bundle smoke tests for the published entrypoint.

Do not call live Figma in normal tests or CI.

## TestDriver

```text
src/testing/
  driver.ts
  state.ts
  services.ts
  domains/
    auth/
    cli/
    figma/
```

The aggregate driver exposes:

```text
driver.auth.setProfile
driver.auth.clearProfiles
driver.auth.completeOAuth
driver.auth.overrideRefresh
driver.figma.overrideGet
driver.figma.listCalls
driver.cli.run
driver.cli.runJson
driver.snapshot
```

Driver methods arrange or read state. Keep assertions in the spec. Behavior tests use `// ARRANGE`, `// ACT`, and `// ASSERT` sections.

Required checks:

```bash
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
```
