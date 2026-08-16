import { documentRoots } from "../domain/anatomy.js"

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const numberAt = (node: Record<string, unknown>, key: string): number | undefined => {
  const value = node[key]
  return typeof value === "number" ? value : undefined
}

const tokenAt = (node: Record<string, unknown>, key: string): string | undefined => {
  const tokens = node["tokens"]
  if (!isRecord(tokens)) return undefined
  const value = tokens[key]
  if (typeof value === "string") return value
  return Array.isArray(value) && typeof value[0] === "string" ? value[0] : undefined
}

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
  const parts = [
    typeof own === "string" ? `own=${own}` : undefined,
    above === undefined || above === "" ? undefined : `parent=${above}`
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

const parts = (node: Record<string, unknown>): readonly string[] => {
  const gap = measure(node, "itemSpacing")
  const radius = measure(node, "cornerRadius")
  const text = tokenAt(node, "text")
  const fill = tokenAt(node, "fills") ?? tokenAt(node, "fill")
  return [
    size(node),
    layout(node),
    gap === undefined ? undefined : `gap=${gap}`,
    padding(node),
    radius === undefined ? undefined : `radius=${radius}`,
    text === undefined ? undefined : `text=${text}`,
    fill === undefined ? undefined : `fill=${fill}`,
    typography(node)
  ].filter((part): part is string => part !== undefined)
}

const line = (node: Record<string, unknown>, depth: number): string => {
  const type = typeof node["type"] === "string" ? node["type"] : "NODE"
  const name = typeof node["name"] === "string" ? node["name"] : ""
  const head = `${"  ".repeat(depth)}${type}${name === "" ? "" : ` ${name}`}`
  const detail = parts(node)
  return detail.length === 0 ? head : `${head}  ${detail.join("  ")}`
}

const lines = (node: Record<string, unknown>, depth: number): readonly string[] => {
  const children = node["children"]
  const below = Array.isArray(children)
    ? children.flatMap((child) => (isRecord(child) ? lines(child, depth + 1) : []))
    : []
  return [line(node, depth), ...below]
}

export const renderTree = (data: unknown): string => {
  const rendered = documentRoots(data).flatMap((document) => lines(document, 0))
  return rendered.length === 0 ? "(no nodes)\n" : `${rendered.join("\n")}\n`
}
