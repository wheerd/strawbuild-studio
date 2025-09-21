import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StoreyManagementService } from './StoreyManagementService'
import { createLength } from '@/types/geometry'
import { createStoreyLevel } from '@/types/model'
import type { Store } from '@/model/store/types'
import type { StoreyId, PerimeterId } from '@/types/ids'

describe('StoreyManagementService', () => {
  let service: StoreyManagementService
  let mockStore: any

  beforeEach(() => {
    mockStore = {
      addStorey: vi.fn(),
      removeStorey: vi.fn(),
      swapStoreyLevels: vi.fn(),
      adjustAllLevels: vi.fn(),
      compactStoreyLevels: vi.fn(),
      getStoreyById: vi.fn(),
      getStoreysOrderedByLevel: vi.fn(),
      addPerimeter: vi.fn(),
      removePerimeter: vi.fn(),
      getPerimetersByStorey: vi.fn()
    }
    service = new StoreyManagementService(mockStore as Store)
  })

  describe('moveStoreyUp', () => {
    it('should swap with storey above when not highest', () => {
      const storeys = [
        { id: 'storey-1' as StoreyId, name: 'Ground', level: createStoreyLevel(0), height: createLength(3000) },
        { id: 'storey-2' as StoreyId, name: 'First', level: createStoreyLevel(1), height: createLength(3000) },
        { id: 'storey-3' as StoreyId, name: 'Second', level: createStoreyLevel(2), height: createLength(3000) }
      ]

      mockStore.getStoreysOrderedByLevel.mockReturnValue(storeys)

      service.moveStoreyUp('storey-2' as StoreyId)

      expect(mockStore.swapStoreyLevels).toHaveBeenCalledWith('storey-2', 'storey-3')
    })

    it('should increase all levels when moving highest storey up', () => {
      const storeys = [
        { id: 'storey-1' as StoreyId, name: 'Basement', level: createStoreyLevel(-1), height: createLength(3000) },
        { id: 'storey-2' as StoreyId, name: 'Ground', level: createStoreyLevel(0), height: createLength(3000) }
      ]

      mockStore.getStoreysOrderedByLevel.mockReturnValue(storeys)

      service.moveStoreyUp('storey-2' as StoreyId)

      expect(mockStore.adjustAllLevels).toHaveBeenCalledWith(1)
    })

    it('should throw error when moving highest would make lowest > 0', () => {
      const storeys = [
        { id: 'storey-1' as StoreyId, name: 'Ground', level: createStoreyLevel(0), height: createLength(3000) },
        { id: 'storey-2' as StoreyId, name: 'First', level: createStoreyLevel(1), height: createLength(3000) }
      ]

      mockStore.getStoreysOrderedByLevel.mockReturnValue(storeys)

      expect(() => service.moveStoreyUp('storey-2' as StoreyId)).toThrow(
        'Cannot move floor up: lowest floor would exceed ground level'
      )
    })

    it('should do nothing with single storey', () => {
      const storeys = [
        { id: 'storey-1' as StoreyId, name: 'Ground', level: createStoreyLevel(0), height: createLength(3000) }
      ]

      mockStore.getStoreysOrderedByLevel.mockReturnValue(storeys)

      service.moveStoreyUp('storey-1' as StoreyId)

      expect(mockStore.swapStoreyLevels).not.toHaveBeenCalled()
      expect(mockStore.adjustAllLevels).not.toHaveBeenCalled()
    })
  })

  describe('moveStoreyDown', () => {
    it('should swap with storey below when not lowest', () => {
      const storeys = [
        { id: 'storey-1' as StoreyId, name: 'Ground', level: createStoreyLevel(0), height: createLength(3000) },
        { id: 'storey-2' as StoreyId, name: 'First', level: createStoreyLevel(1), height: createLength(3000) },
        { id: 'storey-3' as StoreyId, name: 'Second', level: createStoreyLevel(2), height: createLength(3000) }
      ]

      mockStore.getStoreysOrderedByLevel.mockReturnValue(storeys)

      service.moveStoreyDown('storey-2' as StoreyId)

      expect(mockStore.swapStoreyLevels).toHaveBeenCalledWith('storey-2', 'storey-1')
    })

    it('should decrease all levels when moving lowest storey down', () => {
      const storeys = [
        { id: 'storey-1' as StoreyId, name: 'Ground', level: createStoreyLevel(0), height: createLength(3000) },
        { id: 'storey-2' as StoreyId, name: 'First', level: createStoreyLevel(1), height: createLength(3000) }
      ]

      mockStore.getStoreysOrderedByLevel.mockReturnValue(storeys)

      service.moveStoreyDown('storey-1' as StoreyId)

      expect(mockStore.adjustAllLevels).toHaveBeenCalledWith(-1)
    })

    it('should throw error when moving lowest would make highest < 0', () => {
      const storeys = [
        { id: 'storey-1' as StoreyId, name: 'Basement', level: createStoreyLevel(-1), height: createLength(3000) },
        { id: 'storey-2' as StoreyId, name: 'Ground', level: createStoreyLevel(0), height: createLength(3000) }
      ]

      mockStore.getStoreysOrderedByLevel.mockReturnValue(storeys)

      expect(() => service.moveStoreyDown('storey-1' as StoreyId)).toThrow(
        'Cannot move floor down: highest floor would go below ground level'
      )
    })
  })

  describe('duplicateStorey', () => {
    it('should create a copy with next available level', () => {
      const sourceStorey = {
        id: 'storey-1' as StoreyId,
        name: 'Ground Floor',
        level: createStoreyLevel(0),
        height: createLength(3000)
      }

      const newStorey = {
        id: 'storey-2' as StoreyId,
        name: 'Ground Floor Copy',
        level: createStoreyLevel(1),
        height: createLength(3000)
      }

      mockStore.getStoreyById.mockReturnValue(sourceStorey)
      mockStore.getStoreysOrderedByLevel.mockReturnValue([{}, {}, { level: createStoreyLevel(42) }]) // Simulate existing storeys
      mockStore.addStorey.mockReturnValue(newStorey)
      mockStore.getPerimetersByStorey.mockReturnValue([])

      const result = service.duplicateStorey('storey-1' as StoreyId)

      expect(mockStore.addStorey).toHaveBeenCalledWith('Ground Floor Copy', createStoreyLevel(43), createLength(3000))
      expect(result).toEqual(newStorey)
    })

    it('should use custom name when provided', () => {
      const sourceStorey = {
        id: 'storey-1' as StoreyId,
        name: 'Ground Floor',
        level: createStoreyLevel(0),
        height: createLength(3000)
      }

      const newStorey = {
        id: 'storey-2' as StoreyId,
        name: 'Custom Name',
        level: createStoreyLevel(1),
        height: createLength(3000)
      }

      mockStore.getStoreyById.mockReturnValue(sourceStorey)
      mockStore.getStoreysOrderedByLevel.mockReturnValue([sourceStorey])
      mockStore.addStorey.mockReturnValue(newStorey)
      mockStore.getPerimetersByStorey.mockReturnValue([])

      service.duplicateStorey('storey-1' as StoreyId, 'Custom Name')

      expect(mockStore.addStorey).toHaveBeenCalledWith('Custom Name', createStoreyLevel(1), createLength(3000))
    })

    it('should throw error for non-existent storey', () => {
      mockStore.getStoreyById.mockReturnValue(null)

      expect(() => service.duplicateStorey('non-existent' as StoreyId)).toThrow('Source storey not found')
    })

    it('should handle duplication when only one storey exists', () => {
      const sourceStorey = {
        id: 'storey-1' as StoreyId,
        name: 'Only Floor',
        level: createStoreyLevel(0),
        height: createLength(3000)
      }

      const newStorey = {
        id: 'storey-2' as StoreyId,
        name: 'Only Floor Copy',
        level: createStoreyLevel(1),
        height: createLength(3000)
      }

      mockStore.getStoreyById.mockReturnValue(sourceStorey)
      mockStore.getStoreysOrderedByLevel.mockReturnValue([sourceStorey])
      mockStore.addStorey.mockReturnValue(newStorey)
      mockStore.getPerimetersByStorey.mockReturnValue([])

      const result = service.duplicateStorey('storey-1' as StoreyId)

      expect(mockStore.addStorey).toHaveBeenCalledWith('Only Floor Copy', createStoreyLevel(1), createLength(3000))
      expect(result).toEqual(newStorey)
    })

    it('should duplicate perimeters from source storey', () => {
      const sourceStorey = {
        id: 'storey-1' as StoreyId,
        name: 'Ground Floor',
        level: createStoreyLevel(0),
        height: createLength(3000)
      }

      const newStorey = {
        id: 'storey-2' as StoreyId,
        name: 'Ground Floor Copy',
        level: createStoreyLevel(1),
        height: createLength(3000)
      }

      const sourcePerimeter = {
        id: 'perimeter-1' as PerimeterId,
        storeyId: 'storey-1' as StoreyId,
        corners: [
          { insidePoint: [0, 0] },
          { insidePoint: [10, 0] },
          { insidePoint: [10, 10] },
          { insidePoint: [0, 10] }
        ],
        walls: [{ constructionMethodId: 'method-1' as any, thickness: createLength(400) }],
        baseRingBeamMethodId: 'base-method' as any,
        topRingBeamMethodId: 'top-method' as any
      }

      mockStore.getStoreyById.mockReturnValue(sourceStorey)
      mockStore.getStoreysOrderedByLevel.mockReturnValue([sourceStorey])
      mockStore.addStorey.mockReturnValue(newStorey)
      mockStore.getPerimetersByStorey.mockReturnValue([sourcePerimeter])

      service.duplicateStorey('storey-1' as StoreyId)

      expect(mockStore.addPerimeter).toHaveBeenCalledWith(
        'storey-2',
        {
          points: [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10]
          ]
        },
        'method-1',
        createLength(400),
        'base-method',
        'top-method'
      )
    })
  })

  describe('deleteStorey', () => {
    it('should delete storey and associated perimeters, then compact levels', () => {
      const perimeters = [{ id: 'perimeter-1' as PerimeterId }, { id: 'perimeter-2' as PerimeterId }]

      mockStore.getPerimetersByStorey.mockReturnValue(perimeters)

      service.deleteStorey('storey-1' as StoreyId)

      expect(mockStore.removePerimeter).toHaveBeenCalledWith('perimeter-1')
      expect(mockStore.removePerimeter).toHaveBeenCalledWith('perimeter-2')
      expect(mockStore.removeStorey).toHaveBeenCalledWith('storey-1')
      expect(mockStore.compactStoreyLevels).toHaveBeenCalled()
    })
  })
})
