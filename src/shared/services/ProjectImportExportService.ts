import type { PerimeterConstructionMethodId, RingBeamConstructionMethodId } from '@/building/model/ids'
import type { Storey } from '@/building/model/model'
import type { PerimeterConstructionMethod, RingBeamConstructionMethod } from '@/construction/config/types'
import type { Polygon2D } from '@/shared/geometry'
import { createLength, createVec2 } from '@/shared/geometry'

// Export/Import Types (consolidated from exportImport.ts)
export interface ExportedStorey {
  name: string
  level: number
  height: number
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
  constuctedByWall: 'previous' | 'next'
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
  }
  configStore: {
    ringBeamConstructionMethods: Record<RingBeamConstructionMethodId, RingBeamConstructionMethod>
    perimeterConstructionMethods: Record<PerimeterConstructionMethodId, PerimeterConstructionMethod>
    defaultBaseRingBeamMethodId?: RingBeamConstructionMethodId
    defaultTopRingBeamMethodId?: RingBeamConstructionMethodId
    defaultPerimeterMethodId: PerimeterConstructionMethodId
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

const CURRENT_VERSION = '1.0.0'

class ProjectImportExportServiceImpl implements IProjectImportExportService {
  async exportToString(): Promise<StringExportResult | StringExportError> {
    try {
      // Dynamic imports to avoid circular dependencies
      const { getModelActions } = await import('@/building/store')
      const { getConfigState } = await import('@/construction/config/store')

      const modelActions = getModelActions()

      // Use store getters for proper encapsulation
      const storeys = modelActions.getStoreysOrderedByLevel()

      const exportedStoreys: ExportedStorey[] = storeys.map(storey => ({
        name: storey.name,
        level: storey.level,
        height: Number(storey.height),
        perimeters: modelActions.getPerimetersByStorey(storey.id).map(perimeter => ({
          corners: perimeter.corners.map(corner => ({
            insideX: corner.insidePoint[0],
            insideY: corner.insidePoint[1],
            constuctedByWall: corner.constuctedByWall
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

      const result = this.exportToJSON({ storeys: exportedStoreys }, getConfigState())

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

      // Dynamic imports to avoid circular dependencies
      const { setConfigState } = await import('@/construction/config/store')
      const { getModelActions } = await import('@/building/store')

      const modelActions = getModelActions()

      // 1. Import config state (unchanged format)
      setConfigState(importResult.data.configStore)

      // 2. Reset model (creates default "Ground Floor" at level 0)
      modelActions.reset()

      // 3. Get existing default ground floor
      const existingStoreys = modelActions.getStoreysOrderedByLevel()
      const defaultGroundFloor = existingStoreys[0]

      // 4. Process imported storeys
      const exportedStoreys = importResult.data.modelStore.storeys

      exportedStoreys.forEach((exportedStorey, index) => {
        let targetStorey: Storey

        if (index === 0) {
          // Modify existing default ground floor
          targetStorey = defaultGroundFloor
          modelActions.updateStoreyName(targetStorey.id, exportedStorey.name)
          modelActions.updateStoreyHeight(targetStorey.id, createLength(exportedStorey.height))

          // Adjust level if needed
          if (exportedStorey.level !== targetStorey.level) {
            const adjustment = exportedStorey.level - targetStorey.level
            modelActions.adjustAllLevels(adjustment)
          }
        } else {
          // Add additional storeys
          targetStorey = modelActions.addStorey(exportedStorey.name, createLength(exportedStorey.height))
        }

        // 5. Recreate perimeters - let store auto-compute all geometry
        exportedStorey.perimeters.forEach(exportedPerimeter => {
          const boundary: Polygon2D = {
            points: exportedPerimeter.corners.map(c => createVec2(c.insideX, c.insideY))
          }

          // Get construction method from first wall or use default
          const constructionMethodId = exportedPerimeter.walls[0]?.constructionMethodId as PerimeterConstructionMethodId
          const thickness = createLength(exportedPerimeter.walls[0]?.thickness || 200)

          if (!constructionMethodId) {
            throw new Error('No construction method found for perimeter')
          }

          // Basic perimeter creation - auto-computes geometry, outsidePoints, etc.
          const perimeter = modelActions.addPerimeter(
            targetStorey.id,
            boundary,
            constructionMethodId,
            thickness,
            exportedPerimeter.baseRingBeamMethodId as RingBeamConstructionMethodId | undefined,
            exportedPerimeter.topRingBeamMethodId as RingBeamConstructionMethodId | undefined
          )

          // 6. Update wall properties - auto-recomputes geometry
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

          // 7. Update corner properties - auto-recomputes outsidePoints
          exportedPerimeter.corners.forEach((exportedCorner, cornerIndex) => {
            const cornerId = perimeter.corners[cornerIndex].id
            modelActions.updatePerimeterCornerConstructedByWall(perimeter.id, cornerId, exportedCorner.constuctedByWall)
          })
        })
      })

      return { success: true, data: importResult.data }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to import project'
      }
    }
  }

  // Private helper methods (consolidated from exportImport.ts)
  private createExportData(modelState: ExportData['modelStore'], configState: ExportData['configStore']): ExportData {
    return {
      version: CURRENT_VERSION,
      timestamp: new Date().toISOString(),
      modelStore: modelState,
      configStore: configState
    }
  }

  private exportToJSON(
    modelState: ExportData['modelStore'],
    configState: ExportData['configStore']
  ): { success: true; data: ExportData; filename: string } | { success: false; error: string } {
    try {
      const data = this.createExportData(modelState, configState)
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
    if (!Array.isArray(modelStore.storeys)) {
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

      if (parsed.version !== CURRENT_VERSION) {
        return {
          success: false,
          error: `Unsupported file version ${parsed.version}. Expected version ${CURRENT_VERSION}.`
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
