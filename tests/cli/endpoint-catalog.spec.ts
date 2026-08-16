import { describe, expect, it } from "vitest"
import { BundledEndpointCatalog } from "../../src/adapters/catalog/BundledEndpointCatalog.js"

describe("endpoint catalog", () => {
  it("describes only GET endpoints", () => {
    const catalog = new BundledEndpointCatalog()
    expect(catalog.describe("file.get")).toMatchObject({ method: "GET", safety: "read" })
    expect(catalog.describe("comment.post")).toBeNull()
    expect(catalog.list().every((endpoint) => endpoint.method === "GET")).toBe(true)
  })
})
