import type { SupabaseClient, User } from '@supabase/supabase-js'

import { getSupabaseClient, isSupabaseConfigured } from '@/app/user/supabaseClient'
import {
  type ProjectData,
  type ProjectId,
  type ProjectListItem,
  type ProjectMeta,
  type UpdatableProjectMeta,
  parseTimestamp
} from '@/projects/types'

interface CloudProjectRow {
  id: string
  user_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
  model_state: unknown
  model_version: number
  config_state: unknown
  config_version: number
  materials_state: unknown
  materials_version: number
  parts_state: unknown
  parts_version: number
}

export type StoreType = 'model' | 'config' | 'materials' | 'parts'

export interface ICloudSyncService {
  initialize(): Promise<void>
  destroy(): void
  isReady(): boolean

  syncStore(projectId: ProjectId, store: StoreType, data: unknown, version: number): Promise<void>
  loadProject(projectId: ProjectId): Promise<ProjectData>
  createProject(userId: string, projectData: ProjectData): Promise<void>
  updateProjectMeta(projectId: ProjectId, meta: Partial<Pick<ProjectMeta, 'name' | 'description'>>): Promise<void>
  deleteProject(projectId: ProjectId): Promise<void>

  loadProjectList(): Promise<ProjectListItem[]>

  getCurrentUserId(): string | null
  isAuthenticated(): boolean
}

let syncService: ICloudSyncService | null = null
export function getCloudSyncService(): ICloudSyncService | null {
  if (!isSupabaseConfigured()) {
    return null
  }

  syncService ??= new SupabaseSyncService()
  return syncService
}

export class SupabaseSyncService implements ICloudSyncService {
  private client: SupabaseClient
  private currentUser: User | null = null
  private authSubscription: { unsubscribe: () => void } | null = null

  constructor() {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured')
    }
    this.client = getSupabaseClient()
  }

  async initialize(): Promise<void> {
    const {
      data: { user }
    } = await this.client.auth.getUser()
    this.currentUser = user

    this.authSubscription = this.client.auth.onAuthStateChange((_event, session) => {
      this.currentUser = session?.user ?? null
    }).data.subscription
  }

  destroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe()
      this.authSubscription = null
    }
  }

  isReady(): boolean {
    return isSupabaseConfigured() && this.currentUser !== null
  }

  getCurrentUserId(): string | null {
    return this.currentUser?.id ?? null
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null
  }

  async syncStore(projectId: ProjectId, column: StoreType, data: unknown, version: number): Promise<void> {
    if (!this.currentUser) {
      throw new Error('Not authenticated')
    }

    const { error } = await this.client
      .from('projects')
      .update({
        [`${column}_state`]: data,
        [`${column}_version`]: version,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)

    if (error) {
      throw new Error(`Failed to sync ${column}: ${error.message}`)
    }
  }

  async loadProject(projectId: ProjectId): Promise<ProjectData> {
    if (!this.currentUser) {
      throw new Error('Not authenticated')
    }

    const result = await this.client.from('projects').select('*').eq('id', projectId).single()

    if (result.error) {
      throw new Error(`Failed to load project: ${result.error.message}`)
    }

    const row = result.data as CloudProjectRow

    return {
      projectId: row.id as ProjectId,
      modelState: row.model_state,
      modelVersion: row.model_version,
      configState: row.config_state,
      configVersion: row.config_version,
      materialsState: row.materials_state,
      materialsVersion: row.materials_version,
      partsState: row.parts_state,
      partsVersion: row.parts_version,
      name: row.name,
      description: row.description ?? undefined,
      createdAt: parseTimestamp(row.created_at),
      updatedAt: parseTimestamp(row.updated_at)
    }
  }

  async createProject(userId: string, projectData: ProjectData): Promise<void> {
    const row: Partial<CloudProjectRow> = {
      id: projectData.projectId,
      user_id: userId,
      name: projectData.name,
      description: projectData.description ?? null,
      model_state: projectData.modelState,
      model_version: projectData.modelVersion,
      config_state: projectData.configState,
      config_version: projectData.configVersion,
      materials_state: projectData.materialsState,
      materials_version: projectData.materialsVersion,
      parts_state: projectData.partsState,
      parts_version: projectData.partsVersion,
      created_at: projectData.createdAt,
      updated_at: projectData.updatedAt
    }
    const { error } = await this.client.from('projects').insert(row)

    if (error) {
      throw new Error(`Failed to create project: ${error.message}`)
    }
  }

  async updateProjectMeta(projectId: ProjectId, meta: Partial<UpdatableProjectMeta>): Promise<void> {
    if (!this.currentUser) {
      throw new Error('Not authenticated')
    }

    const { error } = await this.client
      .from('projects')
      .update({
        ...meta,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)

    if (error) {
      throw new Error(`Failed to update project meta: ${error.message}`)
    }
  }

  async deleteProject(projectId: ProjectId): Promise<void> {
    if (!this.currentUser) {
      throw new Error('Not authenticated')
    }

    const { error } = await this.client.from('projects').delete().eq('id', projectId)

    if (error) {
      throw new Error(`Failed to delete project: ${error.message}`)
    }
  }

  async loadProjectList(): Promise<ProjectListItem[]> {
    if (!this.currentUser) {
      throw new Error('Not authenticated')
    }

    const result = await this.client
      .from('projects')
      .select('id, name, description, updated_at')
      .order('updated_at', { ascending: false })

    if (result.error) {
      throw new Error(`Failed to load project list: ${result.error.message}`)
    }

    return result.data.map(row => ({
      id: row.id as ProjectId,
      name: row.name as string,
      description: (row.description ?? undefined) as string | undefined,
      updatedAt: parseTimestamp(row.updated_at as string)
    }))
  }
}

export async function deleteProject(projectId: ProjectId): Promise<void> {
  const service = getCloudSyncService()
  if (!service) {
    throw new Error('Cloud sync not available')
  }
  await service.deleteProject(projectId)
}
