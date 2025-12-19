import type {
  FloorAssemblyId,
  OpeningAssemblyId,
  PerimeterId,
  RingBeamAssemblyId,
  RoofAssemblyId,
  WallAssemblyId
} from '@/building/model/ids'
import type { Storey } from '@/building/model/model'
import { getModelActions } from '@/building/store'
import { getConfigActions, getConfigState, setConfigState } from '@/construction/config/store'
import { applyMigrations } from '@/construction/config/store/migrations'
import type {
  FloorAssemblyConfig,
  RingBeamAssemblyConfig,
  RoofAssemblyConfig,
  WallAssemblyConfig
} from '@/construction/config/types'
import { FLOOR_ASSEMBLIES } from '@/construction/floors'
import type { Material, MaterialId } from '@/construction/materials/material'
import { getMaterialsState, setMaterialsState } from '@/construction/materials/store'
import { MATERIALS_STORE_VERSION, migrateMaterialsState } from '@/construction/materials/store/migrations'
import { resolveOpeningConfig } from '@/construction/openings/resolver'
import { type Polygon2D, newVec2 } from '@/shared/geometry'

export interface ExportedStorey {
  name: string
  floorHeight?: number
  height?: number // legacy alias retained for backwards compatibility
  floorAssemblyId: string
  perimeters: ExportedPerimeter[]
  floorAreas?: ExportedFloorPolygon[]
  floorOpenings?: ExportedFloorPolygon[]
  roofs?: ExportedRoof[]
}

export interface ExportedPerimeter {
  referenceSide?: 'inside' | 'outside'
  referencePolygon?: ExportedFloorPolygon
  corners: ExportedCorner[]
  walls: ExportedWall[]
  baseRingBeamAssemblyId?: string // Obsolete
  topRingBeamAssemblyId?: string // Obsolete
}

export interface ExportedCorner {
  insideX: number
  insideY: number
  constructedByWall: 'previous' | 'next'
}

export interface ExportedWall {
  thickness: number
  wallAssemblyId: string
  baseRingBeamAssemblyId?: string
  topRingBeamAssemblyId?: string
  openings: ExportedOpening[]
}

export interface ExportedOpening {
  type: 'door' | 'window' | 'passage'
  centerOffset: number
  offsetFromStart?: number
  width: number
  height: number
  sillHeight?: number
  openingAssemblyId?: string
}

export interface ExportedFloorPolygon {
  points: { x: number; y: number }[]
}

export interface ExportedRoof {
  type: 'gable' | 'shed'
  referencePolygon: ExportedFloorPolygon
  mainSideIndex: number
  slope: number
  verticalOffset: number
  overhangs: number[]
  assemblyId: string
  referencePerimeter?: string
}

export interface ExportData {
  version: string
  timestamp: string
  modelStore: {
    storeys: ExportedStorey[]
    minLevel: number
  }
  configStore: {
    defaultStrawMaterial?: MaterialId
    ringBeamAssemblyConfigs: Record<RingBeamAssemblyId, RingBeamAssemblyConfig>
    wallAssemblyConfigs: Record<WallAssemblyId, WallAssemblyConfig>
    floorAssemblyConfigs?: Record<FloorAssemblyId, FloorAssemblyConfig>
    roofAssemblyConfigs?: Record<RoofAssemblyId, RoofAssemblyConfig>
    defaultBaseRingBeamAssemblyId?: RingBeamAssemblyId
    defaultTopRingBeamAssemblyId?: RingBeamAssemblyId
    defaultWallAssemblyId: WallAssemblyId
    defaultFloorAssemblyId?: FloorAssemblyId
    defaultRoofAssemblyId?: RoofAssemblyId
  }
  materialsStore:
    | {
        materials: Record<MaterialId, Material>
      }
    | undefined
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

const CURRENT_VERSION = '1.11.0'
const SUPPORTED_VERSIONS = [
  '1.0.0',
  '1.1.0',
  '1.2.0',
  '1.3.0',
  '1.4.0',
  '1.5.0',
  '1.6.0',
  '1.7.0',
  '1.8.0',
  '1.9.0',
  '1.10.0',
  '1.11.0'
] as const

const compareVersion = (version1: string, version2: string) => {
  const v1 = version1.split('.').map(Number)
  const v2 = version2.split('.').map(Number)
  for (let i = 0; i < v1.length; i++) {
    const e1 = v1[i]
    const e2 = v2[i]
    if (e1 < e2) return -1
    if (e1 > e2) return 1
  }
  return 0
}

const polygonToExport = (polygon: Polygon2D): ExportedFloorPolygon => ({
  points: polygon.points.map(point => ({ x: point[0], y: point[1] }))
})

const getFloorAssemblyThicknessFromConfig = (
  configs: Record<FloorAssemblyId, FloorAssemblyConfig> | undefined,
  floorAssemblyId: FloorAssemblyId
): number => {
  if (!configs) return 0
  const config = configs[floorAssemblyId]
  if (!config) return 0
  const assembly = FLOOR_ASSEMBLIES[config.type]
  return Number(assembly.getTotalThickness(config))
}

const resolveImportedFloorHeight = (
  storey: ExportedStorey,
  nextStorey: ExportedStorey | undefined,
  floorAssemblyConfigs: Record<FloorAssemblyId, FloorAssemblyConfig> | undefined
): number => {
  if (storey.floorHeight != null && storey.floorHeight > 0) {
    return storey.floorHeight
  }

  const legacyCeilingHeight = storey.height ?? 0
  if (!nextStorey) {
    return legacyCeilingHeight
  }

  const nextThickness = getFloorAssemblyThicknessFromConfig(
    floorAssemblyConfigs,
    nextStorey.floorAssemblyId as FloorAssemblyId
  )

  return legacyCeilingHeight + nextThickness
}

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
        const roofs = modelActions.getRoofsByStorey(storey.id).map(roof => ({
          type: roof.type,
          referencePolygon: polygonToExport(roof.referencePolygon),
          mainSideIndex: roof.mainSideIndex,
          slope: roof.slope,
          verticalOffset: Number(roof.verticalOffset),
          overhangs: roof.overhangs.map(o => Number(o.value)),
          assemblyId: roof.assemblyId,
          referencePerimeter: roof.referencePerimeter
        }))
        const perimeters = modelActions.getPerimetersByStorey(storey.id).map(perimeter => ({
          referenceSide: perimeter.referenceSide,
          referencePolygon: polygonToExport({ points: perimeter.referencePolygon }),
          corners: perimeter.corners.map(corner => ({
            insideX: corner.insidePoint[0],
            insideY: corner.insidePoint[1],
            constructedByWall: corner.constructedByWall
          })),
          walls: perimeter.walls.map(wall => ({
            thickness: Number(wall.thickness),
            wallAssemblyId: wall.wallAssemblyId,
            baseRingBeamAssemblyId: wall.baseRingBeamAssemblyId,
            topRingBeamAssemblyId: wall.topRingBeamAssemblyId,
            openings: wall.openings.map(opening => ({
              type: opening.type,
              centerOffset: Number(opening.centerOffsetFromWallStart),
              width: Number(opening.width),
              height: Number(opening.height),
              sillHeight: opening.sillHeight ? Number(opening.sillHeight) : undefined,
              openingAssemblyId: opening.openingAssemblyId
            }))
          }))
        }))

        return {
          name: storey.name,
          floorHeight: Number(storey.floorHeight),
          floorAssemblyId: storey.floorAssemblyId,
          perimeters,
          floorAreas: floorAreas.length > 0 ? floorAreas : undefined,
          floorOpenings: floorOpenings.length > 0 ? floorOpenings : undefined,
          roofs: roofs.length > 0 ? roofs : undefined
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

      const migrateOpeningDimensions = compareVersion(importResult.data.version, '1.11.0') < 0

      // 1. Import config state with backwards compatibility for floor configs
      const configStore = applyMigrations(importResult.data.configStore) as Parameters<typeof setConfigState>[0]
      setConfigState(configStore)

      // 2. Import materials state (if available for backwards compatibility) and apply migrations
      if (importResult.data.materialsStore) {
        const migratedMaterials = migrateMaterialsState(importResult.data.materialsStore, MATERIALS_STORE_VERSION)
        setMaterialsState(migratedMaterials)
      }

      // 3. Reset model (creates default "Ground Floor" at level 0)
      modelActions.reset()

      // 4. Get existing default ground floor
      const existingStoreys = modelActions.getStoreysOrderedByLevel()
      const defaultGroundFloor = existingStoreys[0]

      // 5. Process imported storeys
      const exportedStoreys = importResult.data.modelStore.storeys

      exportedStoreys.forEach((exportedStorey, index, list) => {
        let targetStorey: Storey
        const floorAssemblyId = exportedStorey.floorAssemblyId as FloorAssemblyId
        const resolvedFloorHeight = resolveImportedFloorHeight(
          exportedStorey,
          list[index + 1],
          configStore.floorAssemblyConfigs
        )

        if (index === 0) {
          // Modify existing default ground floor
          targetStorey = defaultGroundFloor
          modelActions.updateStoreyName(targetStorey.id, exportedStorey.name)
          modelActions.updateStoreyFloorHeight(targetStorey.id, resolvedFloorHeight)
          modelActions.updateStoreyFloorAssembly(targetStorey.id, floorAssemblyId)
        } else {
          // Add additional storeys with floor config
          targetStorey = modelActions.addStorey(exportedStorey.name, resolvedFloorHeight, floorAssemblyId)
        }

        // 6. Recreate perimeters - let store auto-compute all geometry
        exportedStorey.perimeters.forEach(exportedPerimeter => {
          const boundaryPoints =
            exportedPerimeter.referencePolygon?.points?.map(point => newVec2(point.x, point.y)) ??
            exportedPerimeter.corners.map(c => newVec2(c.insideX, c.insideY))
          const boundary: Polygon2D = {
            points: boundaryPoints
          }

          // Get assembly from first wall or use default
          const wallAssemblyId = exportedPerimeter.walls[0]?.wallAssemblyId as WallAssemblyId
          const thickness = exportedPerimeter.walls[0]?.thickness || 200

          // Basic perimeter creation - auto-computes geometry, outsidePoints, etc.
          // Don't pass ring beams here - we'll set them per wall for backward compatibility
          const perimeter = modelActions.addPerimeter(
            targetStorey.id,
            boundary,
            wallAssemblyId,
            thickness,
            undefined, // No default base ring beam
            undefined, // No default top ring beam
            exportedPerimeter.referenceSide ?? 'inside'
          )

          // 7. Update wall properties - auto-recomputes geometry
          exportedPerimeter.walls.forEach((exportedWall, wallIndex) => {
            const wallId = perimeter.walls[wallIndex].id

            // Basic wall updates - auto-computes all derived properties
            modelActions.updatePerimeterWallThickness(perimeter.id, wallId, exportedWall.thickness)
            modelActions.updatePerimeterWallAssembly(
              perimeter.id,
              wallId,
              exportedWall.wallAssemblyId as WallAssemblyId
            )

            // Ring beam configuration with backward compatibility
            // Try wall-level first (new format), fall back to perimeter-level (old format)
            const baseRingBeam = exportedWall.baseRingBeamAssemblyId ?? exportedPerimeter.baseRingBeamAssemblyId
            const topRingBeam = exportedWall.topRingBeamAssemblyId ?? exportedPerimeter.topRingBeamAssemblyId

            if (baseRingBeam) {
              modelActions.setWallBaseRingBeam(perimeter.id, wallId, baseRingBeam as RingBeamAssemblyId)
            }
            if (topRingBeam) {
              modelActions.setWallTopRingBeam(perimeter.id, wallId, topRingBeam as RingBeamAssemblyId)
            }

            const wallAssembly = getConfigActions().getWallAssemblyById(exportedWall.wallAssemblyId as WallAssemblyId)

            // Add openings
            exportedWall.openings.forEach(exportedOpening => {
              const openingConfig = resolveOpeningConfig(
                { openingAssemblyId: exportedOpening.openingAssemblyId as OpeningAssemblyId },
                { openingAssemblyId: wallAssembly?.openingAssemblyId }
              )
              const openingParams = migrateOpeningDimensions
                ? {
                    type: exportedOpening.type,
                    centerOffsetFromWallStart:
                      exportedOpening.offsetFromStart != null
                        ? exportedOpening.offsetFromStart + exportedOpening.width / 2 - openingConfig.padding
                        : exportedOpening.centerOffset,
                    width: exportedOpening.width + 2 * openingConfig.padding,
                    height: exportedOpening.height + 2 * openingConfig.padding,
                    sillHeight: exportedOpening.sillHeight
                      ? Math.max(exportedOpening.sillHeight - openingConfig.padding, 0)
                      : undefined
                  }
                : {
                    type: exportedOpening.type,
                    centerOffsetFromWallStart:
                      exportedOpening.offsetFromStart != null
                        ? exportedOpening.offsetFromStart + exportedOpening.width / 2
                        : exportedOpening.centerOffset,
                    width: exportedOpening.width,
                    height: exportedOpening.height,
                    sillHeight: exportedOpening.sillHeight ? exportedOpening.sillHeight : undefined
                  }

              modelActions.addPerimeterWallOpening(perimeter.id, wallId, openingParams)
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
            points: exportedFloorArea.points.map(point => newVec2(point.x, point.y))
          }
          modelActions.addFloorArea(targetStorey.id, polygon)
        })

        exportedStorey.floorOpenings?.forEach(exportedFloorOpening => {
          const polygon: Polygon2D = {
            points: exportedFloorOpening.points.map(point => newVec2(point.x, point.y))
          }
          modelActions.addFloorOpening(targetStorey.id, polygon)
        })

        exportedStorey.roofs?.forEach(exportedRoof => {
          const polygon: Polygon2D = {
            points: exportedRoof.referencePolygon.points.map(point => newVec2(point.x, point.y))
          }
          const addedRoof = modelActions.addRoof(
            targetStorey.id,
            exportedRoof.type,
            polygon,
            exportedRoof.mainSideIndex,
            exportedRoof.slope,
            exportedRoof.verticalOffset,
            exportedRoof.overhangs[0] ?? 0, // Use first overhang value as default
            exportedRoof.assemblyId as RoofAssemblyId,
            exportedRoof.referencePerimeter ? (exportedRoof.referencePerimeter as PerimeterId) : undefined
          )
          // Update individual overhangs if they differ
          if (addedRoof && exportedRoof.overhangs.length === addedRoof.overhangs.length) {
            exportedRoof.overhangs.forEach((overhangValue, index) => {
              if (index > 0 && overhangValue !== exportedRoof.overhangs[0]) {
                const overhang = addedRoof.overhangs[index]
                if (overhang) {
                  modelActions.updateRoofOverhangById(addedRoof.id, overhang.id, overhangValue)
                }
              }
            })
          }
        })
      })

      // 9. Adjust levels based on minLevel
      const minLevel = importResult.data.modelStore.minLevel
      if (minLevel !== 0) {
        modelActions.adjustAllLevels(minLevel)
      }

      return { success: true, data: importResult.data }
    } catch (error) {
      console.error(error)
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

    const isValidPolygon = (polygon: unknown): polygon is ExportedFloorPolygon => {
      if (typeof polygon !== 'object' || polygon === null || !Array.isArray((polygon as { points?: unknown }).points)) {
        return false
      }
      return (polygon as ExportedFloorPolygon).points.every(
        point =>
          typeof point === 'object' &&
          point !== null &&
          typeof (point as { x?: unknown }).x === 'number' &&
          typeof (point as { y?: unknown }).y === 'number'
      )
    }

    const isValidPolygonCollection = (value: unknown): value is ExportedFloorPolygon[] => {
      if (!Array.isArray(value)) {
        return false
      }
      return value.every(polygon => isValidPolygon(polygon))
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
      if (storeyRecord.roofs !== undefined && storeyRecord.roofs !== null) {
        if (!Array.isArray(storeyRecord.roofs)) {
          return false
        }
        for (const roof of storeyRecord.roofs) {
          if (
            !roof ||
            typeof roof !== 'object' ||
            typeof (roof as Record<string, unknown>).type !== 'string' ||
            typeof (roof as Record<string, unknown>).mainSideIndex !== 'number' ||
            typeof (roof as Record<string, unknown>).slope !== 'number' ||
            typeof (roof as Record<string, unknown>).verticalOffset !== 'number' ||
            !Array.isArray((roof as Record<string, unknown>).overhangs) ||
            typeof (roof as Record<string, unknown>).assemblyId !== 'string'
          ) {
            return false
          }
          const roofRecord = roof as Record<string, unknown>
          if (!roofRecord.referencePolygon || !isValidPolygon(roofRecord.referencePolygon)) {
            return false
          }
        }
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

    if (configStore.defaultStrawMaterial !== undefined && typeof configStore.defaultStrawMaterial !== 'string') {
      return false
    }

    // Roof assembly configs validation (optional for backward compatibility)
    if (configStore.roofAssemblyConfigs !== undefined && typeof configStore.roofAssemblyConfigs !== 'object') {
      return false
    }
    if (configStore.defaultRoofAssemblyId !== undefined && typeof configStore.defaultRoofAssemblyId !== 'string') {
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
      console.error(error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse file'
      }
    }
  }
}

export const ProjectImportExportService = new ProjectImportExportServiceImpl()
