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
  getPerimetersByStorey: vi.fn(() => [
    {
      id: 'perimeter_1',
      corners: [
        { id: 'corner_1', insidePoint: [0, 0], constructedByWall: 'next' },
        { id: 'corner_2', insidePoint: [100, 0], constructedByWall: 'next' },
        { id: 'corner_3', insidePoint: [100, 100], constructedByWall: 'next' },
        { id: 'corner_4', insidePoint: [0, 100], constructedByWall: 'next' }
      ],
      walls: [
        {
          id: 'wall_1',
          thickness: 200,
          constructionMethodId: 'method_1',
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
      baseRingBeamMethodId: 'beam_1',
      topRingBeamMethodId: 'beam_1'
    }
  ]),
  reset: vi.fn(),
  updateStoreyName: vi.fn(),
  updateStoreyHeight: vi.fn(),
  updateStoreySlabConfig: vi.fn(),
  adjustAllLevels: vi.fn(),
  addStorey: vi.fn((name, height) => ({
    id: 'new_storey',
    name,
    level: 1,
    height
  })),
  addPerimeter: vi.fn(() => ({
    id: 'new_perimeter',
    walls: [{ id: 'new_wall_1' }],
    corners: [{ id: 'new_corner_1' }]
  })),
  updatePerimeterWallThickness: vi.fn(),
  updatePerimeterWallConstructionMethod: vi.fn(),
  addPerimeterWallOpening: vi.fn(),
  updatePerimeterCornerConstructedByWall: vi.fn()
}

// Mock the stores and dependencies
vi.mock('@/building/store', () => ({
  getModelActions: () => mockActions
}))

vi.mock('@/construction/config/store', () => ({
  getConfigState: vi.fn(() => ({
    ringBeamConstructionMethods: {
      beam_1: { id: 'beam_1', name: 'Test Beam', config: {} }
    },
    perimeterConstructionMethods: {
      method_1: { id: 'method_1', name: 'Test Method', config: {} }
    },
    defaultPerimeterMethodId: 'method_1'
  })),
  setConfigState: vi.fn()
}))

// DOM operations are now handled by utilities, not the service

vi.mock('@/shared/geometry', () => ({
  createLength: vi.fn(value => value),
  createVec2: vi.fn((x, y) => [x, y])
}))

describe('ProjectImportExportService', () => {
  describe('exportToString', () => {
    it('successfully exports project to string using store getters', async () => {
      const result = await ProjectImportExportService.exportToString()

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
    })
  })

  describe('importFromString', () => {
    it('calls the correct store methods on import', async () => {
      // Create simple valid import data
      const validImportData = {
        version: '1.2.0',
        timestamp: new Date().toISOString(),
        modelStore: {
          storeys: [
            {
              name: 'Test Floor',
              height: 2500,
              perimeters: [],
              slabConstructionConfigId: 'scm_1'
            }
          ],
          minLevel: 0
        },
        configStore: {
          ringBeamConstructionMethods: { beam_1: { id: 'beam_1', name: 'Test Beam' } },
          perimeterConstructionMethods: { method_1: { id: 'method_1', name: 'Test Method' } },
          slabConstructionConfigs: { scm_1: { id: 'scm_1', name: 'Test Slab' } },
          defaultPerimeterMethodId: 'method_1',
          defaultSlabConfigId: 'scm_1'
        },
        materialsStore: {
          materials: { material_1: { id: 'material_1', name: 'Test Material' } }
        }
      }

      // Clear previous calls
      vi.clearAllMocks()

      const result = await ProjectImportExportService.importFromString(JSON.stringify(validImportData))

      expect(result.success).toBeTruthy()

      // Should have called reset and basic store methods
      expect(mockActions.reset).toHaveBeenCalled()

      // For a storey with no perimeters, should still call updateStoreyName
      expect(mockActions.updateStoreyName).toHaveBeenCalled()
      expect(mockActions.updateStoreyHeight).toHaveBeenCalled()
      expect(mockActions.updateStoreySlabConfig).toHaveBeenCalled()
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
