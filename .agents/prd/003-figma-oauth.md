# PRD-003 - Browser OAuth

## User need

An operator can run `agent-figma auth login`, approve a read-only Figma app in a browser, and keep using the CLI after access-token expiry without manually creating or rotating tokens.

## Behavior

- Browser login is the default. `--token` provides a non-interactive fallback.
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
