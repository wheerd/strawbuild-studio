import { describe, expect, it, vi } from 'vitest'

import { ProjectImportExportService } from './ProjectImportExportService'

// Mock the stores and dependencies
vi.mock('@/building/store', () => ({
  getModelActions: vi.fn(() => ({
    getStoreysOrderedByLevel: vi.fn(() => [
      {
        id: 'storey_ground',
        name: 'Ground Floor',
        level: 0,
        height: 2500
      }
    ]),
    getPerimetersByStorey: vi.fn(() => [
      {
        id: 'perimeter_1',
        corners: [
          { id: 'corner_1', insidePoint: [0, 0], constuctedByWall: 'next' },
          { id: 'corner_2', insidePoint: [100, 0], constuctedByWall: 'next' },
          { id: 'corner_3', insidePoint: [100, 100], constuctedByWall: 'next' },
          { id: 'corner_4', insidePoint: [0, 100], constuctedByWall: 'next' }
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
    adjustAllLevels: vi.fn(),
    addStorey: vi.fn(),
    addPerimeter: vi.fn(() => ({
      id: 'new_perimeter',
      walls: [{ id: 'new_wall_1' }],
      corners: [{ id: 'new_corner_1' }]
    })),
    updatePerimeterWallThickness: vi.fn(),
    updatePerimeterWallConstructionMethod: vi.fn(),
    addPerimeterWallOpening: vi.fn(),
    updatePerimeterCornerConstructedByWall: vi.fn()
  }))
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

vi.mock('@/shared/services/exportImport', () => ({
  exportToJSON: vi.fn(() => ({
    success: true,
    data: { test: 'data' },
    filename: 'test.json'
  })),
  importFromJSON: vi.fn(() => ({
    success: true,
    data: {
      modelStore: {
        storeys: [
          {
            name: 'Imported Floor',
            level: 0,
            height: 3000,
            perimeters: [
              {
                corners: [
                  { insideX: 0, insideY: 0, constuctedByWall: 'next' },
                  { insideX: 200, insideY: 0, constuctedByWall: 'next' }
                ],
                walls: [{ thickness: 300, constructionMethodId: 'method_1', openings: [] }],
                baseRingBeamMethodId: 'beam_1'
              }
            ]
          }
        ]
      },
      configStore: {
        ringBeamConstructionMethods: {},
        perimeterConstructionMethods: {},
        defaultPerimeterMethodId: 'method_1'
      }
    }
  })),
  downloadFile: vi.fn()
}))

vi.mock('@/shared/geometry', () => ({
  createLength: vi.fn(value => value),
  createVec2: vi.fn((x, y) => [x, y])
}))

describe('ProjectImportExportService', () => {
  describe('exportProject', () => {
    it('successfully exports project using store getters', async () => {
      const result = await ProjectImportExportService.exportProject()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.filename).toBe('test.json')
      }
    })

    it('transforms storeys to simplified format', async () => {
      const { exportToJSON } = await import('@/shared/services/exportImport')

      await ProjectImportExportService.exportProject()

      expect(exportToJSON).toHaveBeenCalledWith(
        {
          storeys: [
            {
              name: 'Ground Floor',
              level: 0,
              height: 2500,
              perimeters: [
                {
                  corners: [
                    { insideX: 0, insideY: 0, constuctedByWall: 'next' },
                    { insideX: 100, insideY: 0, constuctedByWall: 'next' },
                    { insideX: 100, insideY: 100, constuctedByWall: 'next' },
                    { insideX: 0, insideY: 100, constuctedByWall: 'next' }
                  ],
                  walls: [
                    {
                      thickness: 200,
                      constructionMethodId: 'method_1',
                      openings: [
                        {
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
              ]
            }
          ]
        },
        expect.any(Object)
      )
    })
  })

  describe('importProject', () => {
    it('successfully imports project using store actions', async () => {
      const content = '{"test": "content"}'
      const result = await ProjectImportExportService.importProject(content)

      expect(result.success).toBe(true)
    })

    it('reconstructs model using store actions', async () => {
      const { getModelActions } = await import('@/building/store')
      const mockActions = getModelActions()

      const content = '{"test": "content"}'
      await ProjectImportExportService.importProject(content)

      // Should reset the store
      expect(mockActions.reset).toHaveBeenCalled()

      // Should modify the default ground floor
      expect(mockActions.updateStoreyName).toHaveBeenCalledWith(expect.any(String), 'Imported Floor')
      expect(mockActions.updateStoreyHeight).toHaveBeenCalledWith(expect.any(String), 3000)

      // Should add perimeter
      expect(mockActions.addPerimeter).toHaveBeenCalled()

      // Should update wall properties
      expect(mockActions.updatePerimeterWallThickness).toHaveBeenCalled()
      expect(mockActions.updatePerimeterWallConstructionMethod).toHaveBeenCalled()
    })

    it('handles invalid import data', async () => {
      const { importFromJSON } = await import('@/shared/services/exportImport')
      vi.mocked(importFromJSON).mockReturnValueOnce({
        success: false,
        error: 'Invalid format'
      })

      const content = 'invalid json'
      const result = await ProjectImportExportService.importProject(content)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Invalid format')
      }
    })
  })
})
