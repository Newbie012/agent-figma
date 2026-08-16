# Installation

Install agent-figma, verify the binary, and optionally add its agent skill.

## Requirements

- Node.js 22 or newer
- A Figma account

## Install the CLI

```bash
npm install -g @eliya-oss/agent-figma@beta
```

Every release goes out under the `beta` tag while the surface settles, so name the tag. Nothing is
published to `latest` yet.

Confirm both binary names:

```bash
agent-figma --version
afg --version
```

`afg` is the short alias. Both names run the same binary.

## Install the agent skill

```bash
npx skills add Newbie012/agent-figma --skill agent-figma
```

The skill tells compatible agents when to use the CLI, how to limit reads, and how to protect tokens.

## Shell completion

```bash
# zsh
mkdir -p ~/.zfunc
agent-figma completion zsh > ~/.zfunc/_agent-figma

# bash
agent-figma completion bash > ~/.agent-figma-completion.bash
```

Load the generated file in your shell configuration.
