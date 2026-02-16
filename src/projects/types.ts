export interface ProjectMeta {
  projectId: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface ProjectListItem {
  id: string
  name: string
  description?: string
  updatedAt: string
}
