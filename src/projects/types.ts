export type ProjectId = string & { readonly brand: unique symbol }

export const createProjectId = (): ProjectId => crypto.randomUUID() as ProjectId

export interface ProjectMeta {
  projectId: ProjectId
  name: string
  description?: string
  createdAt: string
  updatedAt: string
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
  updatedAt: string
}
