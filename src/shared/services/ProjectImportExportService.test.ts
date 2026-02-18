import { describe, expect, it, vi } from 'vitest'

import type {
  Constraint,
  OpeningWithGeometry,
  PerimeterCornerId,
  PerimeterCornerWithGeometry,
  PerimeterId,
  PerimeterWallId,
  PerimeterWallWithGeometry,
  PerimeterWithGeometry,
  Storey,
  StoreyId,
  StoreyLevel
} from '@/building/model'
import type { StoreActions } from '@/building/store'
import { ZERO_VEC2, newVec2 } from '@/shared/geometry'
import { partial } from '@/test/helpers'

import { ProjectImportExportService } from './ProjectImportExportService'

const mockStorey = partial<Storey>({
  id: 'storey_ground',
  name: 'Ground Floor',
  level: 0 as StoreyLevel,
  floorHeight: 2500,
  floorAssemblyId: 'fa_1'
})

const corners = [
  partial<PerimeterCornerWithGeometry>({
    id: 'outcorner_1',
    insidePoint: ZERO_VEC2,
    outsidePoint: newVec2(-200, 0),
    constructedByWall: 'next',
    interiorAngle: 90,
    exteriorAngle: 270
  }),
  partial<PerimeterCornerWithGeometry>({
    id: 'outcorner_2',
    insidePoint: newVec2(100, 0),
    outsidePoint: newVec2(100, -200),
    constructedByWall: 'next',
    interiorAngle: 90,
    exteriorAngle: 270
  }),
  partial<PerimeterCornerWithGeometry>({
    id: 'outcorner_3',
    insidePoint: newVec2(100, 100),
    outsidePoint: newVec2(300, 100),
    constructedByWall: 'next',
    interiorAngle: 90,
    exteriorAngle: 270
  }),
  partial<PerimeterCornerWithGeometry>({
    id: 'outcorner_4',
    insidePoint: newVec2(0, 100),
    outsidePoint: newVec2(0, 300),
    constructedByWall: 'next',
    interiorAngle: 90,
    exteriorAngle: 270
  })
]

const openings = [
  partial<OpeningWithGeometry>({
    id: 'opening_1',
    openingType: 'door',
    centerOffsetFromWallStart: 500,
    width: 900,
    height: 2100,
    sillHeight: undefined
  })
]

const walls = [
  partial<PerimeterWallWithGeometry>({
    id: 'outwall_1',
    thickness: 200,
    wallAssemblyId: 'assembly_1' as any,
    entityIds: openings.map(o => o.id)
  })
]

const constraints = [
  partial<Constraint>({
    id: 'constraint_1',
    type: 'horizontalWall',
    wall: 'outwall_1'
  })
]

const mockActions = partial<StoreActions>({
  getStoreysOrderedByLevel: vi.fn(() => [mockStorey]),
  getStoreyAbove: vi.fn(() => null),
  getPerimeterCornersById: vi.fn(() => corners),
  getPerimeterWallsById: vi.fn(() => walls),
  getWallOpeningsById: vi.fn(() => openings),
  getWallPostsById: vi.fn(() => []),
  getPerimetersByStorey: vi.fn(() => [
    partial<PerimeterWithGeometry>({
      id: 'perimeter_1',
      referenceSide: 'inside' as const,
      innerPolygon: { points: [newVec2(0, 0), newVec2(100, 0), newVec2(100, 100), newVec2(0, 100)] },
      cornerIds: corners.map(c => c.id),
      wallIds: walls.map(w => w.id)
    })
  ]),
  getAllBuildingConstraints: vi.fn(() => constraints),
  getFloorAreasByStorey: vi.fn(() => []),
  getFloorOpeningsByStorey: vi.fn(() => []),
  getRoofsByStorey: vi.fn(() => []),
  reset: vi.fn(),
  updateStoreyName: vi.fn(),
  updateStoreyFloorHeight: vi.fn(),
  updateStoreyFloorAssembly: vi.fn(),
  adjustAllLevels: vi.fn(),
  addStorey: vi.fn((name, floorHeight) =>
    partial<Storey>({
      id: 'new_storey' as StoreyId,
      name,
      level: 1 as StoreyLevel,
      floorHeight
    })
  ),
  addPerimeter: vi.fn(() =>
    partial<PerimeterWithGeometry>({
      id: 'new_perimeter' as PerimeterId,
      referenceSide: 'inside' as const,
      wallIds: ['new_wall_1' as PerimeterWallId],
      cornerIds: ['new_corner_1' as PerimeterCornerId]
    })
  ),
  updatePerimeterWallThickness: vi.fn(),
  updatePerimeterWallAssembly: vi.fn(),
  addWallOpening: vi.fn(),
  updatePerimeterCornerConstructedByWall: vi.fn(),
  addFloorArea: vi.fn(),
  addFloorOpening: vi.fn()
})

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
    defaultStrawMaterial: 'material_straw',
    defaultWallAssemblyId: 'assembly_1',
    defaultFloorAssemblyId: 'fa_1'
  })),
  setConfigState: vi.fn()
}))

describe('ProjectImportExportService', () => {
  describe('exportToString', () => {
    it('successfully exports project to string using v2 format', async () => {
      const result = await ProjectImportExportService.exportToString()
      expect('error' in result ? result.error : '').toEqual('')
      expect(result.success).toBe(true)
      expect.assert(result.success)
      expect(result.content).toBeDefined()
      expect(typeof result.content).toBe('string')

      const parsed = JSON.parse(result.content)
      expect(parsed.version).toBe('2.0.0')
      expect(parsed.timestamp).toBeDefined()
      expect(parsed.stores).toBeDefined()
      expect(parsed.stores.model).toBeDefined()
      expect(parsed.stores.config).toBeDefined()
      expect(parsed.stores.materials).toBeDefined()
      expect(parsed.stores.parts).toBeDefined()
      expect(parsed.stores.project).toBeDefined()
    })
  })

  describe('importFromString', () => {
    it('calls the correct store assemblies on import', async () => {
      const validImportData = {
        version: '1.11.0',
        timestamp: new Date().toISOString(),
        modelStore: {
          storeys: [
            {
              name: 'Test Floor',
              floorHeight: 2500,
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

      vi.clearAllMocks()

      const result = await ProjectImportExportService.importFromString(JSON.stringify(validImportData))

      expect(result.success).toBeTruthy()

      expect(mockActions.reset).toHaveBeenCalled()
      expect(mockActions.updateStoreyName).toHaveBeenCalled()
      expect(mockActions.updateStoreyFloorHeight).toHaveBeenCalled()
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
      expect.assert(!result.success)
      expect(result.error).toContain('JSON')
    })

    it('validates file format', async () => {
      const invalidData = JSON.stringify({ invalid: 'format' })
      const result = await ProjectImportExportService.importFromString(invalidData)

      expect(result.success).toBe(false)
      expect.assert(!result.success)
      expect(result.error).toContain('Invalid file format')
    })
  })
})
