# Authentication

Connect Figma with browser OAuth or a personal access token, without exposing secrets.

## Browser OAuth

Browser login is the default:

```bash
agent-figma auth login --profile work
```

Browser login requires a registered Figma app and a deployed relay. Set `AGENT_FIGMA_OAUTH_RELAY_URL` to the relay URL. Until then, use a personal access token.

The CLI opens Figma in your browser, requests read-only scopes with PKCE, verifies the callback state, and stores the profile. Use `--no-open` to print the URL or `--auth-url-out PATH` to pass it to a headless browser.

OAuth profiles use automatic refresh shortly before access-token expiry. Status output reports whether a profile is refreshable but never returns access or refresh tokens.

## Personal access token fallback

For CI or private use, create a token in Figma account settings and pass it explicitly:

```bash
agent-figma auth login \
  --token "$FIGMA_TOKEN" \
  --profile work \
  --scopes file_content:read,file_comments:read \
  --json
```

The `--scopes` value records the access you granted. Figma can still deny a request. Agent Figma rejects write scopes during OAuth login.

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
