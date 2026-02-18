import { beforeEach, describe, expect, it, vi } from 'vitest'

import { isOpeningId } from '@/building/model'
import { getModelActions } from '@/building/store'
import { getConfigActions, getConfigState } from '@/construction/config/store'
import { getMaterialsActions, getMaterialsState } from '@/construction/materials/store'
import { type Polygon2D, newVec2 } from '@/shared/geometry'

import { ProjectImportExportService } from './ProjectImportExportService'

export function polygonIsClockwise({ points }: Polygon2D, eps = 0): boolean {
  let area2 = 0
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    const q = points[(i + 1) % points.length]
    area2 += p[0] * q[1] - q[0] * p[1]
  }

  if (eps > 0 && Math.abs(area2) <= eps) {
    return false
  }

  return area2 < 0
}

vi.mock('@/shared/geometry', async importOriginal => {
  return {
    ...(await importOriginal()),
    wouldClosingPolygonSelfIntersect: vi.fn(),
    polygonIsClockwise: vi.fn().mockImplementation(polygonIsClockwise)
  }
})

describe('ProjectImportExportService Integration', () => {
  beforeEach(() => {
    getModelActions().reset()
    getConfigActions().reset()
    getMaterialsActions().reset()
  })

  it('exports and imports project data with full fidelity (except IDs)', async () => {
    const modelActions = getModelActions()

    const existingStoreys = modelActions.getStoreysOrderedByLevel()
    const testStorey = existingStoreys[0]

    modelActions.updateStoreyName(testStorey.id, 'Test Floor')
    modelActions.updateStoreyFloorHeight(testStorey.id, 3000)

    const boundary = {
      points: [newVec2(0, 0), newVec2(8000, 0), newVec2(8000, 6000), newVec2(0, 6000)]
    }

    const wallAssemblyId = getConfigActions().getDefaultWallAssemblyId()
    const ringBeamAssemblyId = getConfigActions().getAllRingBeamAssemblies()[0].id

    const perimeter = modelActions.addPerimeter(
      testStorey.id,
      boundary,
      wallAssemblyId,
      200,
      ringBeamAssemblyId,
      ringBeamAssemblyId,
      'inside'
    )

    const wall1 = perimeter.wallIds[0]
    const wall2 = perimeter.wallIds[1]

    modelActions.addWallOpening(wall1, {
      openingType: 'door',
      centerOffsetFromWallStart: 1000,
      width: 900,
      height: 2100,
      sillHeight: undefined
    })

    modelActions.addWallOpening(wall2, {
      openingType: 'window',
      centerOffsetFromWallStart: 2000,
      width: 1200,
      height: 1500,
      sillHeight: 800
    })

    const wall3 = perimeter.wallIds[2]
    modelActions.updatePerimeterWallThickness(wall3, 300)

    const corner1 = perimeter.cornerIds[0]
    modelActions.updatePerimeterCornerConstructedByWall(corner1, 'previous')

    const floorAreaPolygon = {
      points: [newVec2(500, 500), newVec2(7000, 500), newVec2(7000, 5500), newVec2(500, 5500)]
    }
    modelActions.addFloorArea(testStorey.id, floorAreaPolygon)

    const floorOpeningPolygon = {
      points: [newVec2(2000, 2000), newVec2(3000, 2000), newVec2(3000, 3000), newVec2(2000, 3000)]
    }
    modelActions.addFloorOpening(testStorey.id, floorOpeningPolygon)

    const originalStoreys = modelActions.getStoreysOrderedByLevel()
    const originalData = originalStoreys.map(storey => ({
      storey,
      perimeters: modelActions.getPerimetersByStorey(storey.id),
      floorAreas: modelActions.getFloorAreasByStorey(storey.id),
      floorOpenings: modelActions.getFloorOpeningsByStorey(storey.id)
    }))
    const originalWalls = modelActions.getAllPerimeterWalls()
    const originalCorners = modelActions.getAllPerimeters().flatMap(p => modelActions.getPerimeterCornersById(p.id))
    const originalConfig = getConfigState()
    const originalMaterials = getMaterialsState()
    const originalOpenings = modelActions.getAllWallOpenings()
    const originalPosts = modelActions.getAllWallPosts()

    const exportResult = await ProjectImportExportService.exportToString()
    expect(exportResult.success).toBe(true)

    if (!exportResult.success) return

    modelActions.reset()

    const emptyStoreys = modelActions.getStoreysOrderedByLevel()
    expect(emptyStoreys).toHaveLength(1)
    expect(emptyStoreys[0].name).toBe('Ground Floor')
    expect(emptyStoreys[0].level).toBe(0)

    const importResult = await ProjectImportExportService.importFromString(exportResult.content)

    if (!importResult.success) {
      console.error('Import failed:', importResult.error)
    }
    expect(importResult.success).toBe(true)

    if (!importResult.success) return

    const importedStoreys = modelActions.getStoreysOrderedByLevel()
    const importedConfig = getConfigState()
    const importedMaterials = getMaterialsState()

    const stripNameKeys = (obj: unknown): unknown => {
      if (obj === null || typeof obj !== 'object') return obj
      if (Array.isArray(obj)) return obj.map(stripNameKeys)
      const result: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        if (key === 'nameKey') continue
        result[key] = stripNameKeys(value)
      }
      return result
    }

    expect(stripNameKeys(importedConfig)).toEqual(stripNameKeys(originalConfig))
    expect(stripNameKeys(importedMaterials)).toEqual(stripNameKeys(originalMaterials))

    expect(importedStoreys).toHaveLength(originalData.length)

    for (let i = 0; i < originalData.length; i++) {
      const {
        storey: originalStorey,
        perimeters: originalPerimeters,
        floorAreas: originalFloorAreas,
        floorOpenings: originalFloorOpenings
      } = originalData[i]
      const importedStorey = importedStoreys[i]

      expect(importedStorey.name).toBe(originalStorey.name)
      expect(importedStorey.level).toBe(originalStorey.level)
      expect(importedStorey.floorHeight).toBe(originalStorey.floorHeight)

      const importedPerimeters = modelActions.getPerimetersByStorey(importedStorey.id)
      const importedFloorAreas = modelActions.getFloorAreasByStorey(importedStorey.id)
      const importedFloorOpenings = modelActions.getFloorOpeningsByStorey(importedStorey.id)

      expect(importedPerimeters).toHaveLength(originalPerimeters.length)

      for (let j = 0; j < originalPerimeters.length; j++) {
        const originalPerimeter = originalPerimeters[j]
        const importedPerimeter = importedPerimeters[j]

        expect(importedPerimeter.referenceSide).toBe(originalPerimeter.referenceSide)

        expect(importedPerimeter.cornerIds).toHaveLength(originalPerimeter.cornerIds.length)
        for (let k = 0; k < originalPerimeter.cornerIds.length; k++) {
          const originalCorner = originalCorners.find(c => c.id === originalPerimeter.cornerIds[k])!
          const importedCorner = modelActions.getPerimeterCornerById(importedPerimeter.cornerIds[k])

          expect(importedCorner.insidePoint[0]).toBeCloseTo(originalCorner.insidePoint[0], 5)
          expect(importedCorner.insidePoint[1]).toBeCloseTo(originalCorner.insidePoint[1], 5)
          expect(importedCorner.constructedByWall).toBe(originalCorner.constructedByWall)
        }

        expect(importedPerimeter.wallIds).toHaveLength(originalPerimeter.wallIds.length)
        for (let k = 0; k < originalPerimeter.wallIds.length; k++) {
          const importedWall = modelActions.getPerimeterWallById(importedPerimeter.wallIds[k])
          const originalWall = originalWalls.find(w => w.id === originalPerimeter.wallIds[k])!
          expect(importedWall.baseRingBeamAssemblyId).toBe(originalWall.baseRingBeamAssemblyId)
          expect(importedWall.topRingBeamAssemblyId).toBe(originalWall.topRingBeamAssemblyId)

          expect(importedWall.thickness).toBe(originalWall.thickness)
          expect(importedWall.wallAssemblyId).toBe(originalWall.wallAssemblyId)

          expect(importedWall.entityIds).toHaveLength(originalWall.entityIds.length)

          for (let l = 0; l < originalWall.entityIds.length; l++) {
            const originalId = originalWall.entityIds[l]
            const originalEntity = isOpeningId(originalId)
              ? originalOpenings.find(o => o.id === originalId)!
              : originalPosts.find(p => p.id === originalId)!
            const importedId = importedWall.entityIds[l]
            const importedEntity = isOpeningId(importedId)
              ? modelActions.getWallOpeningById(importedId)
              : modelActions.getWallPostById(importedId)

            expect(importedEntity.type).toBe(originalEntity.type)
            expect(importedEntity.centerOffsetFromWallStart).toBe(originalEntity.centerOffsetFromWallStart)
            expect(importedEntity.width).toBe(originalEntity.width)
          }

          const openingIndices = originalWall.entityIds
            .map((id, idx) => ({ id, idx }))
            .filter(({ id }) => isOpeningId(id))
            .map(({ idx }) => idx)

          for (const l of openingIndices) {
            const originalId = originalWall.entityIds[l]
            const importedId = importedWall.entityIds[l]
            expect.assert(isOpeningId(originalId))
            expect.assert(isOpeningId(importedId))
            const originalEntity = originalOpenings.find(o => o.id === originalId)!
            const importedEntity = modelActions.getWallOpeningById(importedId)

            expect(importedEntity.height).toBe(originalEntity.height)

            expect.assert(originalEntity.sillHeight !== undefined ? importedEntity.sillHeight !== undefined : true)
            expect(importedEntity.sillHeight).toBe(originalEntity.sillHeight)
          }

          const postIndices = originalWall.entityIds
            .map((id, idx) => ({ id, idx }))
            .filter(({ id }) => !isOpeningId(id))
            .map(({ idx }) => idx)

          for (const l of postIndices) {
            const originalId = originalWall.entityIds[l]
            const importedId = importedWall.entityIds[l]
            expect.assert(!isOpeningId(originalId))
            expect.assert(!isOpeningId(importedId))
            const originalEntity = originalPosts.find(p => p.id === originalId)!
            const importedEntity = modelActions.getWallPostById(importedId)

            expect(importedEntity.thickness).toBe(originalEntity.thickness)
            expect(importedEntity.postType).toBe(originalEntity.postType)
            expect(importedEntity.replacesPosts).toBe(originalEntity.replacesPosts)
            expect(importedEntity.infillMaterial).toBe(originalEntity.infillMaterial)
            expect(importedEntity.material).toBe(originalEntity.material)
          }
        }
      }

      expect(importedFloorAreas).toHaveLength(originalFloorAreas.length)
      for (let j = 0; j < originalFloorAreas.length; j++) {
        const originalArea = originalFloorAreas[j]
        const importedArea = importedFloorAreas[j]
        expect(importedArea.area.points).toHaveLength(originalArea.area.points.length)
        for (let k = 0; k < originalArea.area.points.length; k++) {
          expect(importedArea.area.points[k][0]).toBeCloseTo(originalArea.area.points[k][0])
          expect(importedArea.area.points[k][1]).toBeCloseTo(originalArea.area.points[k][1])
        }
      }

      expect(importedFloorOpenings).toHaveLength(originalFloorOpenings.length)
      for (let j = 0; j < originalFloorOpenings.length; j++) {
        const originalOpening = originalFloorOpenings[j]
        const importedOpening = importedFloorOpenings[j]
        expect(importedOpening.area.points).toHaveLength(originalOpening.area.points.length)
        for (let k = 0; k < originalOpening.area.points.length; k++) {
          expect(importedOpening.area.points[k][0]).toBeCloseTo(originalOpening.area.points[k][0])
          expect(importedOpening.area.points[k][1]).toBeCloseTo(originalOpening.area.points[k][1])
        }
      }
    }
  })

  it('handles multiple storeys with complex data', async () => {
    const modelActions = getModelActions()

    const ground = modelActions.getStoreysOrderedByLevel()[0]
    const firstFloor = modelActions.addStorey(2800)
    modelActions.addStorey(2600)

    const wallAssemblyId = getConfigActions().getDefaultWallAssemblyId()

    const groundBoundary = {
      points: [newVec2(0, 0), newVec2(10000, 0), newVec2(10000, 8000), newVec2(0, 8000)]
    }

    const firstFloorBoundary = {
      points: [newVec2(1000, 1000), newVec2(9000, 1000), newVec2(9000, 7000), newVec2(1000, 7000)]
    }

    modelActions.addPerimeter(ground.id, groundBoundary, wallAssemblyId, 200)
    modelActions.addPerimeter(firstFloor.id, firstFloorBoundary, wallAssemblyId, 180)

    const exportResult = await ProjectImportExportService.exportToString()
    expect(exportResult.success).toBe(true)

    if (!exportResult.success) return

    modelActions.reset()

    const importResult = await ProjectImportExportService.importFromString(exportResult.content)
    expect(importResult.success).toBe(true)

    const importedStoreys = modelActions.getStoreysOrderedByLevel()
    expect(importedStoreys).toHaveLength(3)

    expect(importedStoreys[0].level).toBe(0)
    expect(importedStoreys[1].level).toBe(1)
    expect(importedStoreys[2].level).toBe(2)

    const perimetersGroundFloor = modelActions.getPerimetersByStorey(importedStoreys[0].id)
    expect(perimetersGroundFloor).toHaveLength(1)

    const perimetersFirstFloor = modelActions.getPerimetersByStorey(importedStoreys[1].id)
    expect(perimetersFirstFloor).toHaveLength(1)

    const perimetersSecondFloor = modelActions.getPerimetersByStorey(importedStoreys[2].id)
    expect(perimetersSecondFloor).toHaveLength(0)
  })

  it('preserves multiple storeys correctly', async () => {
    const modelActions = getModelActions()

    const firstFloor = modelActions.addStorey(2800)
    modelActions.updateStoreyName(firstFloor.id, 'First Floor')
    modelActions.addStorey(2600)

    const storeys = modelActions.getStoreysOrderedByLevel()
    expect(storeys[0].level).toBe(0)
    expect(storeys[1].level).toBe(1)
    expect(storeys[2].level).toBe(2)

    const exportResult = await ProjectImportExportService.exportToString()
    expect(exportResult.success).toBe(true)

    if (!exportResult.success) return

    modelActions.reset()

    const importResult = await ProjectImportExportService.importFromString(exportResult.content)

    expect(importResult.success).toBe(true)

    const importedStoreys = modelActions.getStoreysOrderedByLevel()
    expect(importedStoreys).toHaveLength(3)
    expect(importedStoreys[0].level).toBe(0)
    expect(importedStoreys[0].useDefaultName).toBe(true)
    expect(importedStoreys[1].level).toBe(1)
    expect(importedStoreys[1].name).toBe('First Floor')
    expect(importedStoreys[1].useDefaultName).toBe(false)
    expect(importedStoreys[2].level).toBe(2)
    expect(importedStoreys[2].useDefaultName).toBe(true)
  })

  it('correctly handles level adjustments with minLevel', async () => {
    const modelActions = getModelActions()

    const firstFloor = modelActions.addStorey(2800)
    modelActions.updateStoreyName(firstFloor.id, 'First Floor')
    modelActions.addStorey(2600)

    modelActions.adjustAllLevels(-1)

    const originalStoreys = modelActions.getStoreysOrderedByLevel()
    expect(originalStoreys[0].level).toBe(-1)
    expect(originalStoreys[1].level).toBe(0)
    expect(originalStoreys[2].level).toBe(1)

    const exportResult = await ProjectImportExportService.exportToString()
    expect(exportResult.success).toBe(true)

    if (!exportResult.success) return

    const exportedData = JSON.parse(exportResult.content)
    expect(exportedData.version).toBe('2.0.0')
    expect(exportedData.stores.model.state).toBeDefined()
    expect(exportedData.stores.model.version).toBeDefined()

    modelActions.reset()

    const importResult = await ProjectImportExportService.importFromString(exportResult.content)
    expect(importResult.success).toBe(true)

    const importedStoreys = modelActions.getStoreysOrderedByLevel()
    expect(importedStoreys).toHaveLength(3)
    expect(importedStoreys[0].level).toBe(-1)
    expect(importedStoreys[0].useDefaultName).toBe(true)
    expect(importedStoreys[1].level).toBe(0)
    expect(importedStoreys[1].name).toBe('First Floor')
    expect(importedStoreys[1].useDefaultName).toBe(false)
    expect(importedStoreys[2].level).toBe(1)
    expect(importedStoreys[2].useDefaultName).toBe(true)
  })

  it('exports and imports materials with configurations', async () => {
    const { getMaterialsActions } = await import('@/construction/materials/store')
    const materialsActions = getMaterialsActions()

    const customMaterial = materialsActions.addMaterial({
      type: 'dimensional',
      name: 'Custom Wood',
      color: '#ff5500',
      crossSections: [{ smallerLength: 80, biggerLength: 200 }],
      lengths: [4000, 6000]
    })

    const exportResult = await ProjectImportExportService.exportToString()
    expect(exportResult.success).toBe(true)

    if (!exportResult.success) return

    const exportedData = JSON.parse(exportResult.content)
    expect(exportedData.version).toBe('2.0.0')
    expect(exportedData.stores.materials).toBeDefined()
    expect(exportedData.stores.materials.state).toBeDefined()
    expect(exportedData.stores.materials.state.materials[customMaterial.id]).toEqual(customMaterial)

    const { _clearAllMaterials } = await import('@/construction/materials/store')
    _clearAllMaterials()

    const importResult = await ProjectImportExportService.importFromString(exportResult.content)
    expect(importResult.success).toBe(true)

    const restoredMaterial = materialsActions.getMaterialById(customMaterial.id)
    expect(restoredMaterial).toEqual(customMaterial)
  })

  it('preserves roof perimeter references across export/import', async () => {
    const modelActions = getModelActions()

    const existingStoreys = modelActions.getStoreysOrderedByLevel()
    const testStorey = existingStoreys[0]

    const boundary = {
      points: [newVec2(0, 0), newVec2(8000, 0), newVec2(8000, 6000), newVec2(0, 6000)]
    }

    const wallAssemblyId = getConfigActions().getDefaultWallAssemblyId()
    const perimeter = modelActions.addPerimeter(
      testStorey.id,
      boundary,
      wallAssemblyId,
      200,
      undefined,
      undefined,
      'inside'
    )

    const roofAssemblyId = getConfigActions().getDefaultRoofAssemblyId()

    const roofPolygon = {
      points: [newVec2(0, 0), newVec2(8000, 0), newVec2(8000, 6000), newVec2(0, 6000)]
    }
    const roof = modelActions.addRoof(
      testStorey.id,
      'gable',
      roofPolygon,
      0,
      30,
      100,
      500,
      roofAssemblyId,
      perimeter.id
    )

    expect(roof.referencePerimeter).toBe(perimeter.id)

    const originalRoofData = {
      type: roof.type,
      mainSideIndex: roof.mainSideIndex,
      slope: roof.slope,
      verticalOffset: roof.verticalOffset,
      assemblyId: roof.assemblyId,
      referencePerimeterExists: !!roof.referencePerimeter
    }

    const exportResult = await ProjectImportExportService.exportToString()
    expect(exportResult.success).toBe(true)

    if (!exportResult.success) return

    const exportedData = JSON.parse(exportResult.content)
    expect(exportedData.version).toBe('2.0.0')
    expect(exportedData.stores.model.state).toBeDefined()
    expect(exportedData.stores.model.state.perimeters).toBeDefined()
    expect(exportedData.stores.model.state.roofs).toBeDefined()

    modelActions.reset()

    const importResult = await ProjectImportExportService.importFromString(exportResult.content)
    expect(importResult.success).toBe(true)

    if (!importResult.success) return

    const importedStoreys = modelActions.getStoreysOrderedByLevel()
    const importedPerimeters = modelActions.getPerimetersByStorey(importedStoreys[0].id)
    const importedRoofs = modelActions.getRoofsByStorey(importedStoreys[0].id)

    expect(importedPerimeters).toHaveLength(1)
    expect(importedRoofs).toHaveLength(1)

    const importedPerimeter = importedPerimeters[0]
    const importedRoof = importedRoofs[0]

    expect(importedRoof.type).toBe(originalRoofData.type)
    expect(importedRoof.mainSideIndex).toBe(originalRoofData.mainSideIndex)
    expect(importedRoof.slope).toBe(originalRoofData.slope)
    expect(importedRoof.verticalOffset).toBe(originalRoofData.verticalOffset)
    expect(importedRoof.assemblyId).toBe(originalRoofData.assemblyId)

    expect(importedRoof.referencePerimeter).toBeDefined()
    expect(importedRoof.referencePerimeter).toBe(importedPerimeter.id)
  })
})
