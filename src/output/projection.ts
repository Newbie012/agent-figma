import { UsageError } from "../domain/errors.js"

export const projectFields = (value: unknown, fields: string | undefined): unknown => {
  if (fields === undefined || fields.trim() === "") return value
  const paths = fields.split(",").map((field) => field.trim()).filter(Boolean)
  const projected: Record<string, unknown> = {}
  for (const path of paths) assignPath(projected, path, readPath(value, path))
  return projected
}

const readPath = (value: unknown, path: string): unknown => {
  let current = value
  for (const segment of path.split(".")) {
    if (segment === "") throw new UsageError({ message: "--fields paths cannot contain empty segments", argument: "fields" })
    if (Array.isArray(current)) {
      const index = Number(segment)
      if (!Number.isInteger(index) || index < 0) return undefined
      current = current[index]
    } else if (typeof current === "object" && current !== null && segment in current) {
      current = (current as Record<string, unknown>)[segment]
    } else {
      return undefined
    }
  }
  return current
}

const assignPath = (target: Record<string, unknown>, path: string, value: unknown): void => {
  const segments = path.split(".")
  let current = target
  for (const segment of segments.slice(0, -1)) {
    const existing = current[segment]
    if (typeof existing === "object" && existing !== null && !Array.isArray(existing)) {
      current = existing as Record<string, unknown>
    } else {
      const next: Record<string, unknown> = {}
      current[segment] = next
      current = next
    }
  }
  const last = segments.at(-1)
  if (last === undefined || last === "") throw new UsageError({ message: "--fields paths cannot contain empty segments", argument: "fields" })
  current[last] = value
}
