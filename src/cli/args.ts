import { UsageError } from "../domain/errors.js"
import type { ParsedArgs } from "./types.js"

const booleanFlags = new Set([
  "ancestors",
  "check",
  "help",
  "include-hidden",
  "json",
  "no-ancestors",
  "no-color",
  "no-open",
  "oauth",
  "pretty",
  "raw",
  "version",
  "yes"
])

const shortFlags: ReadonlyMap<string, string> = new Map([
  ["-h", "help"],
  ["-v", "version"]
])

export const parseArgs = (argv: readonly string[]): ParsedArgs => {
  const flags = new Map<string, string | boolean>()
  const positionals: string[] = []

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (token === undefined) continue
    const short = shortFlags.get(token)
    if (short !== undefined) {
      flags.set(short, true)
      continue
    }
    if (!token.startsWith("--") || token === "-") {
      positionals.push(token)
      continue
    }

    const raw = token.slice(2)
    const equals = raw.indexOf("=")
    const name = equals >= 0 ? raw.slice(0, equals) : raw
    if (name === "") {
      throw new UsageError({ message: "Invalid empty flag" })
    }
    if (equals >= 0) {
      flags.set(name, raw.slice(equals + 1))
      continue
    }
    if (booleanFlags.has(name)) {
      flags.set(name, true)
      continue
    }
    const value = argv[index + 1]
    if (value === undefined || value.startsWith("--")) {
      throw new UsageError({ message: `Missing value for --${name}`, argument: name })
    }
    flags.set(name, value)
    index += 1
  }

  return { tokens: argv, flags, positionals }
}

export const flagString = (parsed: ParsedArgs, name: string, fallback?: string): string | undefined => {
  const value = parsed.flags.get(name)
  return typeof value === "string" ? value : fallback
}

export const flagBoolean = (parsed: ParsedArgs, name: string): boolean =>
  parsed.flags.get(name) === true

export const requireFlag = (parsed: ParsedArgs, name: string): string => {
  const value = flagString(parsed, name)
  if (value === undefined) {
    throw new UsageError({ message: `Missing required --${name}`, argument: name })
  }
  return value
}

export const requirePositional = (parsed: ParsedArgs, index: number, label: string): string => {
  const value = parsed.positionals[index]
  if (value === undefined) {
    throw new UsageError({ message: `Missing required ${label}`, argument: label })
  }
  return value
}
