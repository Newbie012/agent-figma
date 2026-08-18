type EndpointSafety = "read"

export interface EndpointMetadata {
  readonly operation: string
  readonly method: "GET"
  readonly path: string
  readonly scopes: readonly string[]
  readonly safety: EndpointSafety
}

export interface EndpointCatalog {
  readonly list: (family?: string) => readonly EndpointMetadata[]
  readonly describe: (operation: string) => EndpointMetadata | null
}
