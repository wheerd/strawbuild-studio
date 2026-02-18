import type { ConstraintInput, OpeningParams, Storey, WallPostParams } from '@/building/model'
import {
  type FloorAssemblyId,
  type OpeningAssemblyId,
  type OpeningId,
  type PerimeterCornerId,
  type PerimeterId,
  type PerimeterWallId,
  type RingBeamAssemblyId,
  type RoofAssemblyId,
  type WallAssemblyId,
  type WallId,
  type WallPostId
} from '@/building/model/ids'
import { getModelActions } from '@/building/store'
import { getConfigActions, setConfigState } from '@/construction/config/store'
import { applyMigrations } from '@/construction/config/store/migrations'
import type {
  FloorAssemblyConfig,
  RingBeamAssemblyConfig,
  RoofAssemblyConfig,
  WallAssemblyConfig
} from '@/construction/config/types'
import { resolveFloorAssembly } from '@/construction/floors'
import type { Material, MaterialId } from '@/construction/materials/material'
import { setMaterialsState } from '@/construction/materials/store'
import { MATERIALS_STORE_VERSION, migrateMaterialsState } from '@/construction/materials/store/migrations'
import { resolveOpeningConfig } from '@/construction/openings/resolver'
import { type Polygon2D, newVec2 } from '@/shared/geometry'

export interface ExportedStorey {
  name: string
  useDefaultName?: boolean
  floorHeight?: number
  height?: number
  floorAssemblyId: string
  perimeters: ExportedPerimeter[]
  floorAreas?: ExportedFloorPolygon[]
  floorOpenings?: ExportedFloorPolygon[]
  roofs?: ExportedRoof[]
}

export interface ExportedPerimeter {
  id?: string
  referenceSide?: 'inside' | 'outside'
  referencePolygon?: ExportedFloorPolygon
  corners: ExportedCorner[]
  walls: ExportedWall[]
  baseRingBeamAssemblyId?: string
  topRingBeamAssemblyId?: string
}

export interface ExportedCorner {
  id?: string
  insideX: number
  insideY: number
  constructedByWall: 'previous' | 'next'
}

export interface ExportedWall {
  id?: string
  thickness: number
  wallAssemblyId: string
  baseRingBeamAssemblyId?: string
  topRingBeamAssemblyId?: string
  openings: ExportedOpening[]
  posts?: ExportedPost[]
}

export interface ExportedOpening {
  id?: string
  type: 'door' | 'window' | 'passage'
  centerOffset: number
  offsetFromStart?: number
  width: number
  height: number
  sillHeight?: number
  openingAssemblyId?: string
}

export interface ExportedPost {
  id?: string
  type: 'center' | 'inside' | 'outside' | 'double'
  centerOffset: number
  width: number
  thickness: number
  replacesPosts: boolean
  material: string
  infillMaterial: string
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

export interface ExportedConstraint {
  type:
    | 'wallLength'
    | 'colinearCorner'
    | 'parallel'
    | 'perpendicularCorner'
    | 'cornerAngle'
    | 'horizontalWall'
    | 'verticalWall'
    | 'wallEntityAbsolute'
    | 'wallEntityRelative'
  wall?: string
  side?: 'left' | 'right'
  length?: number
  wallA?: string
  wallB?: string
  distance?: number
  corner?: string
  angle?: number
  entity?: string
  entitySide?: 'start' | 'center' | 'end'
  node?: string
  entityA?: string
  entityB?: string
  entityASide?: 'start' | 'center' | 'end'
  entityBSide?: 'start' | 'center' | 'end'
}

export interface ExportData {
  version: string
  timestamp: string
  modelStore: {
    storeys: ExportedStorey[]
    minLevel: number
    constraints?: ExportedConstraint[]
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
  materialsStore?:
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
  '1.11.0',
  '1.12.0',
  '1.13.0',
  '1.14.0'
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

const getFloorAssemblyThicknessFromConfig = (
  configs: Record<FloorAssemblyId, FloorAssemblyConfig> | undefined,
  floorAssemblyId: FloorAssemblyId
): number => {
  if (!configs || !(floorAssemblyId in configs)) return 0
  const config = configs[floorAssemblyId]
  const assembly = resolveFloorAssembly(config)
  return assembly.totalThickness
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

export function isLegacyFormat(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) return false
  const obj = data as Record<string, unknown>
  const version = obj.version
  if (typeof version !== 'string') return false
  return (SUPPORTED_VERSIONS as readonly string[]).includes(version)
}

class LegacyProjectImportServiceImpl {
  importFromString(content: string): Promise<ImportResult | ImportError> {
    try {
      const importResult = this.importFromJSON(content)
      if (!importResult.success) return Promise.resolve(importResult)

      const modelActions = getModelActions()

      const migrateOpeningDimensions = compareVersion(importResult.data.version, '1.11.0') < 0

      const configStore = applyMigrations(importResult.data.configStore) as Parameters<typeof setConfigState>[0]
      setConfigState(configStore)

      if (importResult.data.materialsStore) {
        const migratedMaterials = migrateMaterialsState(importResult.data.materialsStore, MATERIALS_STORE_VERSION)
        setMaterialsState(migratedMaterials)
      }

      modelActions.reset()

      const existingStoreys = modelActions.getStoreysOrderedByLevel()
      const defaultGroundFloor = existingStoreys[0]

      const exportedStoreys = importResult.data.modelStore.storeys

      const perimeterIdMap = new Map<PerimeterId, PerimeterId>()
      const wallIdMap = new Map<PerimeterWallId, PerimeterWallId>()
      const cornerIdMap = new Map<PerimeterCornerId, PerimeterCornerId>()
      const entityIdMap = new Map<OpeningId | WallPostId, OpeningId | WallPostId>()

      exportedStoreys.forEach((exportedStorey, index, list) => {
        let targetStorey: Storey
        const floorAssemblyId = exportedStorey.floorAssemblyId as FloorAssemblyId
        const resolvedFloorHeight = resolveImportedFloorHeight(
          exportedStorey,
          list[index + 1],
          configStore.floorAssemblyConfigs
        )

        if (index === 0) {
          targetStorey = defaultGroundFloor
          modelActions.updateStoreyFloorHeight(targetStorey.id, resolvedFloorHeight)
          modelActions.updateStoreyFloorAssembly(targetStorey.id, floorAssemblyId)
        } else {
          targetStorey = modelActions.addStorey(resolvedFloorHeight, floorAssemblyId)
        }
        modelActions.updateStoreyName(
          targetStorey.id,
          exportedStorey.useDefaultName === true ? null : exportedStorey.name
        )

        exportedStorey.perimeters.forEach(exportedPerimeter => {
          const referencePoints = exportedPerimeter.referencePolygon?.points
          const boundaryPoints =
            referencePoints && referencePoints.length > 0
              ? referencePoints.map(point => newVec2(point.x, point.y))
              : exportedPerimeter.corners.map(c => newVec2(c.insideX, c.insideY))
          const boundary: Polygon2D = {
            points: boundaryPoints
          }

          const wallAssemblyId = exportedPerimeter.walls[0]?.wallAssemblyId as WallAssemblyId
          const thickness = exportedPerimeter.walls[0]?.thickness || 200

          const perimeter = modelActions.addPerimeter(
            targetStorey.id,
            boundary,
            wallAssemblyId,
            thickness,
            undefined,
            undefined,
            exportedPerimeter.referenceSide ?? 'inside'
          )

          if (exportedPerimeter.id) {
            perimeterIdMap.set(exportedPerimeter.id as PerimeterId, perimeter.id)
          }

          exportedPerimeter.corners.forEach((exportedCorner, cornerIndex) => {
            if (exportedCorner.id && cornerIndex < perimeter.cornerIds.length) {
              const newCornerId = perimeter.cornerIds[cornerIndex]
              cornerIdMap.set(exportedCorner.id as PerimeterCornerId, newCornerId)
            }
          })

          exportedPerimeter.walls.forEach((exportedWall, wallIndex) => {
            if (exportedWall.id && wallIndex < perimeter.wallIds.length) {
              const newWallId = perimeter.wallIds[wallIndex]
              wallIdMap.set(exportedWall.id as PerimeterWallId, newWallId)
            }
          })

          exportedPerimeter.walls.forEach((exportedWall, wallIndex) => {
            const wallId = perimeter.wallIds[wallIndex]

            modelActions.updatePerimeterWallThickness(wallId, exportedWall.thickness)
            modelActions.updatePerimeterWallAssembly(wallId, exportedWall.wallAssemblyId as WallAssemblyId)

            const baseRingBeam = exportedWall.baseRingBeamAssemblyId ?? exportedPerimeter.baseRingBeamAssemblyId
            const topRingBeam = exportedWall.topRingBeamAssemblyId ?? exportedPerimeter.topRingBeamAssemblyId

            if (baseRingBeam) {
              modelActions.setWallBaseRingBeam(wallId, baseRingBeam as RingBeamAssemblyId)
            }
            if (topRingBeam) {
              modelActions.setWallTopRingBeam(wallId, topRingBeam as RingBeamAssemblyId)
            }

            const wallAssembly = getConfigActions().getWallAssemblyById(exportedWall.wallAssemblyId as WallAssemblyId)

            exportedWall.openings.forEach(exportedOpening => {
              const openingConfig = resolveOpeningConfig(
                { openingAssemblyId: exportedOpening.openingAssemblyId as OpeningAssemblyId },
                { openingAssemblyId: wallAssembly?.openingAssemblyId }
              )
              const openingParams: OpeningParams = migrateOpeningDimensions
                ? {
                    openingType: exportedOpening.type,
                    centerOffsetFromWallStart:
                      exportedOpening.offsetFromStart != null
                        ? exportedOpening.offsetFromStart + exportedOpening.width / 2 - openingConfig.padding
                        : exportedOpening.centerOffset,
                    width: exportedOpening.width + 2 * openingConfig.padding,
                    height: exportedOpening.height + 2 * openingConfig.padding,
                    sillHeight: exportedOpening.sillHeight
                      ? Math.max(exportedOpening.sillHeight - openingConfig.padding, 0)
                      : undefined,
                    openingAssemblyId: exportedOpening.openingAssemblyId as OpeningAssemblyId
                  }
                : {
                    openingType: exportedOpening.type,
                    centerOffsetFromWallStart:
                      exportedOpening.offsetFromStart != null
                        ? exportedOpening.offsetFromStart + exportedOpening.width / 2
                        : exportedOpening.centerOffset,
                    width: exportedOpening.width,
                    height: exportedOpening.height,
                    sillHeight: exportedOpening.sillHeight ?? undefined,
                    openingAssemblyId: exportedOpening.openingAssemblyId as OpeningAssemblyId
                  }

              try {
                const newOpening = modelActions.addWallOpening(wallId, openingParams)
                if (exportedOpening.id) {
                  entityIdMap.set(exportedOpening.id as OpeningId, newOpening.id)
                }
              } catch (error) {
                console.error(error)
              }
            })

            if (exportedWall.posts) {
              exportedWall.posts.forEach(exportedPost => {
                const postParams: WallPostParams = {
                  postType: exportedPost.type,
                  centerOffsetFromWallStart: exportedPost.centerOffset,
                  width: exportedPost.width,
                  thickness: exportedPost.thickness,
                  replacesPosts: exportedPost.replacesPosts,
                  material: exportedPost.material as MaterialId,
                  infillMaterial: exportedPost.infillMaterial as MaterialId
                }

                try {
                  const newPost = modelActions.addWallPost(wallId, postParams)
                  if (exportedPost.id) {
                    entityIdMap.set(exportedPost.id as WallPostId, newPost.id)
                  }
                } catch (error) {
                  console.error(error)
                }
              })
            }
          })

          exportedPerimeter.corners.forEach((exportedCorner, cornerIndex) => {
            const cornerId = perimeter.cornerIds[cornerIndex]
            modelActions.updatePerimeterCornerConstructedByWall(cornerId, exportedCorner.constructedByWall)
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
          let referencePerimeter: PerimeterId | undefined
          if (exportedRoof.referencePerimeter) {
            const oldPerimeterId = exportedRoof.referencePerimeter as PerimeterId
            referencePerimeter = perimeterIdMap.get(oldPerimeterId) ?? undefined
          }
          const addedRoof = modelActions.addRoof(
            targetStorey.id,
            exportedRoof.type,
            polygon,
            exportedRoof.mainSideIndex,
            exportedRoof.slope,
            exportedRoof.verticalOffset,
            exportedRoof.overhangs[0] ?? 0,
            exportedRoof.assemblyId as RoofAssemblyId,
            referencePerimeter
          )
          if (exportedRoof.overhangs.length === addedRoof.overhangIds.length) {
            exportedRoof.overhangs.forEach((overhangValue, index) => {
              if (index > 0 && overhangValue !== exportedRoof.overhangs[0]) {
                const overhangId = addedRoof.overhangIds[index]
                modelActions.updateRoofOverhangById(overhangId, overhangValue)
              }
            })
          }
        })
      })

      const minLevel = importResult.data.modelStore.minLevel
      if (minLevel !== 0) {
        modelActions.adjustAllLevels(minLevel)
      }

      if (importResult.data.modelStore.constraints) {
        for (const exportedConstraint of importResult.data.modelStore.constraints) {
          try {
            let constraintInput: ConstraintInput | undefined
            switch (exportedConstraint.type) {
              case 'wallLength': {
                const wallId = wallIdMap.get(exportedConstraint.wall as PerimeterWallId)
                const side = exportedConstraint.side
                const length = exportedConstraint.length
                if (!wallId || !side || length === undefined) continue
                constraintInput = {
                  type: 'wallLength',
                  wall: wallId as WallId,
                  side,
                  length
                }
                break
              }
              case 'parallel': {
                const wallAId = wallIdMap.get(exportedConstraint.wallA as PerimeterWallId)
                const wallBId = wallIdMap.get(exportedConstraint.wallB as PerimeterWallId)
                if (!wallAId || !wallBId) continue
                constraintInput = {
                  type: 'parallel',
                  wallA: wallAId as WallId,
                  wallB: wallBId as WallId,
                  distance: exportedConstraint.distance
                }
                break
              }
              case 'colinearCorner': {
                const cornerId = cornerIdMap.get(exportedConstraint.corner as PerimeterCornerId)
                if (!cornerId) continue
                constraintInput = {
                  type: 'colinearCorner',
                  corner: cornerId
                }
                break
              }
              case 'perpendicularCorner': {
                const cornerId = cornerIdMap.get(exportedConstraint.corner as PerimeterCornerId)
                if (!cornerId) continue
                constraintInput = {
                  type: 'perpendicularCorner',
                  corner: cornerId
                }
                break
              }
              case 'cornerAngle': {
                const cornerId = cornerIdMap.get(exportedConstraint.corner as PerimeterCornerId)
                const angle = exportedConstraint.angle
                if (!cornerId || angle === undefined) continue
                constraintInput = {
                  type: 'cornerAngle',
                  corner: cornerId,
                  angle
                }
                break
              }
              case 'horizontalWall': {
                const wallId = wallIdMap.get(exportedConstraint.wall as PerimeterWallId)
                if (!wallId) continue
                constraintInput = {
                  type: 'horizontalWall',
                  wall: wallId as WallId
                }
                break
              }
              case 'verticalWall': {
                const wallId = wallIdMap.get(exportedConstraint.wall as PerimeterWallId)
                if (!wallId) continue
                constraintInput = {
                  type: 'verticalWall',
                  wall: wallId as WallId
                }
                break
              }
              case 'wallEntityAbsolute': {
                const wallId = wallIdMap.get(exportedConstraint.wall as PerimeterWallId)
                const entity = entityIdMap.get(exportedConstraint.entity as OpeningId | WallPostId)
                const side = exportedConstraint.side
                const entitySide = exportedConstraint.entitySide
                const node = cornerIdMap.get(exportedConstraint.node as PerimeterCornerId)
                const distance = exportedConstraint.distance
                if (!wallId || !entity || !side || !entitySide || !node || distance === undefined) continue
                constraintInput = {
                  type: 'wallEntityAbsolute',
                  wall: wallId as WallId,
                  entity,
                  side,
                  entitySide,
                  node,
                  distance
                }
                break
              }
              case 'wallEntityRelative': {
                const wallId = wallIdMap.get(exportedConstraint.wall as PerimeterWallId)
                const entityA = entityIdMap.get(exportedConstraint.entityA as OpeningId | WallPostId)
                const entityASide = exportedConstraint.entityASide
                const entityB = entityIdMap.get(exportedConstraint.entityB as OpeningId | WallPostId)
                const entityBSide = exportedConstraint.entityBSide
                const distance = exportedConstraint.distance
                if (!wallId || !entityA || !entityASide || !entityB || !entityBSide || distance === undefined) continue
                constraintInput = {
                  type: 'wallEntityRelative',
                  wall: wallId as WallId,
                  entityA,
                  entityASide,
                  entityB,
                  entityBSide,
                  distance
                }
                break
              }
              default:
                continue
            }

            modelActions.addBuildingConstraint(constraintInput)
          } catch (error) {
            console.error('Failed to apply constraint:', exportedConstraint, error)
          }
        }
      }

      return Promise.resolve({ success: true, data: importResult.data })
    } catch (error) {
      console.error(error)
      return Promise.resolve({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to import project'
      })
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

    if (modelStore.constraints !== undefined && modelStore.constraints !== null) {
      if (!Array.isArray(modelStore.constraints)) {
        return false
      }
      const validConstraintTypes: string[] = [
        'wallLength',
        'colinearCorner',
        'parallel',
        'perpendicularCorner',
        'cornerAngle',
        'horizontalWall',
        'verticalWall'
      ]
      for (const constraint of modelStore.constraints) {
        if (!constraint || typeof constraint !== 'object') {
          return false
        }
        const constraintRecord = constraint as Record<string, unknown>
        if (typeof constraintRecord.type !== 'string' || !validConstraintTypes.includes(constraintRecord.type)) {
          return false
        }
      }
    }

    const isValidPolygon = (polygon: unknown): polygon is ExportedFloorPolygon => {
      if (typeof polygon !== 'object' || polygon === null || !('points' in polygon) || !Array.isArray(polygon.points)) {
        return false
      }
      return polygon.points.every(
        (point: unknown) =>
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

    if (configStore.roofAssemblyConfigs !== undefined && typeof configStore.roofAssemblyConfigs !== 'object') {
      return false
    }
    if (configStore.defaultRoofAssemblyId !== undefined && typeof configStore.defaultRoofAssemblyId !== 'string') {
      return false
    }

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
      const parsed = JSON.parse(jsonString) as unknown

      if (!this.validateImportData(parsed)) {
        return {
          success: false,
          error: 'Invalid file format. Please select a valid Strawbaler project file.'
        }
      }

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

export const LegacyProjectImportService = new LegacyProjectImportServiceImpl()
