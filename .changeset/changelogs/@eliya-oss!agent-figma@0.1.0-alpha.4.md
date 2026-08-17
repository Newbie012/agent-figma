## 0.1.0-alpha.4

### Patch Changes

- `npm install -g @eliya-oss/agent-figma` gets the newest build. It was serving `0.1.0-alpha.0` — the oldest release, with a packaging bug and no `upgrade` — because npm pins `latest` on a package's first publish and never moves it again for a prerelease, while the channel moved on under a separate tag. Moving a tag after the fact needs a credential that trusted publishing deliberately does not grant, so releases now publish to `latest` and the prerelease stays where it is already visible: in the version. `upgrade` follows the same tag.
