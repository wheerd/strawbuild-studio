import { vec2 } from 'gl-matrix'
import { describe, expect, it, vi } from 'vitest'

import { ProjectImportExportService } from './ProjectImportExportService'

// Create a shared mock that we can control
const mockStorey = {
  id: 'storey_ground',
  name: 'Ground Floor',
  level: 0,
  height: 2500
}

const mockActions = {
  getStoreysOrderedByLevel: vi.fn(() => [mockStorey]),
  getStoreyAbove: vi.fn(() => null),
  getPerimetersByStorey: vi.fn(() => [
    {
      id: 'perimeter_1',
      referenceSide: 'inside' as const,
      referencePolygon: [
        vec2.fromValues(0, 0),
        vec2.fromValues(100, 0),
        vec2.fromValues(100, 100),
        vec2.fromValues(0, 100)
      ],
      corners: [
        {
          id: 'corner_1',
          insidePoint: vec2.fromValues(0, 0),
          outsidePoint: vec2.fromValues(-200, 0),
          constructedByWall: 'next',
          interiorAngle: 90,
          exteriorAngle: 270
        },
        {
          id: 'corner_2',
          insidePoint: vec2.fromValues(100, 0),
          outsidePoint: vec2.fromValues(100, -200),
          constructedByWall: 'next',
          interiorAngle: 90,
          exteriorAngle: 270
        },
        {
          id: 'corner_3',
          insidePoint: vec2.fromValues(100, 100),
          outsidePoint: vec2.fromValues(300, 100),
          constructedByWall: 'next',
          interiorAngle: 90,
          exteriorAngle: 270
        },
        {
          id: 'corner_4',
          insidePoint: vec2.fromValues(0, 100),
          outsidePoint: vec2.fromValues(0, 300),
          constructedByWall: 'next',
          interiorAngle: 90,
          exteriorAngle: 270
        }
      ],
      walls: [
        {
          id: 'wall_1',
          thickness: 200,
          wallAssemblyId: 'assembly_1',
          openings: [
            {
              id: 'opening_1',
              type: 'door',
              offsetFromStart: 500,
              width: 900,
              height: 2100,
              sillHeight: undefined
            }
          ]
        }
      ],
      baseRingBeamAssemblyId: 'beam_1',
      topRingBeamAssemblyId: 'beam_1'
    }
  ]),
  getFloorAreasByStorey: vi.fn(() => []),
  getFloorOpeningsByStorey: vi.fn(() => []),
  reset: vi.fn(),
  updateStoreyName: vi.fn(),
  updateStoreyHeight: vi.fn(),
  updateStoreyFloorAssembly: vi.fn(),
  adjustAllLevels: vi.fn(),
  addStorey: vi.fn((name, height) => ({
    id: 'new_storey',
    name,
    level: 1,
    height
  })),
  addPerimeter: vi.fn(() => ({
    id: 'new_perimeter',
    referenceSide: 'inside' as const,
    walls: [{ id: 'new_wall_1' }],
    corners: [{ id: 'new_corner_1' }]
  })),
  updatePerimeterWallThickness: vi.fn(),
  updatePerimeterWallAssembly: vi.fn(),
  addPerimeterWallOpening: vi.fn(),
  updatePerimeterCornerConstructedByWall: vi.fn(),
  addFloorArea: vi.fn(),
  addFloorOpening: vi.fn()
}

// Mock the stores and dependencies
vi.mock('@/building/store', () => ({
  getModelActions: () => mockActions
}))

vi.mock('@/construction/config/store', () => ({
  getConfigState: vi.fn(() => ({
    straw: {
      baleMinLength: 800,
      baleMaxLength: 900,
      baleHeight: 500,
      baleWidth: 360,
      material: 'material_straw',
      tolerance: 2,
      topCutoffLimit: 50,
      flakeSize: 70
    },
    ringBeamAssemblyConfigs: {
      beam_1: {
        id: 'beam_1',
        name: 'Test Beam',
        type: 'full',
        material: 'material_wood',
        height: 60,
        width: 360,
        offsetFromEdge: 30
      }
    },
    wallAssemblyConfigs: {
      assembly_1: {
        id: 'assembly_1',
        name: 'Test Assembly',
        type: 'non-strawbale',
        thickness: 200,
        material: 'material_wall',
        layers: {
          insideThickness: 30,
          outsideThickness: 30
        }
      }
    },
    floorAssemblyConfigs: {
      fa_1: {
        id: 'fa_1',
        name: 'Test Floor',
        type: 'monolithic',
        thickness: 200,
        material: 'material_floor',
        layers: {
          topThickness: 60,
          bottomThickness: 0
        }
      }
    },
    defaultWallAssemblyId: 'assembly_1',
    defaultFloorAssemblyId: 'fa_1'
  })),
  setConfigState: vi.fn()
}))

// DOM operations are now handled by utilities, not the service

describe('ProjectImportExportService', () => {
  describe('exportToString', () => {
    it('successfully exports project to string using store getters', async () => {
      const result = await ProjectImportExportService.exportToString()
      expect('error' in result ? result.error : '').toEqual('')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.content).toBeDefined()
        expect(typeof result.content).toBe('string')

        // Verify the content is valid JSON
        const parsed = JSON.parse(result.content)
        expect(parsed.version).toBeDefined()
        expect(parsed.timestamp).toBeDefined()
        expect(parsed.modelStore).toBeDefined()
        expect(parsed.modelStore.storeys).toBeDefined()
        expect(parsed.modelStore.minLevel).toBeDefined()
        expect(parsed.configStore).toBeDefined()
        expect(parsed.configStore.straw).toBeDefined()
        expect(parsed.configStore.straw.material).toBe('material_straw')
        expect(parsed.configStore.straw.tolerance).toBe(2)
        expect(parsed.configStore.straw.topCutoffLimit).toBe(50)
        expect(parsed.configStore.straw.flakeSize).toBe(70)

        const exportedStorey = parsed.modelStore.storeys[0]
        expect(exportedStorey).toBeDefined()
        if (exportedStorey.perimeters.length > 0) {
          expect(exportedStorey.perimeters[0].referenceSide).toBeDefined()
        }
      }
    })

    it('uses store getters for proper encapsulation', async () => {
      const { getModelActions } = await import('@/building/store')
      const mockActions = getModelActions()

      // Clear previous calls
      vi.clearAllMocks()

      await ProjectImportExportService.exportToString()

      expect(mockActions.getStoreysOrderedByLevel).toHaveBeenCalled()
      expect(mockActions.getPerimetersByStorey).toHaveBeenCalled()
      expect(mockActions.getFloorAreasByStorey).toHaveBeenCalled()
      expect(mockActions.getFloorOpeningsByStorey).toHaveBeenCalled()
    })
  })

  describe('importFromString', () => {
    it('calls the correct store assemblies on import', async () => {
      // Create simple valid import data
      const validImportData = {
        version: '1.6.0',
        timestamp: new Date().toISOString(),
        modelStore: {
          storeys: [
            {
              name: 'Test Floor',
              height: 2500,
              perimeters: [],
              floorAssemblyId: 'fa_1',
              floorAreas: [
                {
                  points: [
                    { x: 0, y: 0 },
                    { x: 2000, y: 0 },
                    { x: 2000, y: 2000 },
                    { x: 0, y: 2000 }
                  ]
                }
              ],
              floorOpenings: [
                {
                  points: [
                    { x: 500, y: 500 },
                    { x: 1000, y: 500 },
                    { x: 1000, y: 1000 },
                    { x: 500, y: 1000 }
                  ]
                }
              ]
            }
          ],
          minLevel: 0
        },
        configStore: {
          straw: {
            baleMinLength: 750,
            baleMaxLength: 950,
            baleHeight: 500,
            baleWidth: 360,
            material: 'material_straw',
            tolerance: 1.5,
            topCutoffLimit: 45,
            flakeSize: 60
          },
          ringBeamAssemblyConfigs: { beam_1: { id: 'beam_1', name: 'Test Beam' } },
          wallAssemblyConfigs: { assembly_1: { id: 'assembly_1', name: 'Test Assembly' } },
          floorAssemblyConfigs: { fa_1: { id: 'fa_1', name: 'Test Floor' } },
          defaultWallAssemblyId: 'assembly_1',
          defaultFloorAssemblyId: 'fa_1'
        },
        materialsStore: {
          materials: { material_1: { id: 'material_1', name: 'Test Material' } }
        }
      }

      // Clear previous calls
      vi.clearAllMocks()

      const result = await ProjectImportExportService.importFromString(JSON.stringify(validImportData))

      expect(result.success).toBeTruthy()

      // Should have called reset and basic store assemblies
      expect(mockActions.reset).toHaveBeenCalled()

      // For a storey with no perimeters, should still call updateStoreyName
      expect(mockActions.updateStoreyName).toHaveBeenCalled()
      expect(mockActions.updateStoreyHeight).toHaveBeenCalled()
      expect(mockActions.updateStoreyFloorAssembly).toHaveBeenCalled()
      expect(mockActions.addFloorArea).toHaveBeenCalled()
      expect(mockActions.addFloorOpening).toHaveBeenCalled()
    })

    it('supports legacy imports without straw config', async () => {
      const legacyImportData = {
        version: '1.4.0',
        timestamp: new Date().toISOString(),
        modelStore: {
          storeys: [],
          minLevel: 0
        },
        configStore: {
          ringBeamAssemblyConfigs: { beam_legacy: { id: 'beam_legacy', name: 'Legacy Beam' } },
          wallAssemblyConfigs: {
            assembly_1: {
              id: 'assembly_1',
              name: 'Legacy Assembly',
              type: 'non-strawbale',
              thickness: 200,
              material: 'material_wall',
              layers: {
                insideThickness: 0,
                outsideThickness: 0
              }
            }
          },
          defaultWallAssemblyId: 'assembly_1'
        },
        materialsStore: {
          materials: {}
        }
      }

      const result = await ProjectImportExportService.importFromString(JSON.stringify(legacyImportData))

      expect(result.success).toBe(true)
    })

    it('handles invalid JSON gracefully', async () => {
      const result = await ProjectImportExportService.importFromString('invalid json')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('JSON')
      }
    })

    it('validates file format', async () => {
      const invalidData = JSON.stringify({ invalid: 'format' })
      const result = await ProjectImportExportService.importFromString(invalidData)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Invalid file format')
      }
    })
  })
})
