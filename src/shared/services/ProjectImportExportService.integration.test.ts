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
    // Reset stores to clean state before each test
    getModelActions().reset()

    // Ensure we have some default config
    getConfigActions().reset()

    // Ensure we have some default materials
    getMaterialsActions().reset()
  })

  it('exports and imports project data with full fidelity (except IDs)', async () => {
    const modelActions = getModelActions()

    // 1. Set up test data in the actual stores

    // Use the default ground floor that already exists
    const existingStoreys = modelActions.getStoreysOrderedByLevel()
    const testStorey = existingStoreys[0] // Use the default ground floor

    // Update its properties
    modelActions.updateStoreyName(testStorey.id, 'Test Floor')
    modelActions.updateStoreyFloorHeight(testStorey.id, 3000)

    // Create a perimeter with custom boundary
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

    // Add openings to walls
    const wall1 = perimeter.wallIds[0]
    const wall2 = perimeter.wallIds[1]

    // Add a door to the first wall
    modelActions.addWallOpening(wall1, {
      openingType: 'door',
      centerOffsetFromWallStart: 1000,
      width: 900,
      height: 2100,
      sillHeight: undefined
    })

    // Add a window to the second wall
    modelActions.addWallOpening(wall2, {
      openingType: 'window',
      centerOffsetFromWallStart: 2000,
      width: 1200,
      height: 1500,
      sillHeight: 800
    })

    // Modify wall thickness on third wall
    const wall3 = perimeter.wallIds[2]
    modelActions.updatePerimeterWallThickness(wall3, 300)

    // Update corner construction
    const corner1 = perimeter.cornerIds[0]
    modelActions.updatePerimeterCornerConstructedByWall(corner1, 'previous')

    // Add floor area
    const floorAreaPolygon = {
      points: [newVec2(500, 500), newVec2(7000, 500), newVec2(7000, 5500), newVec2(500, 5500)]
    }
    modelActions.addFloorArea(testStorey.id, floorAreaPolygon)

    // Add floor opening
    const floorOpeningPolygon = {
      points: [newVec2(2000, 2000), newVec2(3000, 2000), newVec2(3000, 3000), newVec2(2000, 3000)]
    }
    modelActions.addFloorOpening(testStorey.id, floorOpeningPolygon)

    // 2. Capture the original data for comparison (including perimeters before reset)
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

    // 3. Export the project
    const exportResult = await ProjectImportExportService.exportToString()
    expect(exportResult.success).toBe(true)

    if (!exportResult.success) return

    // 4. Reset the stores (simulating a fresh application state)
    modelActions.reset()

    // Verify stores are reset
    const emptyStoreys = modelActions.getStoreysOrderedByLevel()
    expect(emptyStoreys).toHaveLength(1) // Should have default ground floor
    expect(emptyStoreys[0].name).toBe('Ground Floor')
    expect(emptyStoreys[0].level).toBe(0)

    // 5. Import the exported data
    const importResult = await ProjectImportExportService.importFromString(exportResult.content)

    if (!importResult.success) {
      console.error('Import failed:', importResult.error)
    }
    expect(importResult.success).toBe(true)

    if (!importResult.success) return

    // 6. Verify the imported data matches the original (except for IDs)
    const importedStoreys = modelActions.getStoreysOrderedByLevel()
    const importedConfig = getConfigState()
    const importedMaterials = getMaterialsState()

    // Check config state is restored (excluding nameKey functions which don't serialize)
    // Helper to recursively strip nameKey functions for comparison
    const stripNameKeys = (obj: any): any => {
      if (obj === null || typeof obj !== 'object') return obj
      if (Array.isArray(obj)) return obj.map(stripNameKeys)
      const result: any = {}
      for (const [key, value] of Object.entries(obj)) {
        if (key === 'nameKey') continue // Skip nameKey functions
        result[key] = stripNameKeys(value)
      }
      return result
    }

    expect(stripNameKeys(importedConfig)).toEqual(stripNameKeys(originalConfig))

    // Check materials state is restored (excluding nameKey functions)
    expect(stripNameKeys(importedMaterials)).toEqual(stripNameKeys(originalMaterials))

    // Check storey data
    expect(importedStoreys).toHaveLength(originalData.length)

    for (let i = 0; i < originalData.length; i++) {
      const {
        storey: originalStorey,
        perimeters: originalPerimeters,
        floorAreas: originalFloorAreas,
        floorOpenings: originalFloorOpenings
      } = originalData[i]
      const importedStorey = importedStoreys[i]

      // Compare storey properties (excluding IDs)
      expect(importedStorey.name).toBe(originalStorey.name)
      expect(importedStorey.level).toBe(originalStorey.level)
      expect(Number(importedStorey.floorHeight)).toBe(Number(originalStorey.floorHeight))

      // Get imported perimeters for comparison
      const importedPerimeters = modelActions.getPerimetersByStorey(importedStorey.id)
      const importedFloorAreas = modelActions.getFloorAreasByStorey(importedStorey.id)
      const importedFloorOpenings = modelActions.getFloorOpeningsByStorey(importedStorey.id)

      expect(importedPerimeters).toHaveLength(originalPerimeters.length)

      for (let j = 0; j < originalPerimeters.length; j++) {
        const originalPerimeter = originalPerimeters[j]
        const importedPerimeter = importedPerimeters[j]

        expect(importedPerimeter.referenceSide).toBe(originalPerimeter.referenceSide)

        // Compare corners (excluding IDs)
        expect(importedPerimeter.cornerIds).toHaveLength(originalPerimeter.cornerIds.length)
        for (let k = 0; k < originalPerimeter.cornerIds.length; k++) {
          const originalCorner = originalCorners.find(c => c.id === originalPerimeter.cornerIds[k])!
          const importedCorner = modelActions.getPerimeterCornerById(importedPerimeter.cornerIds[k])

          expect(importedCorner.insidePoint[0]).toBeCloseTo(originalCorner.insidePoint[0], 5)
          expect(importedCorner.insidePoint[1]).toBeCloseTo(originalCorner.insidePoint[1], 5)
          expect(importedCorner.constructedByWall).toBe(originalCorner.constructedByWall)
        }

        // Compare walls (excluding IDs)
        expect(importedPerimeter.wallIds).toHaveLength(originalPerimeter.wallIds.length)
        for (let k = 0; k < originalPerimeter.wallIds.length; k++) {
          const importedWall = modelActions.getPerimeterWallById(originalPerimeter.wallIds[k])
          const originalWall = originalWalls.find(w => w.id === originalPerimeter.wallIds[k])!
          expect(importedWall.baseRingBeamAssemblyId).toBe(originalWall?.baseRingBeamAssemblyId)
          expect(importedWall.topRingBeamAssemblyId).toBe(originalWall?.topRingBeamAssemblyId)

          expect(Number(importedWall.thickness)).toBe(Number(originalWall.thickness))
          expect(importedWall.wallAssemblyId).toBe(originalWall.wallAssemblyId)

          // Compare openings (excluding IDs)
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
            expect(Number(importedEntity.centerOffsetFromWallStart)).toBe(
              Number(originalEntity.centerOffsetFromWallStart)
            )
            expect(Number(importedEntity.width)).toBe(Number(originalEntity.width))

            if (importedEntity.type === 'opening' && originalEntity.type === 'opening') {
              expect(Number(importedEntity.height)).toBe(Number(originalEntity.height))

              if (originalEntity.sillHeight) {
                expect(Number(importedEntity.sillHeight!)).toBe(Number(originalEntity.sillHeight))
              } else {
                expect(importedEntity.sillHeight).toBeUndefined()
              }
            } else if (importedEntity.type === 'post' && originalEntity.type === 'post') {
              expect(Number(importedEntity.thickness)).toBe(Number(originalEntity.thickness))
              expect(importedEntity.postType).toBe(originalEntity.postType)
              expect(importedEntity.replacesPosts).toBe(originalEntity.replacesPosts)
              expect(importedEntity.infillMaterial).toBe(originalEntity.infillMaterial)
              expect(importedEntity.material).toBe(originalEntity.material)
            }
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

    // Create multiple storeys
    const ground = modelActions.getStoreysOrderedByLevel()[0] // Default ground floor
    const firstFloor = modelActions.addStorey(2800)
    modelActions.addStorey(2600)

    // Add perimeters to each storey
    const wallAssemblyId = getConfigActions().getDefaultWallAssemblyId()

    // Different shaped perimeters for each floor
    const groundBoundary = {
      points: [newVec2(0, 0), newVec2(10000, 0), newVec2(10000, 8000), newVec2(0, 8000)]
    }

    const firstFloorBoundary = {
      points: [newVec2(1000, 1000), newVec2(9000, 1000), newVec2(9000, 7000), newVec2(1000, 7000)]
    }

    modelActions.addPerimeter(ground.id, groundBoundary, wallAssemblyId, 200)
    modelActions.addPerimeter(firstFloor.id, firstFloorBoundary, wallAssemblyId, 180)

    // Export and import
    const exportResult = await ProjectImportExportService.exportToString()
    expect(exportResult.success).toBe(true)

    if (!exportResult.success) return

    modelActions.reset()

    const importResult = await ProjectImportExportService.importFromString(exportResult.content)
    expect(importResult.success).toBe(true)

    // Verify all storeys were restored
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

    // Create additional storeys above ground (keeping ground floor at level 0)
    const firstFloor = modelActions.addStorey(2800)
    modelActions.updateStoreyName(firstFloor.id, 'First Floor')
    modelActions.addStorey(2600)

    const storeys = modelActions.getStoreysOrderedByLevel()
    expect(storeys[0].level).toBe(0) // ground floor
    expect(storeys[1].level).toBe(1) // first floor
    expect(storeys[2].level).toBe(2) // second floor

    // Export and import
    const exportResult = await ProjectImportExportService.exportToString()
    expect(exportResult.success).toBe(true)

    if (!exportResult.success) return

    modelActions.reset()

    const importResult = await ProjectImportExportService.importFromString(exportResult.content)

    expect(importResult.success).toBe(true)

    // Verify storeys are preserved
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

    // Create storeys and manually adjust levels to start at a higher base
    const firstFloor = modelActions.addStorey(2800)
    modelActions.updateStoreyName(firstFloor.id, 'First Floor')
    modelActions.addStorey(2600)

    // Adjust all levels up by -1 (so we have levels -1, 0, 1)
    modelActions.adjustAllLevels(-1)

    const originalStoreys = modelActions.getStoreysOrderedByLevel()
    expect(originalStoreys[0].level).toBe(-1)
    expect(originalStoreys[1].level).toBe(0)
    expect(originalStoreys[2].level).toBe(1)

    // Export and import
    const exportResult = await ProjectImportExportService.exportToString()
    expect(exportResult.success).toBe(true)

    if (!exportResult.success) return

    // Verify the export includes the correct minLevel
    const exportedData = JSON.parse(exportResult.content)
    expect(exportedData.modelStore.minLevel).toBe(-1)

    modelActions.reset()

    const importResult = await ProjectImportExportService.importFromString(exportResult.content)
    expect(importResult.success).toBe(true)

    // Verify levels are restored correctly
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

    // Add a custom material
    const customMaterial = materialsActions.addMaterial({
      type: 'dimensional',
      name: 'Custom Wood',
      color: '#ff5500',
      crossSections: [{ smallerLength: 80, biggerLength: 200 }],
      lengths: [4000, 6000]
    })

    // Export the project
    const exportResult = await ProjectImportExportService.exportToString()
    expect(exportResult.success).toBe(true)

    if (!exportResult.success) return

    // Verify export contains materials
    const exportedData = JSON.parse(exportResult.content)
    expect(exportedData.materialsStore).toBeDefined()
    expect(exportedData.materialsStore.materials).toBeDefined()
    expect(exportedData.materialsStore.materials[customMaterial.id]).toEqual(customMaterial)

    // Reset materials store
    const { _clearAllMaterials } = await import('@/construction/materials/store')
    _clearAllMaterials()

    // Import the data
    const importResult = await ProjectImportExportService.importFromString(exportResult.content)
    expect(importResult.success).toBe(true)

    // Verify custom material was restored
    const restoredMaterial = materialsActions.getMaterialById(customMaterial.id)
    expect(restoredMaterial).toEqual(customMaterial)
  })

  it('preserves roof perimeter references across export/import', async () => {
    const modelActions = getModelActions()

    // Use the default ground floor that already exists
    const existingStoreys = modelActions.getStoreysOrderedByLevel()
    const testStorey = existingStoreys[0]

    // Create a perimeter
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

    // Get the roof assembly ID from config
    const roofAssemblyId = getConfigActions().getDefaultRoofAssemblyId()
    if (!roofAssemblyId) {
      throw new Error('No roof assembly config found')
    }

    // Add a roof that references the perimeter
    const roofPolygon = {
      points: [newVec2(0, 0), newVec2(8000, 0), newVec2(8000, 6000), newVec2(0, 6000)]
    }
    const roof = modelActions.addRoof(
      testStorey.id,
      'gable',
      roofPolygon,
      0, // mainSideIndex
      30, // slope in degrees
      100, // verticalOffset
      500, // overhang
      roofAssemblyId,
      perimeter.id // reference to the perimeter
    )

    // Verify the roof has the perimeter reference before export
    expect(roof.referencePerimeter).toBe(perimeter.id)

    // Capture original data
    const originalPerimeterId = perimeter.id
    const originalRoofData = {
      type: roof.type,
      mainSideIndex: roof.mainSideIndex,
      slope: roof.slope,
      verticalOffset: Number(roof.verticalOffset),
      assemblyId: roof.assemblyId,
      referencePerimeterExists: !!roof.referencePerimeter
    }

    // Export the project
    const exportResult = await ProjectImportExportService.exportToString()
    expect(exportResult.success).toBe(true)

    if (!exportResult.success) return

    // Verify the exported data contains the perimeter ID
    const exportedData = JSON.parse(exportResult.content)
    const exportedStorey = exportedData.modelStore.storeys[0]
    expect(exportedStorey.perimeters).toHaveLength(1)
    expect(exportedStorey.perimeters[0].id).toBe(originalPerimeterId)
    expect(exportedStorey.roofs).toHaveLength(1)
    expect(exportedStorey.roofs[0].referencePerimeter).toBe(originalPerimeterId)

    // Reset the stores
    modelActions.reset()

    // Import the exported data
    const importResult = await ProjectImportExportService.importFromString(exportResult.content)
    expect(importResult.success).toBe(true)

    if (!importResult.success) return

    // Verify the imported data
    const importedStoreys = modelActions.getStoreysOrderedByLevel()
    const importedPerimeters = modelActions.getPerimetersByStorey(importedStoreys[0].id)
    const importedRoofs = modelActions.getRoofsByStorey(importedStoreys[0].id)

    expect(importedPerimeters).toHaveLength(1)
    expect(importedRoofs).toHaveLength(1)

    const importedPerimeter = importedPerimeters[0]
    const importedRoof = importedRoofs[0]

    // Verify roof properties
    expect(importedRoof.type).toBe(originalRoofData.type)
    expect(importedRoof.mainSideIndex).toBe(originalRoofData.mainSideIndex)
    expect(importedRoof.slope).toBe(originalRoofData.slope)
    expect(Number(importedRoof.verticalOffset)).toBe(originalRoofData.verticalOffset)
    expect(importedRoof.assemblyId).toBe(originalRoofData.assemblyId)

    // Most importantly: verify the roof reference points to the imported perimeter
    // The ID will be different, but the reference should be preserved
    expect(importedRoof.referencePerimeter).toBeDefined()
    expect(importedRoof.referencePerimeter).toBe(importedPerimeter.id)
  })
})
