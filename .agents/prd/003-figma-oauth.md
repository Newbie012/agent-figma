# PRD-003 - Browser OAuth, for operators who bring their own Figma app

## Status

Implemented and shipped, and not the way anyone signs in. A personal access token is
([PRD-001](001-read-only-figma-context.md)). Figma rejected the public OAuth app this was built for,
on two grounds: the submission carried no video of the flow, and the name `agent-figma` reads as
Figma's own tooling next to their Agent SDK. Publishing publicly therefore needs a rename and another
review round, which is a product decision rather than a missing feature. Everything below still works
for an operator who registers their own app and hosts the relay.

## User need

An operator who has their own Figma OAuth app can run `agent-figma auth login`, approve read-only
access in a browser, and keep using the CLI after access-token expiry without rotating tokens by hand.

## Behavior

- A personal access token is how the CLI is signed in. Browser login is available to an operator who
  sets `AGENT_FIGMA_OAUTH_RELAY_URL` to a relay they host.
- Request only reviewed read scopes and use authorization code flow with PKCE S256 and exact state verification.
- A hosted callback exchanges Figma's short-lived code because Figma requires the OAuth client secret at exchange and refresh time.
- The callback returns an encrypted token grant to the localhost listener. Plaintext tokens never appear in redirect URLs, browser history, CLI output, or logs.
- Store access and refresh tokens in the platform secret store. Store expiry, client ID, and scopes as profile metadata.
- Refresh OAuth access tokens shortly before expiry and persist the replacement before making a Figma read.
- Support a self-hosted OAuth app with explicit client ID, client secret, and registered redirect URI.
- Keep profile status and command output secret-free.

## Refusals

- Never request a Figma write scope.
- Never persist an OAuth client secret in a local profile.
- Never compile an unowned or environment-specific relay hostname into the CLI.
- Never accept a non-loopback return URL from the hosted callback session.
- Never treat OAuth control-plane POSTs as permission to send non-GET Figma data requests.

## Acceptance

- Public CLI tests cover authorization URL creation, PKCE, state, callback grants, token login, sanitization, expiry refresh, and refresh failure.
- Relay tests cover scope allowlisting, loopback validation, token exchange, encrypted grants, and no-store responses.
- The docs explain browser login, token fallback, hosted trust boundaries, self-hosting, and Figma app registration.
