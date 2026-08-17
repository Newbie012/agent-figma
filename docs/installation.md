# Installation

Every way to install agent-figma, and how to keep it current.

## Requirements

- Node.js 22 or newer
- A Figma account

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

That upgrades. It works out how this copy was installed by looking at where its own module sits — a
global npm prefix, a bun global, or a checkout — and runs the command that replaces that install. It
leaves the package manager's own output on screen, so a slow install visibly lives, and ends by naming
the version you now have. It asks the registry for the newest published version with a two and a
half second timeout, and says it could not tell rather than failing when it cannot reach it.

One route it cannot do for you: a checkout is not the CLI's to pull. It prints why and the command
that does it, and exits `1`, because you asked to be upgraded and you were not.

```bash
agent-figma upgrade --check
```

reports the same finding and runs nothing. It always exits `0`, because a report that was produced is
a success. `--json` answers the usual envelope instead of prose, carrying `route`, `current`,
`latest`, `upToDate` and `ran`, so a caller branches on a field rather than on an exit code.

```bash
export AGENT_FIGMA_UPGRADE_ROUTE=npm   # one of npm, bun, source
export AGENT_FIGMA_REGISTRY=…          # a different dist-tags endpoint
```

`AGENT_FIGMA_UPGRADE_ROUTE` names the install the CLI should believe it has, for when detection
guesses wrong.

## Shell completion

```bash
# zsh
mkdir -p ~/.zfunc
agent-figma completion zsh > ~/.zfunc/_agent-figma

# bash
agent-figma completion bash > ~/.agent-figma-completion.bash
```

Load the generated file in your shell configuration.
