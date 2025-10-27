import { vec2 } from 'gl-matrix'

import type { FloorAssemblyId, RingBeamAssemblyId, WallAssemblyId } from '@/building/model/ids'
import type { Storey } from '@/building/model/model'
import { getModelActions } from '@/building/store'
import { applyMigrations } from '@/construction/config/migrations'
import { getConfigState, setConfigState } from '@/construction/config/store'
import type { FloorAssemblyConfig, RingBeamAssemblyConfig, WallAssemblyConfig } from '@/construction/config/types'
import type { Material, MaterialId } from '@/construction/materials/material'
import { getMaterialsState, setMaterialsState } from '@/construction/materials/store'
import type { StrawConfig } from '@/construction/materials/straw'
import type { Polygon2D } from '@/shared/geometry'

export interface ExportedStorey {
  name: string
  height: number
  floorAssemblyId: string
  perimeters: ExportedPerimeter[]
  floorAreas?: ExportedFloorPolygon[]
  floorOpenings?: ExportedFloorPolygon[]
}

export interface ExportedPerimeter {
  corners: ExportedCorner[]
  walls: ExportedWall[]
  baseRingBeamAssemblyId?: string
  topRingBeamAssemblyId?: string
}

export interface ExportedCorner {
  insideX: number
  insideY: number
  constructedByWall: 'previous' | 'next'
}

export interface ExportedWall {
  thickness: number
  wallAssemblyId: string
  openings: ExportedOpening[]
}

export interface ExportedOpening {
  type: 'door' | 'window' | 'passage'
  offsetFromStart: number
  width: number
  height: number
  sillHeight?: number
}

export interface ExportedFloorPolygon {
  points: { x: number; y: number }[]
}

export interface ExportData {
  version: string
  timestamp: string
  modelStore: {
    storeys: ExportedStorey[]
    minLevel: number
  }
  configStore: {
    straw?: StrawConfig
    ringBeamAssemblyConfigs: Record<RingBeamAssemblyId, RingBeamAssemblyConfig>
    wallAssemblyConfigs: Record<WallAssemblyId, WallAssemblyConfig>
    floorAssemblyConfigs?: Record<FloorAssemblyId, FloorAssemblyConfig>
    defaultBaseRingBeamAssemblyId?: RingBeamAssemblyId
    defaultTopRingBeamAssemblyId?: RingBeamAssemblyId
    defaultWallAssemblyId: WallAssemblyId
    defaultFloorAssemblyId?: FloorAssemblyId
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

const CURRENT_VERSION = '1.5.0'
const SUPPORTED_VERSIONS = ['1.0.0', '1.1.0', '1.2.0', '1.3.0', '1.4.0', '1.5.0'] as const

const polygonToExport = (polygon: Polygon2D): ExportedFloorPolygon => ({
  points: polygon.points.map(point => ({ x: point[0], y: point[1] }))
})

class ProjectImportExportServiceImpl implements IProjectImportExportService {
  async exportToString(): Promise<StringExportResult | StringExportError> {
    try {
      const modelActions = getModelActions()

      // Use store getters for proper encapsulation
      const storeys = modelActions.getStoreysOrderedByLevel()

      // Calculate the minimum level
      const minLevel = storeys.length > 0 ? Math.min(...storeys.map(s => s.level)) : 0

      const exportedStoreys: ExportedStorey[] = storeys.map(storey => {
        const floorAreas = modelActions.getFloorAreasByStorey(storey.id).map(area => polygonToExport(area.area))
        const floorOpenings = modelActions
          .getFloorOpeningsByStorey(storey.id)
          .map(opening => polygonToExport(opening.area))
        const perimeters = modelActions.getPerimetersByStorey(storey.id).map(perimeter => ({
          corners: perimeter.corners.map(corner => ({
            insideX: corner.insidePoint[0],
            insideY: corner.insidePoint[1],
            constructedByWall: corner.constructedByWall
          })),
          walls: perimeter.walls.map(wall => ({
            thickness: Number(wall.thickness),
            wallAssemblyId: wall.wallAssemblyId,
            openings: wall.openings.map(opening => ({
              type: opening.type,
              offsetFromStart: Number(opening.offsetFromStart),
              width: Number(opening.width),
              height: Number(opening.height),
              sillHeight: opening.sillHeight ? Number(opening.sillHeight) : undefined
            }))
          })),
          baseRingBeamAssemblyId: perimeter.baseRingBeamAssemblyId,
          topRingBeamAssemblyId: perimeter.topRingBeamAssemblyId
        }))

        return {
          name: storey.name,
          height: Number(storey.height),
          floorAssemblyId: storey.floorAssemblyId,
          perimeters,
          floorAreas: floorAreas.length > 0 ? floorAreas : undefined,
          floorOpenings: floorOpenings.length > 0 ? floorOpenings : undefined
        }
      })

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
      const configStore = applyMigrations(importResult.data.configStore) as Parameters<typeof setConfigState>[0]
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
        const floorAssemblyId = exportedStorey.floorAssemblyId as FloorAssemblyId

        if (index === 0) {
          // Modify existing default ground floor
          targetStorey = defaultGroundFloor
          modelActions.updateStoreyName(targetStorey.id, exportedStorey.name)
          modelActions.updateStoreyHeight(targetStorey.id, exportedStorey.height)
          modelActions.updateStoreyFloorAssembly(targetStorey.id, floorAssemblyId)
        } else {
          // Add additional storeys with floor config
          targetStorey = modelActions.addStorey(exportedStorey.name, exportedStorey.height, floorAssemblyId)
        }

        // 6. Recreate perimeters - let store auto-compute all geometry
        exportedStorey.perimeters.forEach(exportedPerimeter => {
          const boundary: Polygon2D = {
            points: exportedPerimeter.corners.map(c => vec2.fromValues(c.insideX, c.insideY))
          }

          // Get assembly from first wall or use default
          const wallAssemblyId = exportedPerimeter.walls[0]?.wallAssemblyId as WallAssemblyId
          const thickness = exportedPerimeter.walls[0]?.thickness || 200

          // Basic perimeter creation - auto-computes geometry, outsidePoints, etc.
          const perimeter = modelActions.addPerimeter(
            targetStorey.id,
            boundary,
            wallAssemblyId,
            thickness,
            exportedPerimeter.baseRingBeamAssemblyId as RingBeamAssemblyId | undefined,
            exportedPerimeter.topRingBeamAssemblyId as RingBeamAssemblyId | undefined
          )

          // 7. Update wall properties - auto-recomputes geometry
          exportedPerimeter.walls.forEach((exportedWall, wallIndex) => {
            const wallId = perimeter.walls[wallIndex].id

            // Basic wall updates - auto-computes all derived properties
            modelActions.updatePerimeterWallThickness(perimeter.id, wallId, exportedWall.thickness)
            modelActions.updateWallAssemblyBuilder(perimeter.id, wallId, exportedWall.wallAssemblyId as WallAssemblyId)

            // Add openings
            exportedWall.openings.forEach(exportedOpening => {
              modelActions.addPerimeterWallOpening(perimeter.id, wallId, {
                type: exportedOpening.type,
                offsetFromStart: exportedOpening.offsetFromStart,
                width: exportedOpening.width,
                height: exportedOpening.height,
                sillHeight: exportedOpening.sillHeight ? exportedOpening.sillHeight : undefined
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

        exportedStorey.floorAreas?.forEach(exportedFloorArea => {
          const polygon: Polygon2D = {
            points: exportedFloorArea.points.map(point => vec2.fromValues(point.x, point.y))
          }
          modelActions.addFloorArea(targetStorey.id, polygon)
        })

        exportedStorey.floorOpenings?.forEach(exportedFloorOpening => {
          const polygon: Polygon2D = {
            points: exportedFloorOpening.points.map(point => vec2.fromValues(point.x, point.y))
          }
          modelActions.addFloorOpening(targetStorey.id, polygon)
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

    const isValidPolygonCollection = (value: unknown): value is ExportedFloorPolygon[] => {
      if (!Array.isArray(value)) {
        return false
      }
      return value.every(polygon => {
        if (
          typeof polygon !== 'object' ||
          polygon === null ||
          !Array.isArray((polygon as { points?: unknown }).points)
        ) {
          return false
        }
        return (polygon as ExportedFloorPolygon).points.every(
          point =>
            typeof point === 'object' &&
            point !== null &&
            typeof (point as { x?: unknown }).x === 'number' &&
            typeof (point as { y?: unknown }).y === 'number'
        )
      })
    }

    for (const storey of modelStore.storeys) {
      if (typeof storey !== 'object' || storey === null) {
        return false
      }
      const storeyRecord = storey as Record<string, unknown>
      if (
        storeyRecord.floorAreas !== undefined &&
        storeyRecord.floorAreas !== null &&
        !isValidPolygonCollection(storeyRecord.floorAreas)
      ) {
        return false
      }
      if (
        storeyRecord.floorOpenings !== undefined &&
        storeyRecord.floorOpenings !== null &&
        !isValidPolygonCollection(storeyRecord.floorOpenings)
      ) {
        return false
      }
    }

    const configStore = obj.configStore as Record<string, unknown>
    if (
      typeof configStore.ringBeamAssemblyConfigs !== 'object' ||
      typeof configStore.wallAssemblyConfigs !== 'object' ||
      typeof configStore.defaultWallAssemblyId !== 'string'
    ) {
      return false
    }

    if (configStore.straw !== undefined && !this.isValidStrawConfig(configStore.straw)) {
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
      if (!(SUPPORTED_VERSIONS as readonly string[]).includes(parsed.version)) {
        return {
          success: false,
          error: `Unsupported file version ${parsed.version}. Supported versions: ${SUPPORTED_VERSIONS.join(', ')}.`
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

  private isValidStrawConfig(value: unknown): value is StrawConfig {
    if (typeof value !== 'object' || value === null) {
      return false
    }

    const straw = value as Record<string, unknown>

    const requiredNumberFields: (keyof StrawConfig)[] = ['baleMinLength', 'baleMaxLength', 'baleHeight', 'baleWidth']
    const optionalNumberFields: (keyof StrawConfig)[] = ['tolerance', 'topCutoffLimit', 'flakeSize']

    const hasValidRequiredNumbers = requiredNumberFields.every(field => {
      const fieldValue = straw[field]
      return typeof fieldValue === 'number' && Number.isFinite(fieldValue)
    })

    const hasValidOptionalNumbers = optionalNumberFields.every(field => {
      const fieldValue = straw[field]
      return fieldValue === undefined || (typeof fieldValue === 'number' && Number.isFinite(fieldValue))
    })
    const hasValidMaterial = typeof straw.material === 'string'

    return hasValidRequiredNumbers && hasValidOptionalNumbers && hasValidMaterial
  }
}

export const ProjectImportExportService = new ProjectImportExportServiceImpl()
