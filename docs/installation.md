# Installation

Every way to install agent-figma, and how to keep it current.

## Requirements

- Node.js 22 or newer
- A Figma account

## Homebrew

```bash
brew install Newbie012/tap/agent-figma
```

The formula installs one compiled binary that carries its own runtime, so this route needs no Node at
all. It is macOS only, on Apple Silicon and Intel.

## npm

```bash
npm install -g @eliya-oss/agent-figma
```

Every version is a prerelease and is named one — `0.1.0-alpha.3` and counting — and `latest` is
whichever is newest, because the publish is what sets the tag. There is no separate channel to name:
`@alpha` was one for the first four releases and is frozen at `0.1.0-alpha.3`, so do not use it.

## bun

```bash
bun add -g @eliya-oss/agent-figma
```

bun installs the package; the CLI itself runs on Node.

## From source

```bash
git clone https://github.com/Newbie012/agent-figma.git
cd agent-figma
npm install -g --allow-scripts=pnpm pnpm@12.0.0-rc.6   # corepack cannot install pnpm 12 yet
pnpm install
pnpm build
node dist/main.js --help
```

## Confirm it

```bash
agent-figma --version
afg --version
```

`afg` is the short alias. Both names run the same binary.

## The agent skill

```bash
npx skills add Newbie012/agent-figma --skill agent-figma
```

The skill tells compatible agents when to use the CLI, how to limit reads, and how to protect tokens.

## Upgrading

```bash
agent-figma upgrade
```

That upgrades. It works out how this copy was installed by looking at where its own binary and module
sit — a Homebrew cellar, a global npm prefix, a bun global, a downloaded binary, or a checkout — and
runs the command that replaces that install. It
leaves the package manager's own output on screen, so a slow install visibly lives, and ends by naming
the version you now have. It asks the registry for the newest published version with a two and a
half second timeout, and says it could not tell rather than failing when it cannot reach it.

Two routes it cannot do for you. A checkout is not the CLI's to pull, and a running binary cannot
rewrite itself. Both print why and the command that does it, and exit `1`, because you asked to be
upgraded and you were not.

It also names `npx skills update agent-figma`, because the skill is installed by something else and an
upgrade that moved only the binary leaves half of the install behind.

```bash
agent-figma upgrade --check
```

reports the same finding and runs nothing. It always exits `0`, because a report that was produced is
a success. `--json` answers the usual envelope instead of prose, carrying `route`, `current`,
`latest`, `upToDate` and `ran`, so a caller branches on a field rather than on an exit code.

```bash
export AGENT_FIGMA_UPGRADE_ROUTE=npm   # one of brew, npm, bun, binary, source
export AGENT_FIGMA_REGISTRY=…          # a different dist-tags endpoint
```

`AGENT_FIGMA_UPGRADE_ROUTE` names the install the CLI should believe it has, for when detection
guesses wrong.

## Being told a new version is out

Once a day, and never while you are waiting on a command, agent-figma asks the registry for the newest
published version and keeps the answer in `~/.config/agent-figma/upgrade-check.json`. When that
version is newer than the one you have, the next command mentions it once:

```text
agent-figma 0.1.0-alpha.7 is out · agent-figma upgrade
```

It goes to stderr, so it never enters the JSON a script reads, and it is only ever printed to a
terminal — piped output and `--json` stay silent. The file records which version it has already
mentioned, so it is said once and not on every command after.

```bash
export AGENT_FIGMA_NO_UPGRADE_CHECK=1
```

stops the check and the hint entirely. Deleting the file is harmless; it is written again.

## Shell completion

```bash
# zsh
mkdir -p ~/.zfunc
agent-figma completion zsh > ~/.zfunc/_agent-figma

# bash
agent-figma completion bash > ~/.agent-figma-completion.bash
```

Load the generated file in your shell configuration.
