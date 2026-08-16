import { describe, expect, it } from "vitest"
import { parseArgs, requireFlag, requirePositional } from "../../src/cli/args.js"

describe("argument parsing", () => {
  it("supports equals flags and positional values", () => {
    const parsed = parseArgs(["file", "get", "key", "--depth=2", "--json"])
    expect(parsed.positionals).toEqual(["file", "get", "key"])
    expect(parsed.flags.get("depth")).toBe("2")
  })

  it("rejects empty and missing flags", () => {
    expect(() => parseArgs(["--"])).toThrow(/Invalid empty flag/)
    expect(() => parseArgs(["--profile"])).toThrow(/Missing value/)
    const parsed = parseArgs([])
    expect(() => requireFlag(parsed, "profile")).toThrow(/Missing required/)
    expect(() => requirePositional(parsed, 0, "FILE")).toThrow(/Missing required/)
  })
})
