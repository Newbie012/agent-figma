import { describe, expect, it } from "vitest"
import { projectFields } from "../../src/output/projection.js"

describe("field projection", () => {
  it("projects nested paths", () => {
    expect(projectFields({ name: "Kit", document: { id: "0:0", name: "Root" } }, "name,document.id")).toEqual({
      name: "Kit",
      document: { id: "0:0" }
    })
  })
})
