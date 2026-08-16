import { Schema } from "effect"

export class NotAuthenticated extends Schema.TaggedErrorClass<NotAuthenticated>()(
  "NotAuthenticated",
  { message: Schema.String, profile: Schema.String }
) {
  readonly exitCode = 4
}

export class PermissionDenied extends Schema.TaggedErrorClass<PermissionDenied>()(
  "PermissionDenied",
  { message: Schema.String, path: Schema.String, status: Schema.Number }
) {
  readonly exitCode = 4
}

export class FigmaRateLimited extends Schema.TaggedErrorClass<FigmaRateLimited>()(
  "FigmaRateLimited",
  {
    message: Schema.String,
    path: Schema.String,
    retryAfterSeconds: Schema.optional(Schema.Number),
    planTier: Schema.optional(Schema.String)
  }
) {
  readonly exitCode = 6
}

export class FigmaApiFailed extends Schema.TaggedErrorClass<FigmaApiFailed>()(
  "FigmaApiFailed",
  {
    message: Schema.String,
    path: Schema.String,
    status: Schema.optional(Schema.Number),
    cause: Schema.optional(Schema.Defect())
  }
) {
  readonly exitCode = 1
}

export class InvalidFigmaUrl extends Schema.TaggedErrorClass<InvalidFigmaUrl>()(
  "InvalidFigmaUrl",
  { message: Schema.String, input: Schema.String }
) {
  readonly exitCode = 2
}

export class ResourceNotFound extends Schema.TaggedErrorClass<ResourceNotFound>()(
  "ResourceNotFound",
  { message: Schema.String, path: Schema.String }
) {
  readonly exitCode = 3
}

export class WriteOperationBlocked extends Schema.TaggedErrorClass<WriteOperationBlocked>()(
  "WriteOperationBlocked",
  { message: Schema.String, operation: Schema.String }
) {
  readonly exitCode = 5
}

export class UsageError extends Schema.TaggedErrorClass<UsageError>()(
  "UsageError",
  {
    message: Schema.String,
    argument: Schema.optional(Schema.String),
    command: Schema.optional(Schema.String),
    usage: Schema.optional(Schema.String),
    didYouMean: Schema.optional(Schema.String),
    alternatives: Schema.optional(Schema.Array(Schema.String))
  }
) {
  readonly exitCode = 2
}

export type AgentFigmaError =
  | NotAuthenticated
  | PermissionDenied
  | FigmaRateLimited
  | FigmaApiFailed
  | InvalidFigmaUrl
  | ResourceNotFound
  | WriteOperationBlocked
  | UsageError

export const isAgentFigmaError = (error: unknown): error is AgentFigmaError =>
  error instanceof NotAuthenticated ||
  error instanceof PermissionDenied ||
  error instanceof FigmaRateLimited ||
  error instanceof FigmaApiFailed ||
  error instanceof InvalidFigmaUrl ||
  error instanceof ResourceNotFound ||
  error instanceof WriteOperationBlocked ||
  error instanceof UsageError

export const normalizeUnknownError = (error: unknown): AgentFigmaError => {
  if (isAgentFigmaError(error)) {
    return error
  }
  return new FigmaApiFailed({
    message: error instanceof Error ? error.message : "Unexpected failure",
    path: "unknown",
    cause: error
  })
}
