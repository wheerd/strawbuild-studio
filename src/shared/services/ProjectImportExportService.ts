import type {
  PerimeterConstructionMethodId,
  RingBeamConstructionMethodId,
  SlabConstructionConfigId
} from '@/building/model/ids'
import type { Storey } from '@/building/model/model'
import { getModelActions } from '@/building/store'
import { getConfigState, setConfigState } from '@/construction/config/store'
import type {
  PerimeterConstructionMethod,
  RingBeamConstructionMethod,
  SlabConstructionConfig
} from '@/construction/config/types'
import type { Material, MaterialId } from '@/construction/materials/material'
import { getMaterialsState, setMaterialsState } from '@/construction/materials/store'
import type { Polygon2D } from '@/shared/geometry'
import { createLength, createVec2 } from '@/shared/geometry'

export interface ExportedStorey {
  name: string
  height: number
  slabConstructionConfigId: string
  perimeters: ExportedPerimeter[]
}

export interface ExportedPerimeter {
  corners: ExportedCorner[]
  walls: ExportedWall[]
  baseRingBeamMethodId?: string
  topRingBeamMethodId?: string
}

export interface ExportedCorner {
  insideX: number
  insideY: number
  constructedByWall: 'previous' | 'next'
}

export interface ExportedWall {
  thickness: number
  constructionMethodId: string
  openings: ExportedOpening[]
}

export interface ExportedOpening {
  type: 'door' | 'window' | 'passage'
  offsetFromStart: number
  width: number
  height: number
  sillHeight?: number
}

export interface ExportData {
  version: string
  timestamp: string
  modelStore: {
    storeys: ExportedStorey[]
    minLevel: number
  }
  configStore: {
    ringBeamConstructionMethods: Record<RingBeamConstructionMethodId, RingBeamConstructionMethod>
    perimeterConstructionMethods: Record<PerimeterConstructionMethodId, PerimeterConstructionMethod>
    slabConstructionConfigs?: Record<SlabConstructionConfigId, SlabConstructionConfig>
    defaultBaseRingBeamMethodId?: RingBeamConstructionMethodId
    defaultTopRingBeamMethodId?: RingBeamConstructionMethodId
    defaultPerimeterMethodId: PerimeterConstructionMethodId
    defaultSlabConfigId?: SlabConstructionConfigId
  }
  materialsStore: {
    materials: Record<MaterialId, Material>
  }
}

export interface ImportResult {
  success: true
  data: ExportData
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

// Simple service interface - no UI state management, works with strings
export interface IProjectImportExportService {
  exportToString(): Promise<StringExportResult | StringExportError>
  importFromString(content: string): Promise<ImportResult | ImportError>
}

const CURRENT_VERSION = '1.2.0'

class ProjectImportExportServiceImpl implements IProjectImportExportService {
  async exportToString(): Promise<StringExportResult | StringExportError> {
    try {
      const modelActions = getModelActions()

      // Use store getters for proper encapsulation
      const storeys = modelActions.getStoreysOrderedByLevel()

      // Calculate the minimum level
      const minLevel = storeys.length > 0 ? Math.min(...storeys.map(s => s.level)) : 0

      const exportedStoreys: ExportedStorey[] = storeys.map(storey => ({
        name: storey.name,
        height: Number(storey.height),
        slabConstructionConfigId: storey.slabConstructionConfigId,
        perimeters: modelActions.getPerimetersByStorey(storey.id).map(perimeter => ({
          corners: perimeter.corners.map(corner => ({
            insideX: corner.insidePoint[0],
            insideY: corner.insidePoint[1],
            constructedByWall: corner.constructedByWall
          })),
          walls: perimeter.walls.map(wall => ({
            thickness: Number(wall.thickness),
            constructionMethodId: wall.constructionMethodId,
            openings: wall.openings.map(opening => ({
              type: opening.type,
              offsetFromStart: Number(opening.offsetFromStart),
              width: Number(opening.width),
              height: Number(opening.height),
              sillHeight: opening.sillHeight ? Number(opening.sillHeight) : undefined
            }))
          })),
          baseRingBeamMethodId: perimeter.baseRingBeamMethodId,
          topRingBeamMethodId: perimeter.topRingBeamMethodId
        }))
      }))

      const result = this.exportToJSON({ storeys: exportedStoreys, minLevel }, getConfigState(), getMaterialsState())

      if (result.success) {
        const content = JSON.stringify(result.data, null, 2)
        return {
          success: true,
          content
        }
      }

      return {
        success: false,
        error: result.error
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export project'
      }
    }
  }

  async importFromString(content: string): Promise<ImportResult | ImportError> {
    try {
      const importResult = this.importFromJSON(content)
      if (!importResult.success) return importResult

      const modelActions = getModelActions()

      // 1. Import config state with backwards compatibility for floor configs
      const configStore = importResult.data.configStore
      setConfigState(configStore)

      // 2. Import materials state (if available for backwards compatibility)
      setMaterialsState(importResult.data.materialsStore)

      // 3. Reset model (creates default "Ground Floor" at level 0)
      modelActions.reset()

      // 4. Get existing default ground floor
      const existingStoreys = modelActions.getStoreysOrderedByLevel()
      const defaultGroundFloor = existingStoreys[0]

      // 5. Process imported storeys
      const exportedStoreys = importResult.data.modelStore.storeys

      exportedStoreys.forEach((exportedStorey, index) => {
        let targetStorey: Storey
        const slabConfigId = exportedStorey.slabConstructionConfigId as SlabConstructionConfigId

        if (index === 0) {
          // Modify existing default ground floor
          targetStorey = defaultGroundFloor
          modelActions.updateStoreyName(targetStorey.id, exportedStorey.name)
          modelActions.updateStoreyHeight(targetStorey.id, createLength(exportedStorey.height))
          modelActions.updateStoreySlabConfig(targetStorey.id, slabConfigId)
        } else {
          // Add additional storeys with floor config
          targetStorey = modelActions.addStorey(exportedStorey.name, createLength(exportedStorey.height), slabConfigId)
        }

        // 6. Recreate perimeters - let store auto-compute all geometry
        exportedStorey.perimeters.forEach(exportedPerimeter => {
          const boundary: Polygon2D = {
            points: exportedPerimeter.corners.map(c => createVec2(c.insideX, c.insideY))
          }

          // Get construction method from first wall or use default
          const constructionMethodId = exportedPerimeter.walls[0]?.constructionMethodId as PerimeterConstructionMethodId
          const thickness = createLength(exportedPerimeter.walls[0]?.thickness || 200)

          // Basic perimeter creation - auto-computes geometry, outsidePoints, etc.
          const perimeter = modelActions.addPerimeter(
            targetStorey.id,
            boundary,
            constructionMethodId,
            thickness,
            exportedPerimeter.baseRingBeamMethodId as RingBeamConstructionMethodId | undefined,
            exportedPerimeter.topRingBeamMethodId as RingBeamConstructionMethodId | undefined
          )

          // 7. Update wall properties - auto-recomputes geometry
          exportedPerimeter.walls.forEach((exportedWall, wallIndex) => {
            const wallId = perimeter.walls[wallIndex].id

            // Basic wall updates - auto-computes all derived properties
            modelActions.updatePerimeterWallThickness(perimeter.id, wallId, createLength(exportedWall.thickness))
            modelActions.updatePerimeterWallConstructionMethod(
              perimeter.id,
              wallId,
              exportedWall.constructionMethodId as PerimeterConstructionMethodId
            )

            // Add openings
            exportedWall.openings.forEach(exportedOpening => {
              modelActions.addPerimeterWallOpening(perimeter.id, wallId, {
                type: exportedOpening.type,
                offsetFromStart: createLength(exportedOpening.offsetFromStart),
                width: createLength(exportedOpening.width),
                height: createLength(exportedOpening.height),
                sillHeight: exportedOpening.sillHeight ? createLength(exportedOpening.sillHeight) : undefined
              })
            })
          })

          // 8. Update corner properties - auto-recomputes outsidePoints
          exportedPerimeter.corners.forEach((exportedCorner, cornerIndex) => {
            const cornerId = perimeter.corners[cornerIndex].id
            modelActions.updatePerimeterCornerConstructedByWall(
              perimeter.id,
              cornerId,
              exportedCorner.constructedByWall
            )
          })
        })
      })

      // 9. Adjust levels based on minLevel
      const minLevel = importResult.data.modelStore.minLevel
      if (minLevel !== 0) {
        modelActions.adjustAllLevels(minLevel)
      }

      return { success: true, data: importResult.data }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to import project'
      }
    }
  }

  // Private helper methods (consolidated from exportImport.ts)
  private createExportData(
    modelState: ExportData['modelStore'],
    configState: ExportData['configStore'],
    materialsState: ExportData['materialsStore']
  ): ExportData {
    return {
      version: CURRENT_VERSION,
      timestamp: new Date().toISOString(),
      modelStore: modelState,
      configStore: configState,
      materialsStore: materialsState
    }
  }

  private exportToJSON(
    modelState: ExportData['modelStore'],
    configState: ExportData['configStore'],
    materialsState: ExportData['materialsStore']
  ): { success: true; data: ExportData; filename: string } | { success: false; error: string } {
    try {
      const data = this.createExportData(modelState, configState, materialsState)
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
      const filename = `strawbaler-project-${timestamp}.json`

      return {
        success: true,
        data,
        filename
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export data'
      }
    }
  }

  private validateImportData(data: unknown): data is ExportData {
    if (typeof data !== 'object' || data === null) {
      return false
    }

    const obj = data as Record<string, unknown>

    if (typeof obj.version !== 'string') {
      return false
    }

    if (typeof obj.timestamp !== 'string') {
      return false
    }

    if (typeof obj.modelStore !== 'object' || obj.modelStore === null) {
      return false
    }

    if (typeof obj.configStore !== 'object' || obj.configStore === null) {
      return false
    }

    const modelStore = obj.modelStore as Record<string, unknown>
    if (!Array.isArray(modelStore.storeys) || typeof modelStore.minLevel !== 'number') {
      return false
    }

    const configStore = obj.configStore as Record<string, unknown>
    if (
      typeof configStore.ringBeamConstructionMethods !== 'object' ||
      typeof configStore.perimeterConstructionMethods !== 'object' ||
      typeof configStore.defaultPerimeterMethodId !== 'string'
    ) {
      return false
    }

    // Materials store is optional for backwards compatibility
    if (obj.materialsStore !== undefined) {
      if (typeof obj.materialsStore !== 'object' || obj.materialsStore === null) {
        return false
      }
      const materialsStore = obj.materialsStore as Record<string, unknown>
      if (typeof materialsStore.materials !== 'object') {
        return false
      }
    }

    return true
  }

  private importFromJSON(jsonString: string): ImportResult | ImportError {
    try {
      const parsed = JSON.parse(jsonString)

      if (!this.validateImportData(parsed)) {
        return {
          success: false,
          error: 'Invalid file format. Please select a valid Strawbaler project file.'
        }
      }

      // Support backwards compatibility
      const supportedVersions = ['1.0.0', '1.1.0', '1.2.0']
      if (!supportedVersions.includes(parsed.version)) {
        return {
          success: false,
          error: `Unsupported file version ${parsed.version}. Supported versions: ${supportedVersions.join(', ')}.`
        }
      }

      return {
        success: true,
        data: parsed
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse file'
      }
    }
  }
}

export const ProjectImportExportService = new ProjectImportExportServiceImpl()
