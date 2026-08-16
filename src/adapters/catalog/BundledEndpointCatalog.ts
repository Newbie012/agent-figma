import type { EndpointCatalog, EndpointMetadata } from "../../ports/EndpointCatalog.js"

const endpoint = (operation: string, path: string, scopes: readonly string[]): EndpointMetadata => ({
  operation, method: "GET", path, scopes, safety: "read"
})

const endpoints: readonly EndpointMetadata[] = [
  endpoint("user.get", "/v1/me", ["current_user:read"]),
  endpoint("team.projects.list", "/v1/teams/:team_id/projects", ["projects:read"]),
  endpoint("project.files.list", "/v1/projects/:project_id/files", ["files:read"]),
  endpoint("file.get", "/v1/files/:key", ["file_content:read"]),
  endpoint("file.nodes.get", "/v1/files/:key/nodes", ["file_content:read"]),
  endpoint("file.comments.list", "/v1/files/:file_key/comments", ["file_comments:read"]),
  endpoint("file.versions.list", "/v1/files/:file_key/versions", ["file_versions:read"]),
  endpoint("image.render", "/v1/images/:key", ["file_content:read"]),
  endpoint("component.get", "/v1/components/:key", ["library_assets:read"]),
  endpoint("component-set.get", "/v1/component_sets/:key", ["library_assets:read"]),
  endpoint("style.get", "/v1/styles/:key", ["library_assets:read"])
]

export class BundledEndpointCatalog implements EndpointCatalog {
  list(family?: string): readonly EndpointMetadata[] {
    return family === undefined ? endpoints : endpoints.filter((item) => item.operation.startsWith(`${family}.`))
  }

  describe(operation: string): EndpointMetadata | null {
    return endpoints.find((item) => item.operation === operation) ?? null
  }
}
