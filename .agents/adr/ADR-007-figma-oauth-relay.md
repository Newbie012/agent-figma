# ADR-007 - Figma OAuth uses an encrypted hosted exchange

## Status

Accepted.

## Context

Figma supports authorization-code OAuth with optional PKCE, but requires the OAuth client secret for both code exchange and refresh. A distributed CLI cannot safely contain that secret. Figma authorization codes also expire after 30 seconds and registered callbacks are expected to be external endpoints.

## Decision

Default `auth login` uses a hosted callback service:

1. The CLI generates PKCE material, state entropy, and an ephemeral X25519 key pair.
2. The CLI creates a short-lived relay session containing only a loopback callback, requested read scopes, the PKCE verifier, and the ephemeral public key.
3. The relay seals the session into an opaque state value and returns the Figma authorization URL.
4. Figma redirects to the relay. The relay validates and opens the state, exchanges the code with its server-side app secret, encrypts the token response to the CLI's ephemeral key, and redirects the ciphertext to localhost.
5. The CLI verifies the exact state, decrypts the grant, stores secrets locally, and discards the ephemeral private key.
6. Refresh requests pass through the same secret-holding relay over HTTPS. The relay is stateless and sends `Cache-Control: no-store`.

The relay handles tokens in memory because Figma requires the app secret. It never stores them. The encrypted return grant keeps tokens out of URLs, logs, and browser history. Self-hosters can provide app credentials and use direct exchange with their own registered callback.

The CLI has no compiled relay hostname. Operators must set `AGENT_FIGMA_OAUTH_RELAY_URL` to infrastructure they trust. This prevents an undeployed or abandoned default hostname from receiving credentials.

OAuth token and refresh POSTs are authentication control-plane operations. They do not weaken the product rule that every Figma data-plane request is GET-only.

## Consequences

- Browser login provides a one-command flow once the Figma OAuth app and relay are deployed.
- The hosted service is a security and availability dependency and must protect its client secret and sealing key.
- Public OAuth distribution requires Figma app review. Until deployment is configured, operators can use `--token` or self-host the relay.
- Refresh tokens remain usable until revoked, so local storage and relay handling are treated as secret-bearing boundaries.
