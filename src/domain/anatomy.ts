import { isRecord, numberAt, stringAt } from "./json.js"

export interface ParentSizing {
  readonly name?: string
  readonly horizontal?: string
  readonly vertical?: string
  readonly width?: number
  readonly height?: number
}

export interface Ancestor {
  readonly id: string
  readonly name?: string
  readonly type?: string
  readonly layoutMode?: string
  readonly horizontal?: string
  readonly vertical?: string
  readonly width?: number
}

export interface AnatomySources {
  readonly variables: Readonly<Record<string, string>>
  readonly ancestors: Readonly<Record<string, readonly Ancestor[]>>
}

const aliasId = (value: unknown): string | undefined => {
  if (!isRecord(value)) return undefined
  const id = value["id"]
  return typeof id === "string" ? id : undefined
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

const stylesOf = (data: unknown): Readonly<Record<string, string>> => {
  const collected: Record<string, string> = {}
  const merge = (value: unknown) => {
    if (!isRecord(value)) return
    for (const [id, style] of Object.entries(value)) {
      if (isRecord(style) && typeof style["name"] === "string") collected[id] = style["name"]
    }
  }
  if (!isRecord(data)) return collected
  merge(data["styles"])
  const nodes = data["nodes"]
  if (isRecord(nodes)) {
    for (const entry of Object.values(nodes)) if (isRecord(entry)) merge(entry["styles"])
  }
  return collected
}

export const walkNodes = (node: Record<string, unknown>, visit: (node: Record<string, unknown>) => void): void => {
  visit(node)
  const children = node["children"]
  if (!Array.isArray(children)) return
  for (const child of children) if (isRecord(child)) walkNodes(child, visit)
}

export const collectVariableIds = (data: unknown): readonly string[] => {
  const found = new Set<string>()
  for (const document of documentsOf(data)) {
    walkNodes(document, (node) => {
      const bound = node["boundVariables"]
      if (!isRecord(bound)) return
      for (const value of Object.values(bound)) {
        const items = Array.isArray(value) ? value : [value]
        for (const item of items) {
          const id = aliasId(item)
          if (id !== undefined) found.add(id)
        }
      }
    })
  }
  return [...found]
}

export const variableNames = (payload: unknown): Readonly<Record<string, string>> => {
  const meta = isRecord(payload) ? payload["meta"] : undefined
  const variables = isRecord(meta) ? meta["variables"] : undefined
  if (!isRecord(variables)) return {}
  const named: Record<string, string> = {}
  for (const [id, variable] of Object.entries(variables)) {
    if (isRecord(variable) && typeof variable["name"] === "string") named[id] = variable["name"]
  }
  return named
}

const variableTokens = (
  bound: unknown,
  variables: Readonly<Record<string, string>>
): Readonly<Record<string, string | readonly string[]>> => {
  if (!isRecord(bound)) return {}
  const named: Record<string, string | readonly string[]> = {}
  for (const [property, value] of Object.entries(bound)) {
    if (Array.isArray(value)) {
      const items = value.map(aliasId).filter((id): id is string => id !== undefined)
      if (items.length > 0) named[property] = items.map((id) => variables[id] ?? id)
      continue
    }
    const id = aliasId(value)
    if (id !== undefined) named[property] = variables[id] ?? id
  }
  return named
}

const styleTokens = (
  styles: unknown,
  known: Readonly<Record<string, string>>
): Readonly<Record<string, string>> => {
  if (!isRecord(styles)) return {}
  const named: Record<string, string> = {}
  for (const [usage, id] of Object.entries(styles)) {
    if (typeof id !== "string") continue
    const name = known[id]
    if (name !== undefined) named[usage] = name
  }
  return named
}

const present = <A>(key: string, value: A | undefined): Readonly<Record<string, A>> =>
  value === undefined ? {} : { [key]: value }

const parentOf = (node: Record<string, unknown>): ParentSizing => ({
  ...present("name", stringAt(node, "name")),
  ...present("horizontal", stringAt(node, "layoutSizingHorizontal")),
  ...present("vertical", stringAt(node, "layoutSizingVertical")),
  ...present("width", numberAt(node["absoluteBoundingBox"], "width"))
})

const sizingOf = (
  node: Record<string, unknown>,
  parent: ParentSizing | undefined,
  constrainedBy?: ParentSizing
): Readonly<Record<string, unknown>> => {
  const width = numberAt(node["absoluteBoundingBox"], "width")
  const height = numberAt(node["absoluteBoundingBox"], "height")
  const horizontal = stringAt(node, "layoutSizingHorizontal")
  const vertical = stringAt(node, "layoutSizingVertical")
  const named = parent === undefined || Object.keys(parent).length === 0 ? {} : { parent }
  return {
    ...present("width", width),
    ...present("height", height),
    ...present("horizontal", horizontal),
    ...present("vertical", vertical),
    ...named,
    ...present("constrainedBy", constrainedBy)
  }
}

const annotate = (
  node: Record<string, unknown>,
  styles: Readonly<Record<string, string>>,
  sources: AnatomySources,
  parent: ParentSizing | undefined,
  constrainedBy?: ParentSizing
): Record<string, unknown> => {
  const children = node["children"]
  const own = parentOf(node)
  const walked = Array.isArray(children)
    ? { children: children.map((child) => (isRecord(child) ? annotate(child, styles, sources, own) : child)) }
    : {}
  const tokens = {
    ...styleTokens(node["styles"], styles),
    ...variableTokens(node["boundVariables"], sources.variables)
  }
  const sizing = sizingOf(node, parent, constrainedBy)
  return {
    ...node,
    ...walked,
    ...(Object.keys(tokens).length === 0 ? {} : { tokens }),
    ...(Object.keys(sizing).length === 0 ? {} : { sizing })
  }
}

const closestParent = (chain: readonly Ancestor[]): ParentSizing | undefined => {
  const nearest = chain[chain.length - 1]
  if (nearest === undefined) return undefined
  const parent = {
    ...present("name", nearest.name),
    ...present("horizontal", nearest.horizontal),
    ...present("vertical", nearest.vertical),
    ...present("width", nearest.width)
  }
  return Object.keys(parent).length === 0 ? undefined : parent
}

// A FILL parent is as measured as the node is. The number was chosen by the
// nearest frame above that is FIXED, which can be several frames up.
const fixedAbove = (chain: readonly Ancestor[]): ParentSizing | undefined => {
  const found = [...chain].reverse().find((ancestor) => ancestor.horizontal === "FIXED")
  if (found === undefined || found === chain[chain.length - 1]) return undefined
  return {
    ...present("name", found.name),
    ...present("horizontal", found.horizontal),
    ...present("width", found.width)
  }
}

export const annotateAnatomy = (data: unknown, sources: AnatomySources): unknown => {
  if (!isRecord(data)) return data
  const styles = stylesOf(data)
  const nodes = data["nodes"]
  if (isRecord(nodes)) {
    return {
      ...data,
      nodes: Object.fromEntries(Object.entries(nodes).map(([id, entry]) => {
        if (!isRecord(entry) || !isRecord(entry["document"])) return [id, entry]
        const chain = sources.ancestors[id] ?? []
        return [id, {
          ...entry,
          ...(chain.length === 0 ? {} : { ancestors: chain }),
          document: annotate(entry["document"], styles, sources, closestParent(chain), fixedAbove(chain))
        }]
      }))
    }
  }
  const document = data["document"]
  return isRecord(document) ? { ...data, document: annotate(document, styles, sources, undefined) } : data
}

const ancestorOf = (node: Record<string, unknown>): Ancestor => ({
  id: stringAt(node, "id") ?? "",
  ...present("name", stringAt(node, "name")),
  ...present("type", stringAt(node, "type")),
  ...present("layoutMode", stringAt(node, "layoutMode")),
  ...present("horizontal", stringAt(node, "layoutSizingHorizontal")),
  ...present("vertical", stringAt(node, "layoutSizingVertical")),
  ...present("width", numberAt(node["absoluteBoundingBox"], "width"))
})

const findChain = (
  node: Record<string, unknown>,
  wanted: string,
  above: readonly Record<string, unknown>[]
): readonly Record<string, unknown>[] | undefined => {
  if (stringAt(node, "id") === wanted) return above
  const children = node["children"]
  if (!Array.isArray(children)) return undefined
  for (const child of children) {
    if (!isRecord(child)) continue
    const found = findChain(child, wanted, [...above, node])
    if (found !== undefined) return found
  }
  return undefined
}

export const ancestorChain = (branch: unknown, nodeId: string): readonly Ancestor[] => {
  const document = isRecord(branch) ? branch["document"] : undefined
  if (!isRecord(document)) return []
  const chain = findChain(document, nodeId, [])
  if (chain === undefined) return []
  return chain.filter((node) => stringAt(node, "type") !== "DOCUMENT").map(ancestorOf)
}

export const documentRoots = documentsOf
