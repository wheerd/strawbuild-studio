import { useAuthStore } from '@/app/user/store'
import { isSupabaseConfigured } from '@/app/user/supabaseClient'
import { CURRENT_VERSION as MODEL_VERSION } from '@/building/store/migrations'
import { getPersistenceActions } from '@/building/store/persistenceStore'
import {
  partializeState as partializeModelState,
  regeneratePartializedState,
  useModelStore
} from '@/building/store/store'
import type { StoreState } from '@/building/store/types'
import { type ConfigState, getConfigState, setConfigState, subscribeToConfigChanges } from '@/construction/config/store'
import { CURRENT_VERSION as CONFIG_VERSION } from '@/construction/config/store/migrations'
import {
  type MaterialsState,
  getMaterialsState,
  setMaterialsState,
  subscribeToMaterials
} from '@/construction/materials/store'
import { MATERIALS_STORE_VERSION } from '@/construction/materials/store/migrations'
import { PARTS_STORE_VERSION, type PartializedPartsState, usePartsStore } from '@/construction/parts/store'
import { getProjectMeta, useProjectsActions, useProjectsStore } from '@/projects/store'
import type { ProjectId } from '@/projects/types'
import { parseTimestamp } from '@/projects/types'
import { type ICloudSyncService, type StoreType, getCloudSyncService } from '@/shared/services/SupabaseSyncService'

const SYNC_DEBOUNCE_MS = 3000

type SyncQueueItem = StoreType | 'project_meta'

interface SyncSubscriptions {
  model: () => void
  config: () => void
  materials: () => void
  parts: () => void
  projectMeta: () => void
}

export class CloudSyncManager {
  private syncService: ICloudSyncService | null = null
  private syncTimeout: ReturnType<typeof setTimeout> | null = null
  private pendingSyncs = new Set<SyncQueueItem>()
  private subscriptions: SyncSubscriptions | null = null
  private authUnsubscribe: (() => void) | null = null

  async initialize(): Promise<void> {
    if (!isSupabaseConfigured() || this.syncService) {
      return
    }

    this.syncService = getCloudSyncService()
    if (!this.syncService) {
      return
    }

    await this.syncService.initialize()

    if (this.syncService.isAuthenticated()) {
      await this.loadProjectsFromCloud()
      this.setupStoreSubscriptions()
    }

    this.authUnsubscribe = useAuthStore.subscribe(() => {
      if (this.syncService?.isAuthenticated()) {
        void this.loadProjectsFromCloud()
        this.setupStoreSubscriptions()
      } else {
        this.cleanupSubscriptions()
      }
    })
  }

  destroy(): void {
    this.cleanupSubscriptions()
    if (this.authUnsubscribe) {
      this.authUnsubscribe()
      this.authUnsubscribe = null
    }
    if (this.syncService) {
      this.syncService.destroy()
      this.syncService = null
    }
  }

  async syncLocalProjectToCloud(): Promise<void> {
    await this.ensureSyncService()

    const userId = this.syncService?.getCurrentUserId()
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const projectMeta = getProjectMeta()
    const modelState = partializeModelState(useModelStore.getState())
    const configState = getConfigState()
    const materialsState = getMaterialsState()
    const partsState = usePartsStore.getState()
    const partsLabelState = {
      labels: partsState.labels,
      nextLabelIndexByGroup: partsState.nextLabelIndexByGroup
    }

    const service = this.syncService
    if (!service) {
      throw new Error('Sync service not available')
    }

    await service.createProject(userId, {
      projectId: projectMeta.projectId,
      name: projectMeta.name,
      description: projectMeta.description,
      modelState,
      modelVersion: MODEL_VERSION,
      configState,
      configVersion: CONFIG_VERSION,
      materialsState,
      materialsVersion: MATERIALS_STORE_VERSION,
      partsState: partsLabelState,
      partsVersion: PARTS_STORE_VERSION
    })
  }

  async loadProjectFromCloud(projectId: ProjectId): Promise<void> {
    await this.ensureSyncService()

    const service = this.syncService
    if (!service) {
      throw new Error('Sync service not available')
    }

    const projectData = await service.loadProject(projectId)

    const modelState = projectData.modelState as StoreState
    regeneratePartializedState(modelState)
    useModelStore.setState(modelState)

    const configState = projectData.configState as ConfigState
    setConfigState(configState)

    const materialsState = projectData.materialsState as MaterialsState
    setMaterialsState(materialsState)

    const partsLabelState = projectData.partsState as PartializedPartsState
    usePartsStore.setState(partsLabelState, false)

    const { loadProject } = useProjectsActions()
    loadProject({
      projectId,
      name: projectData.name,
      description: projectData.description,
      createdAt: parseTimestamp(projectData.createdAt),
      updatedAt: parseTimestamp(projectData.updatedAt)
    })
  }

  private async ensureSyncService(): Promise<void> {
    if (!this.syncService) {
      this.syncService = getCloudSyncService()
      if (!this.syncService) {
        throw new Error('Cloud sync not available')
      }
      await this.syncService.initialize()
    }
  }

  private async loadProjectsFromCloud(): Promise<void> {
    if (!this.syncService) return

    const actions = useProjectsActions()
    actions.setLoading(true)

    try {
      const projects = await this.syncService.loadProjectList()
      actions.setProjects(projects)
    } catch (error) {
      console.error('Failed to load projects:', error)
    } finally {
      actions.setLoading(false)
    }
  }

  private setupStoreSubscriptions(): void {
    if (this.subscriptions) return

    this.subscriptions = {
      model: useModelStore.subscribe(() => {
        this.queueSync('model')
      }),

      config: subscribeToConfigChanges(() => {
        this.queueSync('config')
      }),

      materials: subscribeToMaterials(() => {
        this.queueSync('materials')
      }),

      parts: usePartsStore.subscribe(() => {
        this.queueSync('parts')
      }),

      projectMeta: useProjectsStore.subscribe(() => {
        this.queueSync('project_meta')
      })
    }
  }

  private cleanupSubscriptions(): void {
    if (this.subscriptions) {
      this.subscriptions.model()
      this.subscriptions.config()
      this.subscriptions.materials()
      this.subscriptions.parts()
      this.subscriptions.projectMeta()
      this.subscriptions = null
    }
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout)
      this.syncTimeout = null
    }
    this.pendingSyncs.clear()
  }

  private queueSync(item: SyncQueueItem): void {
    this.pendingSyncs.add(item)

    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout)
    }

    this.syncTimeout = setTimeout(() => {
      void this.flushSyncQueue()
    }, SYNC_DEBOUNCE_MS)
  }

  private async flushSyncQueue(): Promise<void> {
    if (!this.syncService || this.pendingSyncs.size === 0) return

    const projectMeta = getProjectMeta()
    const persistenceActions = getPersistenceActions()

    persistenceActions.setCloudSyncing(true)

    try {
      for (const item of this.pendingSyncs) {
        if (item === 'project_meta') {
          await this.syncService.updateProjectMeta(projectMeta.projectId, {
            name: projectMeta.name,
            description: projectMeta.description
          })
          continue
        }

        let data: unknown
        let version: number

        switch (item) {
          case 'model': {
            const state = useModelStore.getState()
            data = partializeModelState(state)
            version = MODEL_VERSION
            break
          }
          case 'config': {
            data = getConfigState()
            version = CONFIG_VERSION
            break
          }
          case 'materials': {
            data = getMaterialsState()
            version = MATERIALS_STORE_VERSION
            break
          }
          case 'parts': {
            const state = usePartsStore.getState()
            data = {
              labels: state.labels,
              nextLabelIndexByGroup: state.nextLabelIndexByGroup
            }
            version = PARTS_STORE_VERSION
            break
          }
        }

        await this.syncService.syncStore(projectMeta.projectId, item, data, version)
      }

      this.pendingSyncs.clear()
      persistenceActions.setCloudSyncSuccess(new Date())
    } catch (error) {
      persistenceActions.setCloudSyncError(error instanceof Error ? error.message : 'Sync failed')
    }
  }
}

let managerInstance: CloudSyncManager | null = null

export function getCloudSyncManager(): CloudSyncManager {
  managerInstance ??= new CloudSyncManager()
  return managerInstance
}

export function destroyCloudSyncManager(): void {
  if (managerInstance) {
    managerInstance.destroy()
    managerInstance = null
  }
}

export async function initializeCloudSync(): Promise<void> {
  const manager = getCloudSyncManager()
  await manager.initialize()
}

export async function syncLocalProjectToCloud(): Promise<void> {
  const manager = getCloudSyncManager()
  await manager.syncLocalProjectToCloud()
}

export async function loadProjectFromCloud(projectId: ProjectId): Promise<void> {
  const manager = getCloudSyncManager()
  await manager.loadProjectFromCloud(projectId)
}

export function destroyCloudSync(): void {
  destroyCloudSyncManager()
}
