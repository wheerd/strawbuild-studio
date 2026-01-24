import { type Mock, beforeEach, describe, expect, it, vi } from 'vitest'

import type { RoofAssemblyId, StoreyId } from '@/building/model/ids'
import { createStoreyId } from '@/building/model/ids'
import type { TimestampsActions } from '@/building/store/slices/timestampsSlice'
import { type Polygon2D, ensurePolygonIsClockwise, newVec2, wouldClosingPolygonSelfIntersect } from '@/shared/geometry'

import type { RoofsSlice } from './roofsSlice'
import { createRoofsSlice } from './roofsSlice'

vi.mock('@/shared/geometry/polygon', async importOriginal => {
  return {
    ...(await importOriginal()),
    wouldClosingPolygonSelfIntersect: vi.fn(),
    ensurePolygonIsClockwise: vi.fn()
  }
})

const wouldClosingPolygonSelfIntersectMock = vi.mocked(wouldClosingPolygonSelfIntersect)
const ensurePolygonIsClockwiseMock = vi.mocked(ensurePolygonIsClockwise)

vi.mock('zustand')

describe('roofsSlice', () => {
  let store: RoofsSlice
  let mockSet: any
  let mockGet: any
  let mockUpdateTimestamp: Mock<TimestampsActions['updateTimestamp']>
  let mockRemoveTimestamp: Mock<TimestampsActions['removeTimestamp']>
  let testStoreyId: StoreyId
  let testAssemblyId: RoofAssemblyId

  beforeEach(() => {
    wouldClosingPolygonSelfIntersectMock.mockReset()
    wouldClosingPolygonSelfIntersectMock.mockReturnValue(false)
    ensurePolygonIsClockwiseMock.mockReset()
    ensurePolygonIsClockwiseMock.mockImplementation(p => p)

    mockSet = vi.fn()
    mockGet = vi.fn()
    mockUpdateTimestamp = vi.fn()
    mockRemoveTimestamp = vi.fn()
    const mockStore = {} as any
    testStoreyId = createStoreyId()
    testAssemblyId = 'ra_test' as RoofAssemblyId

    store = createRoofsSlice(mockSet, mockGet, mockStore)
    ;(store as any).actions.updateTimestamp = mockUpdateTimestamp
    ;(store as any).actions.removeTimestamp = mockRemoveTimestamp

    mockGet.mockImplementation(() => store)

    mockSet.mockImplementation((updater: any) => {
      if (typeof updater === 'function') {
        const newState = updater(store)
        if (newState !== store) {
          store = { ...store, ...newState }
        }
      } else {
        store = { ...store, ...updater }
      }
    })
  })

  const createTestPolygon = (): Polygon2D => ({
    points: [newVec2(0, 0), newVec2(100, 0), newVec2(100, 100), newVec2(0, 100)]
  })

  const createTrianglePolygon = (): Polygon2D => ({
    points: [newVec2(0, 0), newVec2(100, 0), newVec2(50, 100)]
  })

  describe('addRoof', () => {
    it('should create a roof with valid parameters', () => {
      const polygon = createTestPolygon()
      const roof = store.actions.addRoof(testStoreyId, 'gable', polygon, 0, 45, 3000, 500, testAssemblyId)

      expect(roof).toBeDefined()
      expect(roof.storeyId).toBe(testStoreyId)
      expect(roof.type).toBe('gable')
      expect(roof.slope).toBe(45)
      expect(roof.verticalOffset).toBe(3000)
      expect(roof.assemblyId).toBe(testAssemblyId)
      expect(roof.referencePolygon.points).toHaveLength(4)
      expect(roof.overhangIds).toHaveLength(4)
      expect(roof.overhangIds.every(id => store.roofOverhangs[id].value === 500)).toBe(true)
      expect(roof.overhangIds.every(id => store.roofOverhangs[id].area.points.length === 4)).toBe(true)
    })

    it('should expand single overhang value to array matching polygon sides', () => {
      const polygon = createTrianglePolygon()
      const roof = store.actions.addRoof(testStoreyId, 'shed', polygon, 0, 30, 2500, 400, testAssemblyId)

      expect(roof.overhangIds).toHaveLength(3)
      expect(roof.overhangIds.every(id => store.roofOverhangs[id].value === 400)).toBe(true)
    })

    it('should normalize polygon to clockwise', () => {
      const polygon = createTestPolygon()
      store.actions.addRoof(testStoreyId, 'gable', polygon, 0, 45, 3000, 500, testAssemblyId)

      expect(ensurePolygonIsClockwiseMock).toHaveBeenCalledWith(polygon)
    })

    it('should reject invalid slope (< 0)', () => {
      const polygon = createTestPolygon()
      expect(() => {
        store.actions.addRoof(testStoreyId, 'gable', polygon, 0, -5, 3000, 500, testAssemblyId)
      }).toThrow('Roof slope must be between 0 and 90 degrees')
    })

    it('should reject invalid slope (> 90)', () => {
      const polygon = createTestPolygon()
      expect(() => {
        store.actions.addRoof(testStoreyId, 'gable', polygon, 0, 95, 3000, 500, testAssemblyId)
      }).toThrow('Roof slope must be between 0 and 90 degrees')
    })

    it('should accept boundary slope values (0 and 90)', () => {
      const polygon = createTestPolygon()

      const flatRoof = store.actions.addRoof(testStoreyId, 'shed', polygon, 0, 0, 3000, 500, testAssemblyId)
      expect(flatRoof.slope).toBe(0)

      const steepRoof = store.actions.addRoof(testStoreyId, 'gable', polygon, 0, 90, 3000, 500, testAssemblyId)
      expect(steepRoof.slope).toBe(90)
    })

    it('should accept negative vertical offset', () => {
      const polygon = createTestPolygon()
      const roof = store.actions.addRoof(testStoreyId, 'gable', polygon, 0, 45, -100, 500, testAssemblyId)

      expect(roof.verticalOffset).toBeLessThan(0)
    })

    it('should reject negative overhang', () => {
      const polygon = createTestPolygon()
      expect(() => {
        store.actions.addRoof(testStoreyId, 'gable', polygon, 0, 45, 3000, -50, testAssemblyId)
      }).toThrow('Overhang must be non-negative')
    })

    it('should reject polygon with < 3 points', () => {
      const invalidPolygon: Polygon2D = {
        points: [newVec2(0, 0), newVec2(100, 0)]
      }
      expect(() => {
        store.actions.addRoof(testStoreyId, 'gable', invalidPolygon, 0, 45, 3000, 500, testAssemblyId)
      }).toThrow('Roof polygon must have at least 3 points')
    })

    it('should reject self-intersecting polygon', () => {
      wouldClosingPolygonSelfIntersectMock.mockReturnValue(true)
      const polygon = createTestPolygon()

      expect(() => {
        store.actions.addRoof(testStoreyId, 'gable', polygon, 0, 45, 3000, 500, testAssemblyId)
      }).toThrow('Roof polygon must not self-intersect')
    })

    it('should store mainSideIndex', () => {
      const polygon = createTestPolygon()
      const mainSideIndex = 2
      const roof = store.actions.addRoof(testStoreyId, 'gable', polygon, mainSideIndex, 45, 3000, 500, testAssemblyId)

      expect(roof.mainSideIndex).toBe(2)
    })
  })

  describe('removeRoof', () => {
    it('should remove roof by ID', () => {
      const polygon = createTestPolygon()
      const roof = store.actions.addRoof(testStoreyId, 'gable', polygon, 0, 45, 3000, 500, testAssemblyId)

      expect(store.roofs[roof.id]).toBeDefined()

      store.actions.removeRoof(roof.id)

      expect(store.roofs[roof.id]).toBeUndefined()
    })

    it('should not throw when removing non-existent roof', () => {
      expect(() => {
        store.actions.removeRoof('roof_nonexistent' as any)
      }).not.toThrow()
    })
  })

  describe('ridgeLine computation', () => {
    it('should compute ridge line for shed roof as main side edge', () => {
      const polygon = createTestPolygon()
      const roof = store.actions.addRoof(testStoreyId, 'shed', polygon, 0, 30, 0, 300, testAssemblyId)

      expect(roof.ridgeLine).toBeDefined()
      expect(roof.ridgeLine.start[0]).toBe(0)
      expect(roof.ridgeLine.start[1]).toBe(0)
      expect(roof.ridgeLine.end[0]).toBe(100)
      expect(roof.ridgeLine.end[1]).toBe(0)
    })

    it('should compute ridge line for gable roof perpendicular to gable side', () => {
      const polygon = createTestPolygon()
      const roof = store.actions.addRoof(testStoreyId, 'gable', polygon, 0, 30, 0, 300, testAssemblyId)

      expect(roof.ridgeLine).toBeDefined()
      // Ridge should start at midpoint of bottom edge (0,0)-(100,0)
      expect(roof.ridgeLine.start[0]).toBe(50)
      expect(roof.ridgeLine.start[1]).toBe(0)
      // Ridge should extend perpendicular to opposite edge
      expect(roof.ridgeLine.end[0]).toBe(50)
      expect(roof.ridgeLine.end[1]).toBeGreaterThan(0)
    })
  })

  describe('updateRoofOverhangById', () => {
    it('should update overhang by ID', () => {
      const polygon = createTestPolygon()
      const roof = store.actions.addRoof(testStoreyId, 'gable', polygon, 0, 45, 3000, 500, testAssemblyId)

      const overhangId = roof.overhangIds[1]
      const success = store.actions.updateRoofOverhangById(overhangId, 750)

      expect(success).toBe(true)
      const updatedRoof = store.roofs[roof.id]
      expect(store.roofOverhangs[updatedRoof.overhangIds[0]].value).toBe(500)
      expect(store.roofOverhangs[updatedRoof.overhangIds[1]].value).toBe(750)
      expect(store.roofOverhangs[updatedRoof.overhangIds[2]].value).toBe(500)
      expect(store.roofOverhangs[updatedRoof.overhangIds[3]].value).toBe(500)
      // Check that areas are recomputed
      expect(store.roofOverhangs[updatedRoof.overhangIds[1]].area.points).toHaveLength(4)
    })

    it('should return false for non-existent overhang ID', () => {
      const polygon = createTestPolygon()
      const roof = store.actions.addRoof(testStoreyId, 'gable', polygon, 0, 45, 3000, 500, testAssemblyId)

      const success = store.actions.updateRoofOverhangById('roofoverhang_fake' as any, 750)

      expect(success).toBe(false)
      expect(store.roofs[roof.id].overhangIds.every(id => store.roofOverhangs[id].value === 500)).toBe(true)
    })

    it('should reject negative overhang value', () => {
      const polygon = createTestPolygon()
      const roof = store.actions.addRoof(testStoreyId, 'gable', polygon, 0, 45, 3000, 500, testAssemblyId)

      const overhangId = roof.overhangIds[0]
      expect(() => {
        store.actions.updateRoofOverhangById(overhangId, -100)
      }).toThrow('Overhang must be non-negative')
    })

    it('should return false for non-existent roof', () => {
      const success = store.actions.updateRoofOverhangById('roofoverhang_fake' as any, 500)
      expect(success).toBe(false)
    })
  })

  describe('setAllRoofOverhangs', () => {
    it('should set all overhangs to same value', () => {
      const polygon = createTestPolygon()
      const roof = store.actions.addRoof(testStoreyId, 'gable', polygon, 0, 45, 3000, 500, testAssemblyId)

      // First change one to be different
      const overhangId = roof.overhangIds[1]
      store.actions.updateRoofOverhangById(overhangId, 750)

      // Now set all to 600
      const success = store.actions.setAllRoofOverhangs(roof.id, 600)

      expect(success).toBe(true)
      const updatedRoof = store.roofs[roof.id]
      expect(updatedRoof.overhangIds.every(id => store.roofOverhangs[id].value === 600)).toBe(true)
    })

    it('should reject negative overhang value', () => {
      const polygon = createTestPolygon()
      const roof = store.actions.addRoof(testStoreyId, 'gable', polygon, 0, 45, 3000, 500, testAssemblyId)

      expect(() => {
        store.actions.setAllRoofOverhangs(roof.id, -100)
      }).toThrow('Overhang must be non-negative')
    })

    it('should return false for non-existent roof', () => {
      const success = store.actions.setAllRoofOverhangs('roof_nonexistent' as any, 500)
      expect(success).toBe(false)
    })
  })

  describe('getRoofOverhangById', () => {
    it('should return overhang by ID', () => {
      const polygon = createTestPolygon()
      const roof = store.actions.addRoof(testStoreyId, 'gable', polygon, 0, 45, 3000, 500, testAssemblyId)

      const overhangId = roof.overhangIds[2]
      const overhang = store.actions.getRoofOverhangById(overhangId)

      expect(overhang).toBeDefined()
      expect(overhang?.id).toBe(overhangId)
      expect(overhang?.sideIndex).toBe(2)
      expect(overhang?.value).toBe(500)
      expect(overhang?.area.points).toHaveLength(4)
    })

    it('should return null for non-existent overhang ID', () => {
      const polygon = createTestPolygon()
      store.actions.addRoof(testStoreyId, 'gable', polygon, 0, 45, 3000, 500, testAssemblyId)

      const overhang = store.actions.getRoofOverhangById('roofoverhang_fake' as any)

      expect(overhang).toBeNull()
    })

    it('should return null for non-existent roof', () => {
      const overhang = store.actions.getRoofOverhangById('roofoverhang_fake' as any)

      expect(overhang).toBeNull()
    })
  })

  describe('updateRoofProperties', () => {
    it('should update single property (slope)', () => {
      const polygon = createTestPolygon()
      const roof = store.actions.addRoof(testStoreyId, 'gable', polygon, 0, 45, 3000, 500, testAssemblyId)

      const success = store.actions.updateRoofProperties(roof.id, { slope: 30 })

      expect(success).toBe(true)
      const updatedRoof = store.roofs[roof.id]
      expect(updatedRoof.slope).toBe(30)
      expect(updatedRoof.verticalOffset).toBe(3000) // Unchanged
    })

    it('should update multiple properties at once', () => {
      const polygon = createTestPolygon()
      const roof = store.actions.addRoof(testStoreyId, 'gable', polygon, 0, 45, 3000, 500, testAssemblyId)

      const success = store.actions.updateRoofProperties(roof.id, {
        slope: 35,
        verticalOffset: 3500
      })

      expect(success).toBe(true)
      const updatedRoof = store.roofs[roof.id]
      expect(updatedRoof.slope).toBe(35)
      expect(updatedRoof.verticalOffset).toBe(3500)
    })

    it('should update all properties at once', () => {
      const polygon = createTestPolygon()
      const roof = store.actions.addRoof(testStoreyId, 'gable', polygon, 0, 45, 3000, 500, testAssemblyId)

      const newAssemblyId = 'ra_new' as RoofAssemblyId
      const success = store.actions.updateRoofProperties(roof.id, {
        slope: 25,
        mainSideIndex: 1,
        verticalOffset: 2800,
        assemblyId: newAssemblyId
      })

      expect(success).toBe(true)
      const updatedRoof = store.roofs[roof.id]
      expect(updatedRoof.slope).toBe(25)
      expect(updatedRoof.verticalOffset).toBe(2800)
      expect(updatedRoof.assemblyId).toBe(newAssemblyId)
    })

    it('should handle empty updates object', () => {
      const polygon = createTestPolygon()
      const roof = store.actions.addRoof(testStoreyId, 'gable', polygon, 0, 45, 3000, 500, testAssemblyId)

      const success = store.actions.updateRoofProperties(roof.id, {})

      expect(success).toBe(true)
      const updatedRoof = store.roofs[roof.id]
      expect(updatedRoof.slope).toBe(45)
      expect(updatedRoof.verticalOffset).toBe(3000)
    })

    it('should reject invalid slope in update', () => {
      const polygon = createTestPolygon()
      const roof = store.actions.addRoof(testStoreyId, 'gable', polygon, 0, 45, 3000, 500, testAssemblyId)

      expect(() => {
        store.actions.updateRoofProperties(roof.id, { slope: -10 })
      }).toThrow('Roof slope must be between 0 and 90 degrees')

      expect(() => {
        store.actions.updateRoofProperties(roof.id, { slope: 100 })
      }).toThrow('Roof slope must be between 0 and 90 degrees')
    })

    it('should return false for non-existent roof', () => {
      const success = store.actions.updateRoofProperties('roof_nonexistent' as any, { slope: 30 })
      expect(success).toBe(false)
    })
  })

  describe('updateRoofArea', () => {
    it('should update area with same point count', () => {
      const polygon = createTestPolygon()
      const roof = store.actions.addRoof(testStoreyId, 'gable', polygon, 0, 45, 3000, 500, testAssemblyId)

      const newPolygon: Polygon2D = {
        points: [newVec2(0, 0), newVec2(200, 0), newVec2(200, 200), newVec2(0, 200)]
      }

      const success = store.actions.updateRoofArea(roof.id, newPolygon)

      expect(success).toBe(true)
      const updatedRoof = store.roofs[roof.id]
      expect(updatedRoof.referencePolygon.points).toHaveLength(4)
      expect(updatedRoof.referencePolygon.points[1][0]).toBe(200)
    })

    it('should preserve overhang values when updating area', () => {
      const polygon = createTestPolygon()
      const roof = store.actions.addRoof(testStoreyId, 'gable', polygon, 0, 45, 3000, 500, testAssemblyId)

      // Set different overhangs
      const overhangId0 = roof.overhangIds[0]
      const overhangId1 = roof.overhangIds[1]
      store.actions.updateRoofOverhangById(overhangId0, 300)
      store.actions.updateRoofOverhangById(overhangId1, 400)

      const newPolygon: Polygon2D = {
        points: [newVec2(0, 0), newVec2(200, 0), newVec2(200, 200), newVec2(0, 200)]
      }

      const success = store.actions.updateRoofArea(roof.id, newPolygon)

      expect(success).toBe(true)
      const updatedRoof = store.roofs[roof.id]
      expect(store.roofOverhangs[updatedRoof.overhangIds[0]].value).toBe(300)
      expect(store.roofOverhangs[updatedRoof.overhangIds[1]].value).toBe(400)
      expect(store.roofOverhangs[updatedRoof.overhangIds[2]].value).toBe(500)
      expect(store.roofOverhangs[updatedRoof.overhangIds[3]].value).toBe(500)
      // Check that IDs are preserved
      expect(updatedRoof.overhangIds[0]).toBe(overhangId0)
      expect(updatedRoof.overhangIds[1]).toBe(overhangId1)
      // Check that areas are recomputed
      expect(store.roofOverhangs[updatedRoof.overhangIds[0]].area.points).toHaveLength(4)
    })

    it('should reject update with different point count', () => {
      const polygon = createTestPolygon()
      const roof = store.actions.addRoof(testStoreyId, 'gable', polygon, 0, 45, 3000, 500, testAssemblyId)

      const trianglePolygon = createTrianglePolygon()

      expect(() => {
        store.actions.updateRoofArea(roof.id, trianglePolygon)
      }).toThrow('Cannot change roof polygon point count (current: 4, new: 3)')
    })

    it('should normalize polygon to clockwise on update', () => {
      const polygon = createTestPolygon()
      const roof = store.actions.addRoof(testStoreyId, 'gable', polygon, 0, 45, 3000, 500, testAssemblyId)

      const newPolygon = createTestPolygon()
      store.actions.updateRoofArea(roof.id, newPolygon)

      expect(ensurePolygonIsClockwiseMock).toHaveBeenCalledWith(newPolygon)
    })

    it('should reject self-intersecting polygon on update', () => {
      const polygon = createTestPolygon()
      const roof = store.actions.addRoof(testStoreyId, 'gable', polygon, 0, 45, 3000, 500, testAssemblyId)

      wouldClosingPolygonSelfIntersectMock.mockReturnValue(true)
      const badPolygon = createTestPolygon()

      expect(() => {
        store.actions.updateRoofArea(roof.id, badPolygon)
      }).toThrow('Roof polygon must not self-intersect')
    })

    it('should return false for non-existent roof', () => {
      const polygon = createTestPolygon()
      const success = store.actions.updateRoofArea('roof_nonexistent' as any, polygon)
      expect(success).toBe(false)
    })
  })

  describe('getRoofById', () => {
    it('should get roof by ID', () => {
      const polygon = createTestPolygon()
      const roof = store.actions.addRoof(testStoreyId, 'gable', polygon, 0, 45, 3000, 500, testAssemblyId)

      const retrieved = store.actions.getRoofById(roof.id)

      expect(retrieved).toBe(roof)
    })

    it('should return null for non-existent roof', () => {
      const retrieved = store.actions.getRoofById('roof_nonexistent' as any)
      expect(retrieved).toBeNull()
    })
  })

  describe('getRoofsByStorey', () => {
    it('should get roofs by storey', () => {
      const polygon = createTestPolygon()
      const storey1 = createStoreyId()
      const storey2 = createStoreyId()

      const roof1 = store.actions.addRoof(storey1, 'gable', polygon, 0, 45, 3000, 500, testAssemblyId)
      const roof2 = store.actions.addRoof(storey1, 'shed', polygon, 0, 30, 2500, 400, testAssemblyId)
      const roof3 = store.actions.addRoof(storey2, 'gable', polygon, 0, 40, 3200, 600, testAssemblyId)

      const storey1Roofs = store.actions.getRoofsByStorey(storey1)
      const storey2Roofs = store.actions.getRoofsByStorey(storey2)

      expect(storey1Roofs).toHaveLength(2)
      expect(storey1Roofs).toContain(roof1)
      expect(storey1Roofs).toContain(roof2)

      expect(storey2Roofs).toHaveLength(1)
      expect(storey2Roofs).toContain(roof3)
    })

    it('should return empty array for storey with no roofs', () => {
      const roofs = store.actions.getRoofsByStorey(createStoreyId())
      expect(roofs).toEqual([])
    })
  })

  describe('Type and referencePerimeter immutability', () => {
    it('should not have methods to update type', () => {
      const actions = store.actions
      expect(actions).not.toHaveProperty('updateRoofType')
    })

    it('should not have methods to update referencePerimeter', () => {
      const actions = store.actions
      expect(actions).not.toHaveProperty('updateRoofReferencePerimeter')
    })

    it('should preserve type and referencePerimeter on property updates', () => {
      const polygon = createTestPolygon()
      const perimeterId = 'perimeter_test' as any
      const roof = store.actions.addRoof(testStoreyId, 'gable', polygon, 0, 45, 3000, 500, testAssemblyId, perimeterId)

      store.actions.updateRoofProperties(roof.id, {
        slope: 30,
        verticalOffset: 2500
      })

      const updatedRoof = store.roofs[roof.id]
      expect(updatedRoof.type).toBe('gable')
      expect(updatedRoof.referencePerimeter).toBe(perimeterId)
    })
  })
})
