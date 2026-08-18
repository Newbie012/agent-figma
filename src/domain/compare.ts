import type { SourceFile } from "../ports/SourceCode.js"

export type ExpectationKind = "text-style" | "style" | "token" | "font-size" | "font-weight"

export interface Expectation {
  readonly kind: ExpectationKind
  readonly value: string
  readonly nodes: readonly string[]
  readonly nodeCount?: number
}

// A token used by forty text nodes does not need forty names to be found in the
// design, and a node's name is often its content, which can be a whole sentence.
const NAMES_SHOWN = 5
const NAME_ROOM = 40

export interface Finding extends Expectation {
  readonly found: boolean
  readonly matched?: string
  readonly file?: string
}

export interface Comparison {
  readonly findings: readonly Finding[]
  readonly missing: readonly Finding[]
  readonly summary: {
    readonly checked: number
    readonly missing: number
    readonly files: number
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const nameOf = (node: Record<string, unknown>): string => {
  const name = typeof node["name"] === "string" ? node["name"] : String(node["id"] ?? "a node")
  return name.length > NAME_ROOM ? `${name.slice(0, NAME_ROOM - 1)}…` : name
}

const documentsOf = (data: unknown): readonly Record<string, unknown>[] => {
  if (!isRecord(data)) return []
  const nodes = data["nodes"]
  if (isRecord(nodes)) {
    return Object.values(nodes)
      .map((entry) => (isRecord(entry) ? entry["document"] : undefined))
      .filter(isRecord)
  }
  const document = data["document"]
  return isRecord(document) ? [document] : []
}

const walk = (node: Record<string, unknown>, visit: (node: Record<string, unknown>) => void): void => {
  visit(node)
  const children = node["children"]
  if (!Array.isArray(children)) return
  for (const child of children) if (isRecord(child)) walk(child, visit)
}

// A variable that could not be resolved is an id, and no implementation is
// expected to mention an id. Expecting one would report a failure of the read
// as a failure of the code.
const resolved = (value: unknown): value is string =>
  typeof value === "string" && value !== "" && !value.startsWith("VariableID:")

const tokensOf = (node: Record<string, unknown>): readonly (readonly [ExpectationKind, string])[] => {
  const tokens = node["tokens"]
  if (!isRecord(tokens)) return []
  return Object.entries(tokens).flatMap(([usage, value]) => {
    const values = Array.isArray(value) ? value : [value]
    const kind: ExpectationKind = usage === "text" ? "text-style" : usage === "fill" || usage === "stroke" || usage === "effect" ? "style" : "token"
    return values.filter(resolved).map((name) => [kind, name] as const)
  })
}

// A text node that names a style is expected to be implemented by that style,
// not by the numbers it happens to resolve to. Expecting both reports a false
// miss for every component that does the right thing.
const typographyOf = (node: Record<string, unknown>): readonly (readonly [ExpectationKind, string])[] => {
  if (node["type"] !== "TEXT") return []
  const tokens = node["tokens"]
  if (isRecord(tokens) && resolved(tokens["text"])) return []
  const style = node["style"]
  if (!isRecord(style)) return []
  const size = typeof style["fontSize"] === "number" ? style["fontSize"] : undefined
  const weight = typeof style["fontWeight"] === "number" ? style["fontWeight"] : undefined
  return [
    ...(size === undefined ? [] : [["font-size", `${size}`] as const]),
    ...(weight === undefined ? [] : [["font-weight", `${weight}`] as const])
  ]
}

const expectationsOf = (data: unknown): readonly Expectation[] => {
  const collected = new Map<string, { kind: ExpectationKind; value: string; nodes: string[] }>()
  for (const document of documentsOf(data)) {
    walk(document, (node) => {
      for (const [kind, value] of [...tokensOf(node), ...typographyOf(node)]) {
        const key = `${kind}:${value}`
        const entry = collected.get(key) ?? { kind, value, nodes: [] }
        if (!entry.nodes.includes(nameOf(node))) entry.nodes.push(nameOf(node))
        collected.set(key, entry)
      }
    })
  }
  return [...collected.values()].map((entry) => ({
    kind: entry.kind,
    value: entry.value,
    nodes: entry.nodes.slice(0, NAMES_SHOWN),
    ...(entry.nodes.length > NAMES_SHOWN ? { nodeCount: entry.nodes.length } : {})
  }))
}

const escape = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// A token written `md/regular` in Figma is written a dozen ways in code. These
// are the spellings a design system actually uses; anything looser starts
// matching unrelated words and reports success it has not earned.
const spellings = (value: string): readonly string[] => {
  const parts = value.split("/")
  const camel = parts
    .map((part, index) => (index === 0 ? part : `${part.charAt(0).toUpperCase()}${part.slice(1)}`))
    .join("")
  return [...new Set([value, parts.join("-"), parts.join("_"), parts.join("."), camel])]
}

const fontSizePatterns = (value: string): readonly RegExp[] => {
  const rem = Number(value) / 16
  return [
    new RegExp(`\\b${escape(value)}px\\b`),
    new RegExp(`(?:font-size|fontSize)\\s*[:=]\\s*[^;,\\n]*?\\b${escape(value)}\\b`, "i"),
    new RegExp(`text-\\[${escape(value)}px\\]`),
    ...(Number.isFinite(rem) ? [new RegExp(`\\b${escape(`${rem}`)}rem\\b`)] : [])
  ]
}

const weightWords: Readonly<Record<string, readonly string[]>> = {
  "100": ["thin"], "200": ["extralight", "extra-light"], "300": ["light"], "400": ["normal", "regular"],
  "500": ["medium"], "600": ["semibold", "semi-bold"], "700": ["bold"], "800": ["extrabold", "extra-bold"],
  "900": ["black"]
}

const fontWeightPatterns = (value: string): readonly RegExp[] => [
  new RegExp(`(?:font-weight|fontWeight)\\s*[:=]\\s*[^;,\\n]*?\\b${escape(value)}\\b`, "i"),
  new RegExp(`font-${escape(value)}\\b`),
  ...(weightWords[value] ?? []).map((word) => new RegExp(`\\b${escape(word)}\\b`, "i"))
]

const patternsFor = (expectation: Expectation): readonly RegExp[] => {
  if (expectation.kind === "font-size") return fontSizePatterns(expectation.value)
  if (expectation.kind === "font-weight") return fontWeightPatterns(expectation.value)
  return spellings(expectation.value).map((spelling) => new RegExp(escape(spelling), "i"))
}

const lookFor = (expectation: Expectation, files: readonly SourceFile[]): Finding => {
  for (const file of files) {
    for (const pattern of patternsFor(expectation)) {
      const hit = pattern.exec(file.text)
      if (hit !== null) return { ...expectation, found: true, matched: hit[0], file: file.path }
    }
  }
  return { ...expectation, found: false }
}

export const compare = (data: unknown, files: readonly SourceFile[]): Comparison => {
  const findings = expectationsOf(data).map((expectation) => lookFor(expectation, files))
  const missing = findings.filter((finding) => !finding.found)
  return {
    findings,
    missing,
    summary: { checked: findings.length, missing: missing.length, files: files.length }
  }
}
