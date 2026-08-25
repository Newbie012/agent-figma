import { documentRoots } from "../domain/anatomy.js"
import { isRecord, numberAt } from "../domain/json.js"

const tokenAt = (node: Record<string, unknown>, key: string): string | undefined => {
  const tokens = node["tokens"]
  if (!isRecord(tokens)) return undefined
  const value = tokens[key]
  if (typeof value === "string") return value
  return Array.isArray(value) && typeof value[0] === "string" ? value[0] : undefined
}

interface Origin {
  readonly x: number
  readonly y: number
}

const originOf = (node: Record<string, unknown>): Origin | undefined => {
  const box = node["absoluteBoundingBox"]
  if (!isRecord(box)) return undefined
  const x = numberAt(box, "x")
  const y = numberAt(box, "y")
  return x === undefined || y === undefined ? undefined : { x, y }
}

// Figma answers in canvas coordinates, and a layer's place is only meaningful
// against the node that was asked for. Subtracting here is the difference
// between reading a design and transcribing one.
const position = (node: Record<string, unknown>, origin: Origin | undefined): string | undefined => {
  const own = originOf(node)
  if (own === undefined || origin === undefined) return undefined
  return `at=${round(own.x - origin.x)},${round(own.y - origin.y)}`
}

const isHidden = (node: Record<string, unknown>): boolean => node["visible"] === false

const size = (node: Record<string, unknown>): string | undefined => {
  const box = node["absoluteBoundingBox"]
  if (!isRecord(box)) return undefined
  const width = numberAt(box, "width")
  const height = numberAt(box, "height")
  if (width === undefined || height === undefined) return undefined
  return `${round(width)}x${round(height)}${chain(node)}`
}

// FILL means the number above was measured, not chosen, so the constraint
// that produced it belongs on the same line.
const chain = (node: Record<string, unknown>): string => {
  const sizing = node["sizing"]
  if (!isRecord(sizing)) return ""
  const own = sizing["horizontal"]
  const parent = isRecord(sizing["parent"]) ? sizing["parent"] : undefined
  const above = parent === undefined
    ? undefined
    : [parent["horizontal"], parent["width"] === undefined ? undefined : round(Number(parent["width"]))]
      .filter((part) => part !== undefined)
      .join(" ")
  const fixed = isRecord(sizing["constrainedBy"]) ? sizing["constrainedBy"] : undefined
  const parts = [
    typeof own === "string" ? `own=${own}` : undefined,
    above === undefined || above === "" ? undefined : `parent=${above}`,
    fixed === undefined ? undefined : `fixed by ${String(fixed["name"] ?? "a frame above")} ${fixed["width"] === undefined ? "" : round(Number(fixed["width"]))}`.trimEnd()
  ].filter((part): part is string => part !== undefined)
  return parts.length === 0 ? "" : ` (${parts.join(", ")})`
}

const round = (value: number): string => `${Math.round(value * 100) / 100}`

const layout = (node: Record<string, unknown>): string | undefined => {
  const mode = node["layoutMode"]
  if (mode === "VERTICAL") return "vertical"
  if (mode === "HORIZONTAL") return "horizontal"
  return undefined
}

const measure = (node: Record<string, unknown>, key: string): string | undefined => {
  const token = tokenAt(node, key)
  if (token !== undefined) return token
  const value = numberAt(node, key)
  return value === undefined ? undefined : round(value)
}

const padding = (node: Record<string, unknown>): string | undefined => {
  const sides = ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"].map((key) => measure(node, key))
  if (sides.every((side) => side === undefined)) return undefined
  const shown = sides.map((side) => side ?? "0")
  return [...new Set(shown)].length === 1 ? `pad=${shown[0]}` : `pad=${shown.join(" ")}`
}

const typography = (node: Record<string, unknown>): string | undefined => {
  const style = node["style"]
  if (!isRecord(style)) return undefined
  const fontSize = numberAt(style, "fontSize")
  const fontWeight = numberAt(style, "fontWeight")
  if (fontSize === undefined) return undefined
  return fontWeight === undefined ? `${round(fontSize)}` : `${round(fontSize)}/${fontWeight}`
}

const parts = (node: Record<string, unknown>, origin: Origin | undefined): readonly string[] => {
  const gap = measure(node, "itemSpacing")
  const radius = measure(node, "cornerRadius")
  const text = tokenAt(node, "text")
  const fill = tokenAt(node, "fills") ?? tokenAt(node, "fill")
  return [
    position(node, origin),
    size(node),
    layout(node),
    gap === undefined ? undefined : `gap=${gap}`,
    padding(node),
    radius === undefined ? undefined : `radius=${radius}`,
    text === undefined ? undefined : `text=${text}`,
    fill === undefined ? undefined : `fill=${fill}`,
    typography(node),
    isHidden(node) ? "hidden" : undefined
  ].filter((part): part is string => part !== undefined)
}

const line = (node: Record<string, unknown>, depth: number, origin: Origin | undefined): string => {
  const type = typeof node["type"] === "string" ? node["type"] : "NODE"
  const name = typeof node["name"] === "string" ? node["name"] : ""
  const head = `${"  ".repeat(depth)}${type}${name === "" ? "" : ` ${name}`}`
  const detail = parts(node, origin)
  return detail.length === 0 ? head : `${head}  ${detail.join("  ")}`
}

const lines = (
  node: Record<string, unknown>,
  depth: number,
  origin: Origin | undefined,
  includeHidden: boolean
): readonly string[] => {
  if (isHidden(node) && !includeHidden) return []
  const children = node["children"]
  const below = Array.isArray(children)
    ? children.flatMap((child) => (isRecord(child) ? lines(child, depth + 1, origin, includeHidden) : []))
    : []
  // The node that was asked for is the frame of reference, so it has no place of its own.
  return [line(node, depth, depth === 0 ? undefined : origin), ...below]
}

export interface TreeOptions {
  /** Layers Figma will not draw are left out, because reading one as real is a wrong conclusion. */
  readonly includeHidden?: boolean
}

export const renderTree = (data: unknown, options: TreeOptions = {}): string => {
  const rendered = documentRoots(data).flatMap((document) =>
    lines(document, 0, originOf(document), options.includeHidden === true)
  )
  return rendered.length === 0 ? "(no nodes)\n" : `${rendered.join("\n")}\n`
}
