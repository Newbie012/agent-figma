import { describe, expect, it } from "vitest"
import { FigmaCliTestDriver } from "../../src/testing/driver.js"

describe("read-only command surface", () => {
  it.each([
    {
      args: ["user", "get", "--json"],
      path: "/v1/me",
      query: undefined,
      data: { id: "1", handle: "Ada" },
      method: "user.get"
    },
    {
      args: ["team", "projects", "list", "42", "--json"],
      path: "/v1/teams/42/projects",
      query: undefined,
      data: { projects: [{ id: "7", name: "Core" }] },
      method: "team.projects.list"
    },
    {
      args: ["project", "files", "list", "7", "--json"],
      path: "/v1/projects/7/files",
      query: undefined,
      data: { files: [{ key: "abc", name: "UI" }] },
      method: "project.files.list"
    },
    {
      args: ["file", "comments", "list", "abc", "--json"],
      path: "/v1/files/abc/comments",
      query: undefined,
      data: { comments: [{ id: "c1", message: "Ship it" }] },
      method: "file.comments.list"
    },
    {
      args: ["component", "get", "cmp", "--json"],
      path: "/v1/components/cmp",
      query: undefined,
      data: { meta: { name: "Button" } },
      method: "component.get"
    }
  ])("routes $method through GET", async ({ args, path, query, data, method }) => {
    await using driver = await FigmaCliTestDriver.create()
    driver.auth.setProfile()
    driver.figma.overrideGet({ path, ...(query === undefined ? {} : { query }), data })

    const result = await driver.cli.runJson({ args })

    expect(result.envelope).toMatchObject({ ok: true, method, data })
    expect(driver.figma.listCalls()).toEqual([expect.objectContaining({ path })])
  })

  it("renders multiple nodes and images with normalized IDs", async () => {
    await using driver = await FigmaCliTestDriver.create()
    driver.auth.setProfile()
    driver.figma.overrideGet({
      path: "/v1/files/abc/nodes",
      query: { ids: "1:2,3:4" },
      data: { nodes: {} }
    })
    driver.figma.overrideGet({
      path: "/v1/images/abc",
      query: { ids: "1:2,3:4", format: "svg", scale: "2" },
      data: { images: {} }
    })

    await driver.cli.runJson({ args: ["file", "nodes", "get", "abc", "--ids", "1-2,3:4", "--json"] })
    await driver.cli.runJson({ args: ["image", "render", "abc", "--ids", "1-2,3:4", "--format", "svg", "--scale", "2", "--json"] })

    expect(driver.figma.listCalls()).toHaveLength(2)
  })

  it("exposes Figma pagination and streams primary collections as NDJSON", async () => {
    await using driver = await FigmaCliTestDriver.create()
    driver.auth.setProfile()
    driver.figma.overrideGet({
      path: "/v1/files/abc/versions",
      data: {
        versions: [{ id: "2", label: "Latest" }, { id: "1", label: "First" }],
        pagination: { next_page: "https://api.figma.com/v1/files/abc/versions?after=1" }
      }
    })

    const json = await driver.cli.runJson({ args: ["file", "versions", "list", "abc", "--json"] })
    const ndjson = await driver.cli.run({ args: ["file", "versions", "list", "abc", "--format", "ndjson"] })

    expect(json.envelope).toMatchObject({ paging: { next_cursor: "1", has_more: true } })
    expect(ndjson.stdout).toBe('{"id":"2","label":"Latest"}\n{"id":"1","label":"First"}\n')
  })

  it("tests auth and reports recorded scopes without exposing the token", async () => {
    await using driver = await FigmaCliTestDriver.create()
    driver.auth.setProfile({ token: "secret", scopes: ["current_user:read"] })
    driver.figma.overrideGet({ path: "/v1/me", data: { id: "1", handle: "Ada" } })

    const scopes = await driver.cli.runJson({ args: ["auth", "scopes", "--json"] })
    const tested = await driver.cli.runJson({ args: ["auth", "test", "--json"] })

    expect(scopes.envelope).toMatchObject({ method: "auth.scopes", data: { scopes: ["current_user:read"] } })
    expect(tested.envelope).toMatchObject({ method: "auth.test", data: { handle: "Ada" } })
    expect(scopes.stdout + tested.stdout).not.toContain("secret")
  })
})
