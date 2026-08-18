import { Schema } from "effect"

export const FileKey = Schema.NonEmptyString.pipe(Schema.brand("@AgentFigma/FileKey"))
export type FileKey = typeof FileKey.Type

export const NodeId = Schema.NonEmptyString.pipe(Schema.brand("@AgentFigma/NodeId"))
export type NodeId = typeof NodeId.Type

export const ProfileName = Schema.NonEmptyString.pipe(Schema.brand("@AgentFigma/ProfileName"))
export type ProfileName = typeof ProfileName.Type

export const Scope = Schema.NonEmptyString.pipe(Schema.brand("@AgentFigma/Scope"))
export type Scope = typeof Scope.Type

