# Agent Figma OAuth Relay

This stateless Vercel service handles Figma OAuth exchange and refresh without putting the app secret in the CLI.

Deployed at **https://agent-figma.vercel.app** (Vercel project `agent-figma`, root `apps/oauth-relay`).
`AGENT_FIGMA_OAUTH_SESSION_SECRET` and `AGENT_FIGMA_OAUTH_REDIRECT_URI` are set there; the two Figma
values are not, so a valid session request answers `503` naming the one it wants.

Set these encrypted Vercel environment variables:

```text
FIGMA_CLIENT_ID=
FIGMA_CLIENT_SECRET=
AGENT_FIGMA_OAUTH_SESSION_SECRET=at-least-32-random-bytes
AGENT_FIGMA_OAUTH_REDIRECT_URI=https://YOUR_HOST/oauth/figma/callback
```

Redeploy after changing any of them: they are read at request time by a function built at deploy time.

Register the same redirect URI in your Figma OAuth app. The relay accepts only approved read scopes and localhost return URLs. It stores no sessions or tokens.
