import { describe, expect, it } from "vitest"
import { InvalidFigmaUrl } from "../../src/domain/errors.js"
import { parseFigmaReference } from "../../src/domain/figma.js"

describe("Figma references", () => {
  it("accepts file keys and supported Figma products", () => {
    expect(parseFigmaReference("RawKey123")).toEqual({ fileKey: "RawKey123" })
    expect(parseFigmaReference("https://www.figma.com/board/FigJamKey/name?node-id=1-2")).toEqual({
      fileKey: "FigJamKey",
      nodeId: "1:2"
    })
  })

  it("rejects non-Figma and malformed URLs", () => {
    expect(() => parseFigmaReference("https://example.com/design/key/name")).toThrow(InvalidFigmaUrl)
    expect(() => parseFigmaReference("https://www.figma.com/community/file/123")).toThrow(InvalidFigmaUrl)
    expect(() => parseFigmaReference("https://www.figma.com/design/key/name?node-id=")).toThrow(InvalidFigmaUrl)
  })
})
