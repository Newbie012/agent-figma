import { createRequire } from "node:module"
import type { CommandMetadata, FlagMetadata } from "./types.js"

const require = createRequire(import.meta.url)
declare const __CLI_VERSION__: string | undefined
const packageJson = typeof __CLI_VERSION__ === "string" ? { version: __CLI_VERSION__ } : (require("../../package.json") as { version?: string })

export const PRIMARY_COMMAND_NAME = "agent-figma"
export const SHORT_COMMAND_NAME = "afg"
const COMMAND_NAMES = [PRIMARY_COMMAND_NAME, SHORT_COMMAND_NAME] as const
export const CLI_VERSION = packageJson.version ?? "0.0.0"

const DISCOVERY = "Discovery"
const AUTHENTICATION = "Authentication"
const FIGMA_READS = "Figma reads"
const REST_ACCESS = "REST access"

export const flagCatalog: Readonly<Record<string, FlagMetadata>> = {
  "--ancestors": { summary: "Also read the frames above the node, so a FILL size shows what fixes it." },
  "--auth-url-out": { value: "PATH", summary: "Write the authorization URL to a file for a headless handoff." },
  "--check": { summary: "Report what would happen and run nothing. Always exits 0." },
  "--client-id": { value: "ID", summary: "Figma app client id, for self-hosted OAuth." },
  "--code": { value: "PATH[,PATH]", summary: "Files or directories that implement the node. Read locally, never uploaded." },
  "--client-secret": { value: "SECRET", summary: "Figma app client secret. Used for this process and never stored." },
  "--depth": { value: "N", summary: "Bound how deep the document tree is read." },
  "--family": { value: "NAME", summary: "Only endpoints in this family." },
  "--fields": { value: "a,b.c", summary: "Project the data down to the named paths." },
  "--format": { value: "json|ndjson|table|tree", summary: "Choose the output representation. `tree` is one readable line per node." },
  "--help": { summary: "Print this page. Add --json for the same as metadata." },
  "--id": { value: "NODE_ID", summary: "The node to read, when the URL does not carry one." },
  "--include-hidden": { summary: "Keep layers the design does not draw in `--format tree`, marked hidden." },
  "--ids": { value: "ID[,ID]", summary: "Node ids, written 1:2 or the 1-2 form a Figma URL uses." },
  "--json": { summary: "Answer with the JSON envelope, whatever stdout is attached to." },
  "--no-ancestors": { summary: "Skip the extra read that names the frames above the node." },
  "--no-color": { summary: "Leave terminal colour off." },
  "--no-open": { summary: "Print the authorization URL instead of opening a browser." },
  "--out": { value: "PATH", summary: "Write the rendered image here instead of answering with its URL." },
  "--oauth": { summary: "Use self-hosted OAuth with your own Figma app credentials." },
  "--payload": { value: "JSON", summary: "JSON object of path and query values for the operation." },
  "--pretty": { summary: "Indent JSON output." },
  "--profile": { value: "NAME", summary: "Named auth profile. Defaults to `default`." },
  "--raw": { summary: "Print response data without the success envelope." },
  "--redirect-uri": { value: "URI", summary: "Redirect URI registered on the Figma app, for self-hosted OAuth." },
  "--scale": { value: "N", summary: "Render scale, between 0.01 and 4." },
  "--scopes": { value: "LIST", summary: "Comma-separated read scopes to request." },
  "--timeout-ms": { value: "N", summary: "How long to wait for the browser callback." },
  "--token": { value: "TOKEN", summary: "Store this personal access token instead of starting OAuth." },
  "--version": { summary: "Print the version and exit." },
  "--yes": { summary: "Confirm deleting the local profile." }
}

export const universalFlags: readonly string[] = [
  "--fields",
  "--format",
  "--help",
  "--json",
  "--no-color",
  "--pretty",
  "--profile",
  "--raw",
  "--version"
]

export const commandMetadata: readonly CommandMetadata[] = [
  command(["describe"], "Print the full command catalog as JSON.", DISCOVERY, { flags: ["--json"], output: "command metadata", examples: ["agent-figma describe --json"] }),
  command(["completion"], "Generate a shell completion script.", DISCOVERY, { args: ["bash|zsh"], output: "shell completion script", examples: ["agent-figma completion zsh > ~/.zfunc/_agent-figma"] }),
  command(["auth", "status"], "Show the active Figma profile.", AUTHENTICATION, { flags: ["--profile", "--json"], output: "sanitized profile status", examples: ["agent-figma auth status --json"] }),
  command(["auth", "login"], "Connect a Figma profile with a personal access token, or with browser OAuth through your own relay.", AUTHENTICATION, { flags: ["--token", "--profile", "--scopes", "--oauth", "--client-id", "--client-secret", "--redirect-uri", "--no-open", "--auth-url-out", "--timeout-ms", "--json"], output: "sanitized profile status", examples: ["agent-figma auth login", "agent-figma auth login --token \"$FIGMA_TOKEN\" --json"] }),
  command(["auth", "scopes"], "Show scopes recorded for the active profile.", AUTHENTICATION, { flags: ["--profile", "--json"], output: "scope list", examples: ["agent-figma auth scopes --json"] }),
  command(["auth", "profiles", "list"], "List local Figma profiles.", AUTHENTICATION, { flags: ["--json"], output: "profile list", examples: ["agent-figma auth profiles list --json"] }),
  command(["auth", "logout"], "Delete a local Figma profile.", AUTHENTICATION, { flags: ["--profile", "--yes", "--json"], required: ["--yes"], safety: "local-destructive", output: "deleted profile status", examples: ["agent-figma auth logout --yes --json"] }),
  command(["auth", "test"], "Test the active Figma profile.", AUTHENTICATION, { flags: ["--profile", "--json"], endpoints: ["GET /v1/me"], scopes: ["current_user:read"], output: "Figma user identity", examples: ["agent-figma auth test --json"] }),
  command(["user", "get"], "Show the current Figma user.", FIGMA_READS, { flags: ["--profile", "--json", "--fields"], endpoints: ["GET /v1/me"], scopes: ["current_user:read"], output: "Figma user", examples: ["agent-figma user get --json"] }),
  command(["team", "projects", "list"], "List projects in a Figma team.", FIGMA_READS, { args: ["TEAM_ID"], flags: ["--profile", "--json", "--format", "--fields"], endpoints: ["GET /v1/teams/:team_id/projects"], scopes: ["projects:read"], output: "project list", examples: ["agent-figma team projects list 123 --json"] }),
  command(["project", "files", "list"], "List files in a Figma project.", FIGMA_READS, { args: ["PROJECT_ID"], flags: ["--profile", "--json", "--format", "--fields"], endpoints: ["GET /v1/projects/:project_id/files"], scopes: ["files:read"], output: "file list", examples: ["agent-figma project files list 123 --json"] }),
  command(["file", "get"], "Read a Figma file, optionally bounded by depth.", FIGMA_READS, { args: ["FILE_OR_URL"], flags: ["--profile", "--depth", "--json", "--pretty", "--format", "--include-hidden", "--fields"], endpoints: ["GET /v1/files/:key"], scopes: ["file_content:read"], output: "Figma file", examples: ["agent-figma file get FIGMA_URL --depth 2 --json"] }),
  command(["file", "nodes", "get"], "Read multiple nodes from a Figma file.", FIGMA_READS, { args: ["FILE_OR_URL"], flags: ["--ids", "--depth", "--ancestors", "--profile", "--json", "--format", "--include-hidden", "--fields"], required: ["--ids"], endpoints: ["GET /v1/files/:key/nodes"], scopes: ["file_content:read"], output: "Figma nodes", examples: ["agent-figma file nodes get FIGMA_URL --ids 1:2,3:4 --json"] }),
  command(["node", "get"], "Read one node from a Figma file or node URL.", FIGMA_READS, { args: ["FILE_OR_URL"], flags: ["--id", "--depth", "--no-ancestors", "--profile", "--json", "--pretty", "--format", "--include-hidden", "--fields"], endpoints: ["GET /v1/files/:key/nodes"], scopes: ["file_content:read"], output: "Figma node", examples: ["agent-figma node get FIGMA_NODE_URL --json"] }),
  command(["node", "compare"], "Compare a node against the code that implements it.", FIGMA_READS, { args: ["FILE_OR_URL"], flags: ["--code", "--id", "--profile", "--json", "--fields"], required: ["--code"], endpoints: ["GET /v1/files/:key/nodes"], scopes: ["file_content:read"], output: "the design's expectations, and which the code never mentions", examples: ["agent-figma node compare FIGMA_NODE_URL --code src/components/Panel.tsx,src/styles"] }),
  command(["file", "comments", "list"], "List comments on a Figma file.", FIGMA_READS, { args: ["FILE_OR_URL"], flags: ["--profile", "--json", "--format", "--fields"], endpoints: ["GET /v1/files/:file_key/comments"], scopes: ["file_comments:read"], output: "comment list", examples: ["agent-figma file comments list FIGMA_URL --json"] }),
  command(["file", "versions", "list"], "List versions of a Figma file.", FIGMA_READS, { args: ["FILE_OR_URL"], flags: ["--profile", "--json", "--format", "--fields"], endpoints: ["GET /v1/files/:file_key/versions"], scopes: ["file_versions:read"], output: "version list", examples: ["agent-figma file versions list FIGMA_URL --json"] }),
  command(["image", "render"], "Render nodes from a Figma file.", FIGMA_READS, { args: ["FILE_OR_URL"], flags: ["--ids", "--format", "--scale", "--out", "--profile", "--json", "--fields"], required: ["--ids"], endpoints: ["GET /v1/images/:key"], scopes: ["file_content:read"], output: "rendered image URLs", examples: ["agent-figma image render FIGMA_URL --ids 1:2 --format png --json"] }),
  command(["component", "get"], "Show a published component.", FIGMA_READS, { args: ["COMPONENT_KEY"], flags: ["--profile", "--json", "--fields"], endpoints: ["GET /v1/components/:key"], scopes: ["library_assets:read"], output: "component metadata", examples: ["agent-figma component get KEY --json"] }),
  command(["component-set", "get"], "Show a published component set.", FIGMA_READS, { args: ["COMPONENT_SET_KEY"], flags: ["--profile", "--json", "--fields"], endpoints: ["GET /v1/component_sets/:key"], scopes: ["library_assets:read"], output: "component set metadata", examples: ["agent-figma component-set get KEY --json"] }),
  command(["style", "get"], "Show a published style.", FIGMA_READS, { args: ["STYLE_KEY"], flags: ["--profile", "--json", "--fields"], endpoints: ["GET /v1/styles/:key"], scopes: ["library_assets:read"], output: "style metadata", examples: ["agent-figma style get KEY --json"] }),
  command(["upgrade"], "Upgrade this install to the newest alpha, using whatever installed it.", DISCOVERY, { flags: ["--check", "--json"], output: "what was installed, or the command that would do it", examples: ["agent-figma upgrade", "agent-figma upgrade --check --json"] }),
  command(["api", "call"], "Call a bundled Figma GET operation with a JSON payload.", REST_ACCESS, { args: ["OPERATION"], flags: ["--payload", "--profile", "--raw", "--format", "--fields", "--json"], output: "Figma REST response", examples: ["agent-figma api call file.get --payload '{\"key\":\"abc\",\"depth\":2}' --json"] }),
  command(["api", "endpoints", "list"], "List bundled Figma REST endpoint metadata.", REST_ACCESS, { flags: ["--family", "--json", "--format"], output: "endpoint metadata list", examples: ["agent-figma api endpoints list --family file --json"] }),
  command(["api", "endpoint", "describe"], "Describe one bundled Figma REST operation.", REST_ACCESS, { args: ["OPERATION"], flags: ["--json"], output: "endpoint metadata", examples: ["agent-figma api endpoint describe file.get --json"] })
]

function command(path: readonly string[], summary: string, group: string, options: Omit<CommandMetadata, "path" | "summary" | "group" | "safety"> & { safety?: CommandMetadata["safety"] }): CommandMetadata {
  return { path, summary, group, safety: options.safety ?? "read", ...options }
}

export const commandGroups: readonly string[] = [...new Set(commandMetadata.map((item) => item.group))]

export const describeAllCommands = () => ({ name: PRIMARY_COMMAND_NAME, aliases: [SHORT_COMMAND_NAME], version: CLI_VERSION, read_only: true, commands: commandMetadata })
export const findCommandMetadata = (path: readonly string[]) => commandMetadata.find((item) => item.path.join(" ") === path.join(" ")) ?? null

const commandNames: readonly string[] = commandMetadata.map((item) => item.path.join(" "))

export const commandsUnder = (path: readonly string[]): readonly CommandMetadata[] => {
  if (path.length === 0) return commandMetadata
  const prefix = `${path.join(" ")} `
  return commandMetadata.filter((item) => item.path.join(" ").startsWith(prefix))
}

const nearestCommandName = (name: string): string | undefined => {
  const scored = commandNames
    .map((known) => ({ known, gap: distance(name, known) }))
    .sort((left, right) => left.gap - right.gap)[0]
  const room = Math.max(2, Math.floor(name.length / 4))
  return scored !== undefined && scored.gap <= room ? scored.known : undefined
}

const longestPath = Math.max(...commandMetadata.map((item) => item.path.length))

export const commandPathOf = (positionals: readonly string[]): readonly string[] => {
  for (let length = Math.min(longestPath, positionals.length); length > 0; length -= 1) {
    const candidate = positionals.slice(0, length)
    if (findCommandMetadata(candidate) !== null) return candidate
  }
  return positionals
}

export const suggestCommand = (positionals: readonly string[]): {
  readonly didYouMean?: string
  readonly alternatives?: readonly string[]
} => {
  const verbs = commandsUnder(positionals.slice(0, 1)).map((item) => item.path.join(" "))
  if (verbs.length > 0) return { alternatives: verbs }
  for (let length = Math.min(longestPath, positionals.length); length > 0; length -= 1) {
    const nearest = nearestCommandName(positionals.slice(0, length).join(" "))
    if (nearest !== undefined) return { didYouMean: nearest }
  }
  return {}
}

export const flagsFor = (path: readonly string[]): readonly string[] => {
  const found = findCommandMetadata(path)
  const declared = found?.flags ?? commandsUnder(path).flatMap((item) => item.flags ?? [])
  return [...new Set([...declared, ...universalFlags])]
}

export const nearestFlag = (name: string, known: readonly string[]): string | undefined => {
  const scored = known
    .map((candidate) => ({ candidate, gap: distance(`--${name}`, candidate) }))
    .sort((left, right) => left.gap - right.gap)[0]
  return scored !== undefined && scored.gap <= 2 ? scored.candidate : undefined
}

export const signatureOf = (found: CommandMetadata): string =>
  [PRIMARY_COMMAND_NAME, ...found.path, ...(found.args ?? [])].join(" ")

export const usageOf = (found: CommandMetadata): string =>
  [signatureOf(found), ...(found.flags ?? []).map((flag) => flagUsage(flag, isRequired(found, flag)))].join(" ")

export const isRequired = (found: CommandMetadata, flag: string): boolean =>
  (found.required ?? []).includes(flag)

const flagUsage = (flag: string, required: boolean): string => {
  const value = flagCatalog[flag]?.value
  const spelled = value === undefined ? flag : `${flag} ${value}`
  return required ? spelled : `[${spelled}]`
}

const distance = (left: string, right: string): number => {
  const previous = Array.from({ length: right.length + 1 }, (_, at) => at)
  for (let row = 1; row <= left.length; row += 1) {
    let corner = previous[0] ?? 0
    previous[0] = row
    for (let column = 1; column <= right.length; column += 1) {
      const kept = previous[column] ?? 0
      const cost = left[row - 1] === right[column - 1] ? 0 : 1
      previous[column] = Math.min(kept + 1, (previous[column - 1] ?? 0) + 1, corner + cost)
      corner = kept
    }
  }
  return previous[right.length] ?? 0
}

export const renderCompletion = (shell: string): string => {
  const words = [...new Set(commandMetadata.flatMap((item) => item.path))]
  if (shell === "bash") return `complete -W '${words.join(" ")}' ${COMMAND_NAMES.join(" ")}\n`
  if (shell === "zsh") return [`#compdef ${COMMAND_NAMES.join(" ")}`, "_agent_figma_commands=(", ...commandMetadata.map((item) => `  '${item.path.join(" ")}:${item.summary.replace(/'/g, "")}'`), ")", `_describe '${PRIMARY_COMMAND_NAME} command' _agent_figma_commands`, ""].join("\n")
  return ""
}
