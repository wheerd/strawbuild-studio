import { MODEL_STORE_VERSION, type PartializedStoreState, exportModelState, hydrateModelState } from '@/building/store'
import { CONFIG_STORE_VERSION, type ConfigState, getConfigState, hydrateConfigState } from '@/construction/config/store'
import {
  MATERIALS_STORE_VERSION,
  type MaterialsState,
  getMaterialsState,
  hydrateMaterialsState
} from '@/construction/materials/store'
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

import { LegacyProjectImportService } from './LegacyProjectImportService'

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

export interface IProjectImportExportService {
  exportToString(): string
  importFromString(content: string): void
}

class ProjectJSONService implements IProjectImportExportService {
  exportToString(): string {
    const data: ExportDataV2 = {
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      stores: {
        project: {
          state: exportProjectMeta(),
          version: PROJECTS_STORE_VERSION
        },
        model: {
          state: exportModelState(),
          version: MODEL_STORE_VERSION
        },
        config: {
          state: getConfigState(),
          version: CONFIG_STORE_VERSION
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

    return JSON.stringify(data, null, 2)
  }

  importFromString(content: string): void {
    const parsed = JSON.parse(content) as unknown

    if (this.isV2Format(parsed)) {
      this.importV2(parsed)
    } else {
      const result = LegacyProjectImportService.importFromString(content)
      if (!result.success) {
        throw new Error(result.error)
      }
    }
  }

  private isV2Format(data: unknown): data is ExportDataV2 {
    if (typeof data !== 'object' || data === null) return false
    const obj = data as Record<string, unknown>
    return obj.version === '2.0.0'
  }

  private importV2(data: ExportDataV2): void {
    const { stores } = data

    hydrateProjectMeta(stores.project.state)
    hydrateModelState(stores.model.state, stores.model.version)
    hydrateConfigState(stores.config.state, stores.config.version)
    hydrateMaterialsState(stores.materials.state, stores.materials.version)
    hydratePartsState(stores.parts.state, stores.parts.version)
  }
}

export const ProjectImportExportService = new ProjectJSONService()
