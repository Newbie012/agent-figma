## 0.1.0-alpha.6

### Patch Changes

- A personal access token is how you sign in, and the docs say so plainly: `agent-figma auth login --token "$FIGMA_TOKEN"`, or `AGENT_FIGMA_TOKEN` in CI. Browser OAuth still ships and still works, for an operator who registers their own Figma app and hosts the relay in `apps/oauth-relay`; there is no default relay, so nothing sends an authorization code anywhere you did not name.
