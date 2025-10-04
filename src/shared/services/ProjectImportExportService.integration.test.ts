import { beforeEach, describe, expect, it } from 'vitest'

import type { PerimeterConstructionMethodId, RingBeamConstructionMethodId } from '@/building/model/ids'
import { getModelActions } from '@/building/store'
import { getConfigState, setConfigState } from '@/construction/config/store'
import { createLength, createVec2 } from '@/shared/geometry'

import { ProjectImportExportService } from './ProjectImportExportService'

describe('ProjectImportExportService Integration', () => {
  beforeEach(() => {
    // Reset stores to clean state before each test
    const modelActions = getModelActions()
    modelActions.reset()

    // Ensure we have some default config
    const defaultConfig = getConfigState()
    setConfigState(defaultConfig)
  })

  it('exports and imports project data with full fidelity (except IDs)', async () => {
    const modelActions = getModelActions()

    // 1. Set up test data in the actual stores

    // Use the default ground floor that already exists
    const existingStoreys = modelActions.getStoreysOrderedByLevel()
    const testStorey = existingStoreys[0] // Use the default ground floor

    // Update its properties
    modelActions.updateStoreyName(testStorey.id, 'Test Floor')
    modelActions.updateStoreyHeight(testStorey.id, createLength(3000))

    // Create a perimeter with custom boundary
    const boundary = {
      points: [createVec2(0, 0), createVec2(8000, 0), createVec2(8000, 6000), createVec2(0, 6000)]
    }

    const constructionMethodId = Object.keys(
      getConfigState().perimeterConstructionMethods
    )[0] as PerimeterConstructionMethodId
    const ringBeamMethodId = Object.keys(
      getConfigState().ringBeamConstructionMethods
    )[0] as RingBeamConstructionMethodId

    const perimeter = modelActions.addPerimeter(
      testStorey.id,
      boundary,
      constructionMethodId,
      createLength(200),
      ringBeamMethodId,
      ringBeamMethodId
    )

    // Add openings to walls
    const wall1 = perimeter.walls[0]
    const wall2 = perimeter.walls[1]

    // Add a door to the first wall
    modelActions.addPerimeterWallOpening(perimeter.id, wall1.id, {
      type: 'door',
      offsetFromStart: createLength(1000),
      width: createLength(900),
      height: createLength(2100),
      sillHeight: undefined
    })

    // Add a window to the second wall
    modelActions.addPerimeterWallOpening(perimeter.id, wall2.id, {
      type: 'window',
      offsetFromStart: createLength(2000),
      width: createLength(1200),
      height: createLength(1500),
      sillHeight: createLength(800)
    })

    // Modify wall thickness on third wall
    const wall3 = perimeter.walls[2]
    modelActions.updatePerimeterWallThickness(perimeter.id, wall3.id, createLength(300))

    // Update corner construction
    const corner1 = perimeter.corners[0]
    modelActions.updatePerimeterCornerConstructedByWall(perimeter.id, corner1.id, 'previous')

    // 2. Capture the original data for comparison (including perimeters before reset)
    const originalStoreys = modelActions.getStoreysOrderedByLevel()
    const originalData = originalStoreys.map(storey => ({
      storey,
      perimeters: modelActions.getPerimetersByStorey(storey.id)
    }))
    const originalConfig = getConfigState()

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

    expect(importResult.success).toBe(true)

    if (!importResult.success) return

    // 6. Verify the imported data matches the original (except for IDs)
    const importedStoreys = modelActions.getStoreysOrderedByLevel()
    const importedConfig = getConfigState()

    // Check config state is restored
    expect(importedConfig).toEqual(originalConfig)

    // Check storey data
    expect(importedStoreys).toHaveLength(originalData.length)

    for (let i = 0; i < originalData.length; i++) {
      const { storey: originalStorey, perimeters: originalPerimeters } = originalData[i]
      const importedStorey = importedStoreys[i]

      // Compare storey properties (excluding IDs)
      expect(importedStorey.name).toBe(originalStorey.name)
      expect(importedStorey.level).toBe(originalStorey.level)
      expect(Number(importedStorey.height)).toBe(Number(originalStorey.height))

      // Get imported perimeters for comparison
      const importedPerimeters = modelActions.getPerimetersByStorey(importedStorey.id)

      expect(importedPerimeters).toHaveLength(originalPerimeters.length)

      for (let j = 0; j < originalPerimeters.length; j++) {
        const originalPerimeter = originalPerimeters[j]
        const importedPerimeter = importedPerimeters[j]

        // Compare perimeter ring beam settings
        expect(importedPerimeter.baseRingBeamMethodId).toBe(originalPerimeter.baseRingBeamMethodId)
        expect(importedPerimeter.topRingBeamMethodId).toBe(originalPerimeter.topRingBeamMethodId)

        // Compare corners (excluding IDs)
        expect(importedPerimeter.corners).toHaveLength(originalPerimeter.corners.length)
        for (let k = 0; k < originalPerimeter.corners.length; k++) {
          const originalCorner = originalPerimeter.corners[k]
          const importedCorner = importedPerimeter.corners[k]

          expect(importedCorner.insidePoint[0]).toBeCloseTo(originalCorner.insidePoint[0], 0)
          expect(importedCorner.insidePoint[1]).toBeCloseTo(originalCorner.insidePoint[1], 0)
          expect(importedCorner.constuctedByWall).toBe(originalCorner.constuctedByWall)
        }

        // Compare walls (excluding IDs)
        expect(importedPerimeter.walls).toHaveLength(originalPerimeter.walls.length)
        for (let k = 0; k < originalPerimeter.walls.length; k++) {
          const originalWall = originalPerimeter.walls[k]
          const importedWall = importedPerimeter.walls[k]

          expect(Number(importedWall.thickness)).toBe(Number(originalWall.thickness))
          expect(importedWall.constructionMethodId).toBe(originalWall.constructionMethodId)

          // Compare openings (excluding IDs)
          expect(importedWall.openings).toHaveLength(originalWall.openings.length)
          for (let l = 0; l < originalWall.openings.length; l++) {
            const originalOpening = originalWall.openings[l]
            const importedOpening = importedWall.openings[l]

            expect(importedOpening.type).toBe(originalOpening.type)
            expect(Number(importedOpening.offsetFromStart)).toBe(Number(originalOpening.offsetFromStart))
            expect(Number(importedOpening.width)).toBe(Number(originalOpening.width))
            expect(Number(importedOpening.height)).toBe(Number(originalOpening.height))

            if (originalOpening.sillHeight) {
              expect(Number(importedOpening.sillHeight!)).toBe(Number(originalOpening.sillHeight))
            } else {
              expect(importedOpening.sillHeight).toBeUndefined()
            }
          }
        }
      }
    }
  })

  it('handles multiple storeys with complex data', async () => {
    const modelActions = getModelActions()

    // Create multiple storeys
    const ground = modelActions.getStoreysOrderedByLevel()[0] // Default ground floor
    const firstFloor = modelActions.addStorey('First Floor', createLength(2800))
    modelActions.addStorey('Second Floor', createLength(2600))

    // Add perimeters to each storey
    const constructionMethodId = Object.keys(
      getConfigState().perimeterConstructionMethods
    )[0] as PerimeterConstructionMethodId

    // Different shaped perimeters for each floor
    const groundBoundary = {
      points: [createVec2(0, 0), createVec2(10000, 0), createVec2(10000, 8000), createVec2(0, 8000)]
    }

    const firstFloorBoundary = {
      points: [createVec2(1000, 1000), createVec2(9000, 1000), createVec2(9000, 7000), createVec2(1000, 7000)]
    }

    modelActions.addPerimeter(ground.id, groundBoundary, constructionMethodId, createLength(200))
    modelActions.addPerimeter(firstFloor.id, firstFloorBoundary, constructionMethodId, createLength(180))

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

    expect(importedStoreys[0].name).toBe('Ground Floor')
    expect(importedStoreys[1].name).toBe('First Floor')
    expect(importedStoreys[2].name).toBe('Second Floor')

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
    modelActions.addStorey('First Floor', createLength(2800))
    modelActions.addStorey('Second Floor', createLength(2600))

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
    expect(importedStoreys[0].name).toBe('Ground Floor')
    expect(importedStoreys[1].level).toBe(1)
    expect(importedStoreys[1].name).toBe('First Floor')
    expect(importedStoreys[2].level).toBe(2)
    expect(importedStoreys[2].name).toBe('Second Floor')
  })
})
