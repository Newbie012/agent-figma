import type { ErrorEnvelope, SuccessEnvelope } from "../domain/figma.js"
import { isRecord } from "../domain/json.js"
import { painter, type PaintName } from "./paint.js"

interface HumanRenderOptions {
  readonly color: boolean
}


export const renderHumanEnvelope = (envelope: SuccessEnvelope, options: HumanRenderOptions = { color: false }): string => {
  const paint = painter(options.color)
  const metadata = [
    envelope.profile === null ? undefined : `profile ${envelope.profile}`,
    envelope.file_key === null ? undefined : `file ${envelope.file_key}`,
    envelope.paging.has_more ? `next ${envelope.paging.next_cursor ?? "cursor"}` : undefined
  ].filter((item): item is string => item !== undefined)
  const lines = [
    `${paint("green", "OK")} ${paint("bold", envelope.method)}`,
    ...(metadata.length === 0 ? [] : [paint("dim", metadata.join(" | "))]),
    ...envelope.warnings.map((warning) => `${paint("yellow", "Warning")}: ${warning}`),
    ...renderData(envelope.data, paint)
  ]
  return `${lines.join("\n")}\n`
}

export const renderHumanErrorEnvelope = (envelope: ErrorEnvelope, options: HumanRenderOptions = { color: false }): string => {
  const paint = painter(options.color)
  const error = envelope.error
  const usage = stringDetail(error.details, "usage")
  const alternatives = arrayDetail(error.details, "alternatives")
  return `${[
    `${paint("red", "Error")} ${paint("bold", error.type)}`,
    error.title,
    ...(error.retry_after_seconds === undefined ? [] : [`${paint("dim", "Retry after")} ${error.retry_after_seconds}s`]),
    ...(usage === undefined ? [] : ["", paint("cyan", "Usage"), `  ${usage}`]),
    ...(alternatives.length === 0 ? [] : ["", paint("cyan", "Commands"), ...alternatives.map((item) => `  agent-figma ${item}`)]),
    ...(error.suggestion === undefined ? [] : ["", paint("yellow", "Next"), `  ${error.suggestion}`]),
    "",
    `${paint("dim", "Trace")} ${error.trace_id}`
  ].join("\n")}\n`
}

const stringDetail = (details: Readonly<Record<string, unknown>> | undefined, key: string): string | undefined => {
  const value = details?.[key]
  return typeof value === "string" ? value : undefined
}

const arrayDetail = (details: Readonly<Record<string, unknown>> | undefined, key: string): readonly string[] => {
  const value = details?.[key]
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

type Finding = {
  readonly kind: string
  readonly value: string
  readonly nodes: readonly string[]
  readonly nodeCount?: number
  readonly found: boolean
  readonly file?: string
}

const isComparison = (value: unknown): value is {
  readonly findings: readonly Finding[]
  readonly summary: { readonly checked: number; readonly missing: number; readonly files: number }
} =>
  isRecord(value) && Array.isArray(value["findings"]) && isRecord(value["summary"])

// A comparison is a list of expectations, so it reads as one: what the design
// asks for, and whether the code says it anywhere.
const renderComparison = (
  comparison: { readonly findings: readonly Finding[]; readonly summary: { readonly checked: number; readonly missing: number; readonly files: number } },
  paint: (name: PaintName, value: string) => string
): readonly string[] => {
  const missing = comparison.findings.filter((finding) => !finding.found)
  const width = Math.max(0, ...comparison.findings.map((finding) => finding.value.length))
  const kinds = Math.max(0, ...comparison.findings.map((finding) => finding.kind.length))
  const line = (finding: Finding): string => {
    const mark = finding.found ? paint("green", "found  ") : paint("red", "missing")
    const more = finding.nodeCount === undefined ? "" : ` and ${finding.nodeCount - finding.nodes.length} more`
    const where = finding.found ? finding.file ?? "" : `${finding.nodes.join(", ")}${more}`
    return `  ${mark} ${pad(finding.value, width)}  ${paint("dim", pad(finding.kind, kinds))}  ${paint("dim", where)}`
  }
  return [
    "",
    paint("dim", `${comparison.summary.checked} expected, ${comparison.summary.missing} not mentioned, across ${comparison.summary.files} file${comparison.summary.files === 1 ? "" : "s"}`),
    "",
    ...comparison.findings.map(line),
    ...(missing.length === 0
      ? ["", paint("dim", "Every token and size the design asks for appears somewhere in the code read.")]
      : ["", paint("dim", "A mention is not proof of use, and a miss is not proof of a bug. Read the nodes named beside each miss.")])
  ]
}

const renderData = (value: unknown, paint: (name: PaintName, value: string) => string): readonly string[] => {
  if (isComparison(value)) return renderComparison(value, paint)
  if (Array.isArray(value)) return ["", ...renderArray(value, paint)]
  if (isRecord(value)) {
    const primary = findPrimaryArray(value)
    const excluded = new Set(primary === null ? [] : [primary.key])
    const fields = renderFields(value, excluded, paint)
    if (primary !== null) return [...(fields.length === 0 ? [] : ["", ...fields]), "", `${paint("cyan", labelFor(primary.key))} (${primary.items.length})`, ...renderArray(primary.items, paint)]
    if (fields.length > 0 && !hasComplex(value, excluded)) return ["", ...fields]
  }
  return ["", "data:", indent(JSON.stringify(value, null, 2))]
}

const findPrimaryArray = (record: Record<string, unknown>): { key: string; items: readonly unknown[] } | null => {
  for (const key of ["projects", "files", "comments", "versions", "components", "component_sets", "styles", "nodes", "items"]) {
    if (Array.isArray(record[key])) return { key, items: record[key] }
  }
  for (const [key, value] of Object.entries(record)) if (Array.isArray(value)) return { key, items: value }
  return null
}

const renderFields = (record: Record<string, unknown>, excluded: ReadonlySet<string>, paint: (name: PaintName, value: string) => string): readonly string[] => {
  const entries = Object.entries(record).filter(([key, value]) => !excluded.has(key) && value !== null && value !== undefined && isHumanValue(value))
  if (entries.length === 0) return []
  const width = Math.max(...entries.map(([key]) => labelFor(key).length))
  return entries.map(([key, value]) => `${paint("dim", pad(labelFor(key), width))}  ${formatValue(value)}`)
}

const renderArray = (values: readonly unknown[], paint: (name: PaintName, value: string) => string): readonly string[] => {
  if (values.length === 0) return ["(empty)"]
  if (!values.every(isRecord)) return [indent(JSON.stringify(values, null, 2))]
  const rows = values as readonly Record<string, unknown>[]
  const preferred = ["id", "key", "name", "handle", "type", "message", "description"]
  const discovered = new Set(rows.flatMap((row) => Object.keys(row).filter((key) => isScalar(row[key]))))
  const columns = [...preferred.filter((key) => discovered.has(key)), ...[...discovered].filter((key) => !preferred.includes(key))].slice(0, 5)
  if (columns.length === 0) return [indent(JSON.stringify(values, null, 2))]
  const body = rows.slice(0, 20).map((row) => columns.map((column) => truncate(formatScalar(row[column]), column === "message" || column === "description" ? 64 : 24)))
  const widths = columns.map((column, index) => Math.max(column.length, ...body.map((row) => row[index]?.length ?? 0)))
  return [
    paint("dim", columns.map((column, index) => pad(column, widths[index] ?? column.length)).join("  ")),
    paint("dim", widths.map((width) => "-".repeat(width)).join("  ")),
    ...body.map((row) => row.map((cell, index) => pad(cell, widths[index] ?? cell.length)).join("  ")),
    ...(values.length > 20 ? [paint("dim", `... ${values.length - 20} more`)] : [])
  ]
}

const hasComplex = (record: Record<string, unknown>, excluded: ReadonlySet<string>): boolean =>
  Object.entries(record).some(([key, value]) => !excluded.has(key) && value !== null && value !== undefined && !isHumanValue(value))
const isScalar = (value: unknown): value is boolean | number | string | null => value === null || ["boolean", "number", "string"].includes(typeof value)
const isHumanValue = (value: unknown): boolean => isScalar(value) || (Array.isArray(value) && value.every(isScalar))
const formatValue = (value: unknown): string => Array.isArray(value) ? (value.length === 0 ? "(none)" : value.map(formatScalar).join(", ")) : typeof value === "boolean" ? (value ? "yes" : "no") : formatScalar(value)
const formatScalar = (value: unknown): string => value === undefined ? "" : value === null ? "-" : String(value)
const labelFor = (key: string): string => key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/_/g, " ").split(" ").map((word) => word.toLowerCase() === "id" ? "ID" : word.charAt(0).toUpperCase() + word.slice(1)).join(" ")
const indent = (value: string): string => value.split("\n").map((line) => `  ${line}`).join("\n")
const pad = (value: string, width: number): string => value + " ".repeat(Math.max(0, width - value.length))
const truncate = (value: string, width: number): string => value.length > width ? `${value.slice(0, width - 3)}...` : value
