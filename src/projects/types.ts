export type ProjectId = string & { readonly brand: unique symbol }

export const createProjectId = (): ProjectId => crypto.randomUUID() as ProjectId

export type Timestamp = string & { readonly brand: unique symbol }

export const timestampNow = (): Timestamp => new Date().toISOString() as Timestamp

export const parseTimestamp = (s: string): Timestamp => s as Timestamp

export interface ProjectMeta {
  projectId: ProjectId
  name: string
  description?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type UpdatableProjectMeta = Omit<ProjectMeta, 'projectId' | 'createdAt' | 'updatedAt'>

export interface ProjectData extends ProjectMeta {
  modelState: unknown
  modelVersion: number
  configState: unknown
  configVersion: number
  materialsState: unknown
  materialsVersion: number
  partsState: unknown
  partsVersion: number
}

export interface ProjectListItem {
  id: ProjectId
  name: string
  description?: string
  updatedAt: Timestamp
}
