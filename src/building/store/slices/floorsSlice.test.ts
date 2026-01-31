import { beforeEach, describe, expect, it, vi } from 'vitest'

import { type StoreyId, createFloorAreaId, createFloorOpeningId, createStoreyId } from '@/building/model/ids'
import {
  type Polygon2D,
  ensurePolygonIsClockwise,
  ensurePolygonIsCounterClockwise,
  newVec2,
  wouldClosingPolygonSelfIntersect
} from '@/shared/geometry'

import { type FloorsSlice, createFloorsSlice } from './floorsSlice'

vi.mock('@/shared/geometry/polygon', async importOriginal => {
  return {
    ...(await importOriginal()),
    wouldClosingPolygonSelfIntersect: vi.fn(),
    ensurePolygonIsClockwise: vi.fn(),
    ensurePolygonIsCounterClockwise: vi.fn()
  }
})

const wouldClosingPolygonSelfIntersectMock = vi.mocked(wouldClosingPolygonSelfIntersect)
const ensurePolygonIsClockwiseMock = vi.mocked(ensurePolygonIsClockwise)
const ensurePolygonIsCounterClockwiseMock = vi.mocked(ensurePolygonIsCounterClockwise)

vi.mock('zustand')

describe('floorsSlice', () => {
  let store: FloorsSlice
  let mockSet: any
  let mockGet: any
  let testStoreyId: StoreyId

  beforeEach(() => {
    wouldClosingPolygonSelfIntersectMock.mockReset()
    wouldClosingPolygonSelfIntersectMock.mockReturnValue(false)
    ensurePolygonIsClockwiseMock.mockReset()
    ensurePolygonIsClockwiseMock.mockImplementation(p => p)
    ensurePolygonIsCounterClockwiseMock.mockImplementation(p => p)

    mockSet = vi.fn()
    mockGet = vi.fn()
    const mockStore = {} as any
    testStoreyId = createStoreyId()

    store = createFloorsSlice(mockSet, mockGet, mockStore)
    store = { ...store, timestamps: {} } as any

    mockGet.mockImplementation(() => store)

    mockSet.mockImplementation((updater: any) => {
      if (typeof updater === 'function') {
        updater(store)
      } else {
        store = { ...store, ...updater }
      }
    })
  })

  const createRectangularPolygon = (): Polygon2D => ({
    points: [newVec2(0, 0), newVec2(10, 0), newVec2(10, 5), newVec2(0, 5)]
  })

  const createTriangularPolygon = (): Polygon2D => ({
    points: [newVec2(0, 0), newVec2(5, 0), newVec2(2.5, 4)]
  })

  describe('Floor Areas', () => {
    describe('addFloorArea', () => {
      it('should add a valid clockwise floor area', () => {
        const polygon = createRectangularPolygon()

        const floorArea = store.actions.addFloorArea(testStoreyId, polygon)

        expect(floorArea).toBeDefined()
        expect(floorArea.id).toBeTruthy()
        expect(floorArea.storeyId).toBe(testStoreyId)
        expect(floorArea.area).toEqual(polygon)
        expect(Object.keys(store.floorAreas).length).toBe(1)
      })

      it('should add multiple floor areas to the same storey', () => {
        const polygon1 = createRectangularPolygon()
        const polygon2 = createTriangularPolygon()

        store.actions.addFloorArea(testStoreyId, polygon1)
        store.actions.addFloorArea(testStoreyId, polygon2)

        expect(Object.keys(store.floorAreas).length).toBe(2)
        const areas = store.actions.getFloorAreasByStorey(testStoreyId)
        expect(areas).toHaveLength(2)
      })

      it('should add floor areas to different storeys', () => {
        const storey1Id = createStoreyId()
        const storey2Id = createStoreyId()
        const polygon = createRectangularPolygon()

        store.actions.addFloorArea(storey1Id, polygon)
        store.actions.addFloorArea(storey2Id, polygon)

        expect(Object.keys(store.floorAreas).length).toBe(2)
        expect(store.actions.getFloorAreasByStorey(storey1Id)).toHaveLength(1)
        expect(store.actions.getFloorAreasByStorey(storey2Id)).toHaveLength(1)
      })

      it('should throw error for polygon with less than 3 points', () => {
        const invalidPolygon: Polygon2D = {
          points: [newVec2(0, 0), newVec2(1, 0)]
        }

        expect(() => store.actions.addFloorArea(testStoreyId, invalidPolygon)).toThrow(
          'Polygon must have at least 3 points'
        )
      })

      it('should throw error for self-intersecting polygon', () => {
        const polygon = createRectangularPolygon()
        wouldClosingPolygonSelfIntersectMock.mockReturnValue(true)

        expect(() => store.actions.addFloorArea(testStoreyId, polygon)).toThrow('Polygon must not self-intersect')
      })

      it('should automatically flip counter-clockwise polygon to clockwise', () => {
        const polygon = createRectangularPolygon()

        const floorArea = store.actions.addFloorArea(testStoreyId, polygon)

        expect(ensurePolygonIsClockwiseMock).toHaveBeenCalledWith(polygon)
        expect(floorArea.area).toBe(polygon)
      })
    })

    describe('removeFloorArea', () => {
      it('should remove existing floor area', () => {
        const polygon = createRectangularPolygon()

        const floorArea = store.actions.addFloorArea(testStoreyId, polygon)
        expect(Object.keys(store.floorAreas).length).toBe(1)

        store.actions.removeFloorArea(floorArea.id)

        expect(Object.keys(store.floorAreas).length).toBe(0)
        expect(store.actions.getFloorAreaById(floorArea.id)).toBeNull()
      })

      it('should handle removing non-existent floor area gracefully', () => {
        const fakeId = createFloorAreaId()
        const initialSize = Object.keys(store.floorAreas).length

        store.actions.removeFloorArea(fakeId)

        expect(Object.keys(store.floorAreas).length).toBe(initialSize)
      })

      it('should not affect other floor areas when removing one', () => {
        const polygon1 = createRectangularPolygon()
        const polygon2 = createTriangularPolygon()

        const area1 = store.actions.addFloorArea(testStoreyId, polygon1)
        const area2 = store.actions.addFloorArea(testStoreyId, polygon2)

        store.actions.removeFloorArea(area1.id)

        expect(Object.keys(store.floorAreas).length).toBe(1)
        expect(store.actions.getFloorAreaById(area2.id)).toBeTruthy()
      })
    })

    describe('updateFloorArea', () => {
      it('should update existing floor area with valid polygon', () => {
        const polygon1 = createRectangularPolygon()
        const polygon2 = createTriangularPolygon()

        const floorArea = store.actions.addFloorArea(testStoreyId, polygon1)

        const success = store.actions.updateFloorArea(floorArea.id, polygon2)

        expect(success).toBe(true)
        const updated = store.actions.getFloorAreaById(floorArea.id)
        expect(updated?.area).toEqual(polygon2)
      })

      it('should return false for non-existent floor area', () => {
        const fakeId = createFloorAreaId()
        const polygon = createRectangularPolygon()

        const success = store.actions.updateFloorArea(fakeId, polygon)

        expect(success).toBe(false)
      })

      it('should throw error for invalid polygon', () => {
        const polygon1 = createRectangularPolygon()

        const floorArea = store.actions.addFloorArea(testStoreyId, polygon1)

        const invalidPolygon: Polygon2D = {
          points: [newVec2(0, 0), newVec2(1, 0)]
        }

        expect(() => store.actions.updateFloorArea(floorArea.id, invalidPolygon)).toThrow(
          'Polygon must have at least 3 points'
        )
      })

      it('should throw error for self-intersecting polygon', () => {
        const polygon1 = createRectangularPolygon()

        const floorArea = store.actions.addFloorArea(testStoreyId, polygon1)

        wouldClosingPolygonSelfIntersectMock.mockReturnValue(true)
        const polygon2 = createRectangularPolygon()

        expect(() => store.actions.updateFloorArea(floorArea.id, polygon2)).toThrow('Polygon must not self-intersect')
      })

      it('should automatically flip counter-clockwise polygon to clockwise on update', () => {
        const polygon1 = createRectangularPolygon()

        const floorArea = store.actions.addFloorArea(testStoreyId, polygon1)

        const polygon2 = createRectangularPolygon()

        const success = store.actions.updateFloorArea(floorArea.id, polygon2)

        expect(success).toBe(true)
        expect(ensurePolygonIsClockwiseMock).toHaveBeenCalledWith(polygon2)
        expect(floorArea.area).toBe(polygon2)
      })
    })

    describe('getFloorAreaById', () => {
      it('should return existing floor area', () => {
        const polygon = createRectangularPolygon()

        const floorArea = store.actions.addFloorArea(testStoreyId, polygon)
        const result = store.actions.getFloorAreaById(floorArea.id)

        expect(result).toBeDefined()
        expect(result?.id).toBe(floorArea.id)
        expect(result).toEqual(floorArea)
      })

      it('should return null for non-existent floor area', () => {
        const fakeId = createFloorAreaId()
        const result = store.actions.getFloorAreaById(fakeId)

        expect(result).toBeNull()
      })
    })

    describe('getFloorAreasByStorey', () => {
      it('should return empty array when no floor areas exist', () => {
        const areas = store.actions.getFloorAreasByStorey(testStoreyId)
        expect(areas).toEqual([])
      })

      it('should return floor areas for specific storey', () => {
        const storey1Id = createStoreyId()
        const storey2Id = createStoreyId()
        const polygon = createRectangularPolygon()

        store.actions.addFloorArea(storey1Id, polygon)
        store.actions.addFloorArea(storey1Id, polygon)
        store.actions.addFloorArea(storey2Id, polygon)

        const storey1Areas = store.actions.getFloorAreasByStorey(storey1Id)
        const storey2Areas = store.actions.getFloorAreasByStorey(storey2Id)

        expect(storey1Areas).toHaveLength(2)
        expect(storey2Areas).toHaveLength(1)
        expect(storey1Areas.every(a => a.storeyId === storey1Id)).toBe(true)
        expect(storey2Areas.every(a => a.storeyId === storey2Id)).toBe(true)
      })

      it('should return empty array for non-existent storey', () => {
        const polygon = createRectangularPolygon()

        store.actions.addFloorArea(testStoreyId, polygon)

        const nonExistentStoreyId = createStoreyId()
        const areas = store.actions.getFloorAreasByStorey(nonExistentStoreyId)

        expect(areas).toEqual([])
      })
    })
  })

  describe('Floor Openings', () => {
    describe('addFloorOpening', () => {
      it('should add a valid counter-clockwise floor opening', () => {
        const polygon = createRectangularPolygon()

        const floorOpening = store.actions.addFloorOpening(testStoreyId, polygon)

        expect(floorOpening).toBeDefined()
        expect(floorOpening.id).toBeTruthy()
        expect(floorOpening.storeyId).toBe(testStoreyId)
        expect(floorOpening.area).toEqual(polygon)
        expect(Object.keys(store.floorOpenings).length).toBe(1)
      })

      it('should add multiple floor openings to the same storey', () => {
        const polygon1 = createRectangularPolygon()
        const polygon2 = createTriangularPolygon()

        store.actions.addFloorOpening(testStoreyId, polygon1)
        store.actions.addFloorOpening(testStoreyId, polygon2)

        expect(Object.keys(store.floorOpenings).length).toBe(2)
        const openings = store.actions.getFloorOpeningsByStorey(testStoreyId)
        expect(openings).toHaveLength(2)
      })

      it('should add floor openings to different storeys', () => {
        const storey1Id = createStoreyId()
        const storey2Id = createStoreyId()
        const polygon = createRectangularPolygon()

        store.actions.addFloorOpening(storey1Id, polygon)
        store.actions.addFloorOpening(storey2Id, polygon)

        expect(Object.keys(store.floorOpenings).length).toBe(2)
        expect(store.actions.getFloorOpeningsByStorey(storey1Id)).toHaveLength(1)
        expect(store.actions.getFloorOpeningsByStorey(storey2Id)).toHaveLength(1)
      })

      it('should throw error for polygon with less than 3 points', () => {
        const invalidPolygon: Polygon2D = {
          points: [newVec2(0, 0), newVec2(1, 0)]
        }

        expect(() => store.actions.addFloorOpening(testStoreyId, invalidPolygon)).toThrow(
          'Polygon must have at least 3 points'
        )
      })

      it('should throw error for self-intersecting polygon', () => {
        const polygon = createRectangularPolygon()
        wouldClosingPolygonSelfIntersectMock.mockReturnValue(true)

        expect(() => store.actions.addFloorOpening(testStoreyId, polygon)).toThrow('Polygon must not self-intersect')
      })

      it('should automatically flip clockwise polygon to counter-clockwise', () => {
        const polygon = createRectangularPolygon()

        const floorOpening = store.actions.addFloorOpening(testStoreyId, polygon)

        expect(ensurePolygonIsCounterClockwiseMock).toHaveBeenCalledWith(polygon)
        expect(floorOpening.area).toBe(polygon)
      })
    })

    describe('removeFloorOpening', () => {
      it('should remove existing floor opening', () => {
        const polygon = createRectangularPolygon()

        const floorOpening = store.actions.addFloorOpening(testStoreyId, polygon)
        expect(Object.keys(store.floorOpenings).length).toBe(1)

        store.actions.removeFloorOpening(floorOpening.id)

        expect(Object.keys(store.floorOpenings).length).toBe(0)
        expect(store.actions.getFloorOpeningById(floorOpening.id)).toBeNull()
      })

      it('should handle removing non-existent floor opening gracefully', () => {
        const fakeId = createFloorOpeningId()
        const initialSize = Object.keys(store.floorOpenings).length

        store.actions.removeFloorOpening(fakeId)

        expect(Object.keys(store.floorOpenings).length).toBe(initialSize)
      })

      it('should not affect other floor openings when removing one', () => {
        const polygon1 = createRectangularPolygon()
        const polygon2 = createTriangularPolygon()

        const opening1 = store.actions.addFloorOpening(testStoreyId, polygon1)
        const opening2 = store.actions.addFloorOpening(testStoreyId, polygon2)

        store.actions.removeFloorOpening(opening1.id)

        expect(Object.keys(store.floorOpenings).length).toBe(1)
        expect(store.actions.getFloorOpeningById(opening2.id)).toBeTruthy()
      })
    })

    describe('updateFloorOpening', () => {
      it('should update existing floor opening with valid polygon', () => {
        const polygon1 = createRectangularPolygon()
        const polygon2 = createTriangularPolygon()

        const floorOpening = store.actions.addFloorOpening(testStoreyId, polygon1)

        const success = store.actions.updateFloorOpening(floorOpening.id, polygon2)

        expect(success).toBe(true)
        const updated = store.actions.getFloorOpeningById(floorOpening.id)
        expect(updated?.area).toEqual(polygon2)
      })

      it('should return false for non-existent floor opening', () => {
        const fakeId = createFloorOpeningId()
        const polygon = createRectangularPolygon()

        const success = store.actions.updateFloorOpening(fakeId, polygon)

        expect(success).toBe(false)
      })

      it('should throw error for invalid polygon', () => {
        const polygon1 = createRectangularPolygon()

        const floorOpening = store.actions.addFloorOpening(testStoreyId, polygon1)

        const invalidPolygon: Polygon2D = {
          points: [newVec2(0, 0), newVec2(1, 0)]
        }

        expect(() => store.actions.updateFloorOpening(floorOpening.id, invalidPolygon)).toThrow(
          'Polygon must have at least 3 points'
        )
      })

      it('should throw error for self-intersecting polygon', () => {
        const polygon1 = createRectangularPolygon()

        const floorOpening = store.actions.addFloorOpening(testStoreyId, polygon1)

        wouldClosingPolygonSelfIntersectMock.mockReturnValue(true)
        const polygon2 = createRectangularPolygon()

        expect(() => store.actions.updateFloorOpening(floorOpening.id, polygon2)).toThrow(
          'Polygon must not self-intersect'
        )
      })

      it('should automatically flip clockwise polygon to counter-clockwise on update', () => {
        const polygon1 = createRectangularPolygon()

        const floorOpening = store.actions.addFloorOpening(testStoreyId, polygon1)

        const polygon2 = createRectangularPolygon()

        const success = store.actions.updateFloorOpening(floorOpening.id, polygon2)

        expect(success).toBe(true)
        expect(ensurePolygonIsCounterClockwiseMock).toHaveBeenCalledWith(polygon2)
        expect(floorOpening.area).toBe(polygon2)
      })
    })

    describe('getFloorOpeningById', () => {
      it('should return existing floor opening', () => {
        const polygon = createRectangularPolygon()

        const floorOpening = store.actions.addFloorOpening(testStoreyId, polygon)
        const result = store.actions.getFloorOpeningById(floorOpening.id)

        expect(result).toBeDefined()
        expect(result?.id).toBe(floorOpening.id)
        expect(result).toEqual(floorOpening)
      })

      it('should return null for non-existent floor opening', () => {
        const fakeId = createFloorOpeningId()
        const result = store.actions.getFloorOpeningById(fakeId)

        expect(result).toBeNull()
      })
    })

    describe('getFloorOpeningsByStorey', () => {
      it('should return empty array when no floor openings exist', () => {
        const openings = store.actions.getFloorOpeningsByStorey(testStoreyId)
        expect(openings).toEqual([])
      })

      it('should return floor openings for specific storey', () => {
        const storey1Id = createStoreyId()
        const storey2Id = createStoreyId()
        const polygon = createRectangularPolygon()

        store.actions.addFloorOpening(storey1Id, polygon)
        store.actions.addFloorOpening(storey1Id, polygon)
        store.actions.addFloorOpening(storey2Id, polygon)

        const storey1Openings = store.actions.getFloorOpeningsByStorey(storey1Id)
        const storey2Openings = store.actions.getFloorOpeningsByStorey(storey2Id)

        expect(storey1Openings).toHaveLength(2)
        expect(storey2Openings).toHaveLength(1)
        expect(storey1Openings.every(o => o.storeyId === storey1Id)).toBe(true)
        expect(storey2Openings.every(o => o.storeyId === storey2Id)).toBe(true)
      })

      it('should return empty array for non-existent storey', () => {
        const polygon = createRectangularPolygon()

        store.actions.addFloorOpening(testStoreyId, polygon)

        const nonExistentStoreyId = createStoreyId()
        const openings = store.actions.getFloorOpeningsByStorey(nonExistentStoreyId)

        expect(openings).toEqual([])
      })
    })
  })

  describe('Complex scenarios', () => {
    it('should handle both floor areas and openings independently', () => {
      const areaPolygon = createRectangularPolygon()
      const openingPolygon = createTriangularPolygon()

      const area = store.actions.addFloorArea(testStoreyId, areaPolygon)

      const opening = store.actions.addFloorOpening(testStoreyId, openingPolygon)

      expect(Object.keys(store.floorAreas).length).toBe(1)
      expect(Object.keys(store.floorOpenings).length).toBe(1)
      expect(store.actions.getFloorAreaById(area.id)).toBeTruthy()
      expect(store.actions.getFloorOpeningById(opening.id)).toBeTruthy()
    })

    it('should maintain data consistency after multiple operations', () => {
      const polygon1 = createRectangularPolygon()
      const polygon2 = createTriangularPolygon()

      const area1 = store.actions.addFloorArea(testStoreyId, polygon1)
      const area2 = store.actions.addFloorArea(testStoreyId, polygon2)

      const opening1 = store.actions.addFloorOpening(testStoreyId, polygon1)

      store.actions.removeFloorArea(area1.id)

      expect(Object.keys(store.floorAreas).length).toBe(1)
      expect(Object.keys(store.floorOpenings).length).toBe(1)
      expect(store.actions.getFloorAreaById(area2.id)).toBeTruthy()
      expect(store.actions.getFloorOpeningById(opening1.id)).toBeTruthy()

      store.actions.updateFloorArea(area2.id, polygon1)

      const updatedArea = store.actions.getFloorAreaById(area2.id)
      expect(updatedArea?.area).toEqual(polygon1)
    })

    it('should correctly filter by storey for mixed data', () => {
      const storey1Id = createStoreyId()
      const storey2Id = createStoreyId()
      const polygon = createRectangularPolygon()

      store.actions.addFloorArea(storey1Id, polygon)
      store.actions.addFloorArea(storey2Id, polygon)

      store.actions.addFloorOpening(storey1Id, polygon)
      store.actions.addFloorOpening(storey1Id, polygon)
      store.actions.addFloorOpening(storey2Id, polygon)

      const storey1Areas = store.actions.getFloorAreasByStorey(storey1Id)
      const storey1Openings = store.actions.getFloorOpeningsByStorey(storey1Id)
      const storey2Areas = store.actions.getFloorAreasByStorey(storey2Id)
      const storey2Openings = store.actions.getFloorOpeningsByStorey(storey2Id)

      expect(storey1Areas).toHaveLength(1)
      expect(storey1Openings).toHaveLength(2)
      expect(storey2Areas).toHaveLength(1)
      expect(storey2Openings).toHaveLength(1)
    })
  })
})
