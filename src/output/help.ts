import {
  CLI_VERSION,
  commandsUnder,
  findCommandMetadata,
  flagCatalog,
  isRequired,
  PRIMARY_COMMAND_NAME,
  SHORT_COMMAND_NAME,
  signatureOf,
  usageOf
} from "../cli/metadata.js"
import type { CommandMetadata } from "../cli/types.js"
import { painter, type Paint } from "./paint.js"

const TAGLINE = "Read Figma context from the command line. Every command is read-only."

const pad = (value: string, width: number): string => value + " ".repeat(Math.max(1, width - value.length))

export const renderBanner = (color = false): string => {
  const paint = painter(color)
  return [
    `${paint("bold", PRIMARY_COMMAND_NAME)} ${paint("dim", CLI_VERSION)}`,
    paint("dim", TAGLINE),
    "",
    `${paint("dim", pad("Use", 8))}${paint("cyan", `${PRIMARY_COMMAND_NAME} <command>`)} ${paint("dim", "[--json]")}`,
    `${paint("dim", pad("Alias", 8))}${SHORT_COMMAND_NAME}`,
    `${paint("dim", pad("Output", 8))}readable in terminals; JSON for pipes and --json`,
    "",
    paint("yellow", "Start here"),
    `  ${paint("cyan", "agent-figma auth login")} --token "$FIGMA_TOKEN"`,
    `  ${paint("cyan", "agent-figma node get")} FIGMA_NODE_URL --format tree`,
    `  ${paint("cyan", "agent-figma node compare")} FIGMA_NODE_URL --code src/components/Panel.tsx`,
    "",
    paint("dim", `Run \`${PRIMARY_COMMAND_NAME} --help\` for every command, \`${PRIMARY_COMMAND_NAME} COMMAND --help\` for one,`),
    paint("dim", `or \`${PRIMARY_COMMAND_NAME} describe --json\` for the same catalog as JSON.`),
    ""
  ].join("\n")
}

export const renderHumanHelp = (path: readonly string[] = [], color = false): string => {
  const paint = painter(color)
  const found = findCommandMetadata(path)
  if (found !== null) return renderCommandHelp(found, paint)
  const visible = commandsUnder(path)
  return visible.length === 0
    ? renderCommandList(commandsUnder([]), [], paint)
    : renderCommandList(visible, path, paint)
}

const renderCommandHelp = (found: CommandMetadata, paint: Paint): string => [
  paint("bold", signatureOf(found)),
  "",
  found.summary,
  "",
  paint("yellow", "Usage"),
  `  ${paint("cyan", usageOf(found))}`,
  ...section("Flags", flagLines(found, paint), paint),
  ...section("Reads", (found.endpoints ?? []).map((endpoint) => paint("cyan", endpoint)), paint),
  ...section("Scopes", found.scopes === undefined ? [] : [paint("cyan", found.scopes.join(", "))], paint),
  ...section("Examples", found.examples.map((example) => paint("cyan", example)), paint),
  "",
  `Answers ${found.output}${found.safety === "read" ? "" : paint("yellow", " [destructive: deletes local state]")}.`,
  ""
].join("\n")

const flagLines = (found: CommandMetadata, paint: Paint): readonly string[] => {
  const flags = found.flags ?? []
  const width = Math.max(0, ...flags.map((flag) => flagName(flag).length)) + 2
  return flags.map((flag) => {
    const summary = flagCatalog[flag]?.summary ?? ""
    const marker = isRequired(found, flag) ? paint("yellow", " (required)") : ""
    return `${paint("cyan", pad(flagName(flag), width))}${summary}${marker}`.trimEnd()
  })
}

const renderCommandList = (
  visible: readonly CommandMetadata[],
  path: readonly string[],
  paint: Paint
): string => {
  const groups = [...new Set(visible.map((item) => item.group))]
  const width = Math.max(...visible.map((item) => item.path.join(" ").length)) + 2
  const line = (item: CommandMetadata): string =>
    `  ${paint("cyan", pad(item.path.join(" "), width))}${item.summary}${item.safety === "read" ? "" : paint("yellow", " [destructive]")}`
  return [
    `${paint("bold", PRIMARY_COMMAND_NAME)} ${paint("dim", CLI_VERSION)}`,
    paint("dim", TAGLINE),
    "",
    paint("yellow", "Usage"),
    `  ${paint("cyan", `${PRIMARY_COMMAND_NAME} ${path.length === 0 ? "COMMAND" : `${path.join(" ")} COMMAND`}`)} [flags]`,
    "",
    ...groups.flatMap((group) => [
      paint("yellow", group),
      ...visible.filter((item) => item.group === group).map(line),
      ""
    ]),
    paint("dim", `Run \`${PRIMARY_COMMAND_NAME} COMMAND --help\` for what a command needs, or \`${PRIMARY_COMMAND_NAME} describe --json\` for the same as JSON.`),
    ""
  ].join("\n")
}

const section = (title: string, lines: readonly string[], paint: Paint): readonly string[] =>
  lines.length === 0 ? [] : ["", paint("yellow", title), ...lines.map((line) => (line.startsWith("  ") ? line : `  ${line}`))]

const flagName = (flag: string): string => {
  const value = flagCatalog[flag]?.value
  return value === undefined ? flag : `${flag} ${value}`
}
