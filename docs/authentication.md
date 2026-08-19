# Authentication

Connect Figma with a personal access token, and keep the secret out of your shell history and out of
the CLI's output.

## Personal access token

```bash
agent-figma auth login --token "$FIGMA_TOKEN"
```

Create the token in Figma under Settings, Security, personal access tokens, and give it read scopes.
On macOS the token goes to the Keychain; elsewhere it goes to a file only your user can read. Profile
metadata (the name, the scopes you recorded, never the secret) sits in the config directory.

`--scopes` records what you granted, so `auth scopes` can tell you later:

```bash
agent-figma auth login \
  --token "$FIGMA_TOKEN" \
  --profile work \
  --scopes file_content:read,file_comments:read \
  --json
```

Figma decides the real access. What you record here only documents it.

Two environment variables work as a token too, which is what CI usually wants:
`AGENT_FIGMA_TOKEN`, or `FIGMA_TOKEN` if you already export that.

## Browser OAuth, if you register your own Figma app

The CLI can do authorization-code OAuth with PKCE, and the code for it ships. Using it takes two
things Figma requires: an OAuth app of your own, and a hosted endpoint holding its client secret,
because Figma will not exchange a code without one. `apps/oauth-relay` is that endpoint, deployable
to Vercel in a few minutes.

```bash
export AGENT_FIGMA_OAUTH_RELAY_URL=https://your-relay.example.com
agent-figma auth login --profile work
```

The CLI opens Figma, asks for read scopes with PKCE, verifies the callback state exactly, decrypts
the grant on a loopback callback, and refreshes shortly before expiry. `--no-open` prints the URL,
and `--auth-url-out PATH` writes it for a headless browser.

There is no default relay: the CLI has no compiled hostname, so nothing sends your authorization code
anywhere you did not name. Publishing an OAuth app for general use also needs Figma's review, which
is why the token above is the documented path.

## Named profiles

```bash
agent-figma auth profiles list --json
agent-figma auth status --profile work --json
agent-figma file get FILE_KEY --profile work --json
```

The default profile name is `default`.

## Environment fallback

For short-lived automation, set either variable:

```bash
export AGENT_FIGMA_TOKEN="$FIGMA_TOKEN"
# or
export FIGMA_TOKEN="$FIGMA_TOKEN"
```

Environment tokens act as the default profile and are never returned in output.

## Storage

macOS uses Keychain for access and refresh secrets. Other platforms use a mode `0600` profile file until native secret-store adapters are added. Set `AGENT_FIGMA_CONFIG_DIR` to move profile metadata.

## Why a hosted callback exists

Figma requires the OAuth client secret for code exchange and refresh. The CLI cannot safely include that secret, so it uses a small hosted callback. The callback handles tokens in memory, stores nothing, and encrypts the grant with a temporary key created by the CLI before returning it to localhost.

Self-hosters can deploy `apps/oauth-relay` with their own Figma app. Register `https://YOUR_HOST/oauth/figma/callback`, set the relay environment variables from its README, and point the CLI at it with `AGENT_FIGMA_OAUTH_RELAY_URL`.

For local app development, `--oauth --client-id ID --client-secret SECRET --redirect-uri http://localhost:45454/oauth/figma/callback` handles the exchange locally. The CLI does not store the client secret.

## Remove a profile

```bash
agent-figma auth logout --profile work --yes --json
```

This removes local credentials. To disable them everywhere, revoke the app or token in Figma.

See [Figma's OAuth app documentation](https://developers.figma.com/docs/rest-api/oauth-apps/) for app registration, publishing, and review requirements.
