import { describe, expect, it } from "vitest"
import { serializeJson } from "../../src/output/envelope.js"

describe("machine output", () => {
  it("is compact by default and pretty on request", () => {
    expect(serializeJson({ ok: true, data: { id: "1:2" } }, false)).toBe('{"ok":true,"data":{"id":"1:2"}}\n')
    expect(serializeJson({ ok: true }, true)).toContain('\n  "ok": true\n')
  })
})
