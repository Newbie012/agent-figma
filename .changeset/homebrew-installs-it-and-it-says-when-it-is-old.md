---
"@eliya-oss/agent-figma": patch
---

`brew install Newbie012/tap/agent-figma` now installs one compiled binary that carries its own runtime, so the CLI no longer needs Node on the machine that runs it. Every release compiles a binary for macOS and Linux, on both architectures, attaches them to the GitHub release, and points the formula at the macOS pair. `agent-figma upgrade` knows those two new routes: Homebrew replaces what Homebrew installed, and a running binary is handed the curl line that replaces it, because a binary cannot rewrite itself. Every upgrade now also names `npx skills update agent-figma`, since the skill is installed by something else and an upgrade that moved only the binary leaves half the install behind. Separately, agent-figma asks the registry once a day — after your command has already answered, never before it — and mentions a newer version once, on stderr so machine output is untouched. `AGENT_FIGMA_NO_UPGRADE_CHECK` turns that off.
