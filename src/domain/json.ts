// Figma payloads arrive as unknown, and every reader of them needs the same three
// questions answered. Asking them in four places is how two of them drift.
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

export const stringAt = (value: unknown, key: string): string | undefined => {
  if (!isRecord(value)) return undefined
  const found = value[key]
  return typeof found === "string" ? found : undefined
}

export const numberAt = (value: unknown, key: string): number | undefined => {
  if (!isRecord(value)) return undefined
  const found = value[key]
  return typeof found === "number" ? found : undefined
}
