import { CURRENT_VERSION as MODEL_VERSION } from '@/building/store/migrations'
import { type PartializedStoreState, hydrateModelState, partializeState, useModelStore } from '@/building/store/store'
import { type ConfigState, getConfigState, hydrateConfigState } from '@/construction/config/store'
import { CURRENT_VERSION as CONFIG_VERSION } from '@/construction/config/store/migrations'
import { type MaterialsState, getMaterialsState, hydrateMaterialsState } from '@/construction/materials/store'
import { MATERIALS_STORE_VERSION } from '@/construction/materials/store/migrations'
import {
  PARTS_STORE_VERSION,
  type PartializedPartsState,
  exportPartsState,
  hydratePartsState
} from '@/construction/parts/store'
import {
  type ExportedProjectMeta,
  PROJECTS_STORE_VERSION,
  exportProjectMeta,
  hydrateProjectMeta
} from '@/projects/store'
import { LegacyProjectImportService } from '@/shared/services/LegacyProjectImportService'

export interface StoreExport<T> {
  state: T
  version: number
}

export interface ExportDataV2 {
  version: '2.0.0'
  timestamp: string
  stores: {
    project: StoreExport<ExportedProjectMeta>
    model: StoreExport<PartializedStoreState>
    config: StoreExport<ConfigState>
    materials: StoreExport<MaterialsState>
    parts: StoreExport<PartializedPartsState>
  }
}

export interface ImportResult {
  success: true
  data: ExportDataV2
}

export interface ImportError {
  success: false
  error: string
}

export interface StringExportResult {
  success: true
  content: string
}

export interface StringExportError {
  success: false
  error: string
}

export interface IProjectImportExportService {
  exportToString(): Promise<StringExportResult | StringExportError>
  importFromString(content: string): Promise<ImportResult | ImportError>
}

class ProjectImportExportServiceImpl implements IProjectImportExportService {
  exportToString(): Promise<StringExportResult | StringExportError> {
    try {
      const data: ExportDataV2 = {
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        stores: {
          project: {
            state: exportProjectMeta(),
            version: PROJECTS_STORE_VERSION
          },
          model: {
            state: partializeState(useModelStore.getState()),
            version: MODEL_VERSION
          },
          config: {
            state: getConfigState(),
            version: CONFIG_VERSION
          },
          materials: {
            state: getMaterialsState(),
            version: MATERIALS_STORE_VERSION
          },
          parts: {
            state: exportPartsState(),
            version: PARTS_STORE_VERSION
          }
        }
      }

      const content = JSON.stringify(data, null, 2)
      return Promise.resolve({
        success: true,
        content
      })
    } catch (error) {
      return Promise.resolve({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export project'
      })
    }
  }

  importFromString(content: string): Promise<ImportResult | ImportError> {
    try {
      const parsed = JSON.parse(content) as unknown

      if (this.isV2Format(parsed)) {
        return this.importV2(parsed)
      }

      return LegacyProjectImportService.importFromString(content).then(result => {
        if (result.success) {
          return {
            success: true as const,
            data: this.convertLegacyToV2(result.data)
          }
        }
        return {
          success: false as const,
          error: result.error
        }
      })
    } catch (error) {
      return Promise.resolve({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to import project'
      })
    }
  }

  private isV2Format(data: unknown): data is ExportDataV2 {
    if (typeof data !== 'object' || data === null) return false
    const obj = data as Record<string, unknown>
    return obj.version === '2.0.0'
  }

  private importV2(data: ExportDataV2): Promise<ImportResult | ImportError> {
    try {
      const { stores } = data

      hydrateProjectMeta(stores.project.state)
      hydrateModelState(stores.model.state, stores.model.version)
      hydrateConfigState(stores.config.state, stores.config.version)
      hydrateMaterialsState(stores.materials.state, stores.materials.version)
      hydratePartsState(stores.parts.state, stores.parts.version)

      return Promise.resolve({ success: true, data })
    } catch (error) {
      return Promise.resolve({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to import project'
      })
    }
  }

  private convertLegacyToV2(_legacyData: unknown): ExportDataV2 {
    return {
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      stores: {
        project: {
          state: exportProjectMeta(),
          version: PROJECTS_STORE_VERSION
        },
        model: {
          state: partializeState(useModelStore.getState()),
          version: MODEL_VERSION
        },
        config: {
          state: getConfigState(),
          version: CONFIG_VERSION
        },
        materials: {
          state: getMaterialsState(),
          version: MATERIALS_STORE_VERSION
        },
        parts: {
          state: exportPartsState(),
          version: PARTS_STORE_VERSION
        }
      }
    }
  }
}

export const ProjectImportExportService = new ProjectImportExportServiceImpl()
