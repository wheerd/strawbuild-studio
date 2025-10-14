import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_SLAB_CONFIG_ID, type PerimeterId, type StoreyId } from '@/building/model/ids'
import { createStoreyLevel } from '@/building/model/model'
import { createLength } from '@/shared/geometry'

import { StoreyManagementService } from './StoreyManagementService'

describe('StoreyManagementService', () => {
  let service: StoreyManagementService
  let mockActions: any

  beforeEach(() => {
    mockActions = {
      addStorey: vi.fn(),
      removeStorey: vi.fn(),
      swapStoreyLevels: vi.fn(),
      adjustAllLevels: vi.fn(),
      getStoreyById: vi.fn(),
      getStoreysOrderedByLevel: vi.fn(),
      addPerimeter: vi.fn(),
      removePerimeter: vi.fn(),
      getPerimetersByStorey: vi.fn()
    }
    service = new StoreyManagementService(mockActions)
  })

  describe('moveStoreyUp', () => {
    it('should swap with storey above when not highest', () => {
      const storeys = [
        { id: 'storey-1' as StoreyId, name: 'Ground', level: createStoreyLevel(0), height: createLength(3000) },
        { id: 'storey-2' as StoreyId, name: 'First', level: createStoreyLevel(1), height: createLength(3000) },
        { id: 'storey-3' as StoreyId, name: 'Second', level: createStoreyLevel(2), height: createLength(3000) }
      ]

      mockActions.getStoreysOrderedByLevel.mockReturnValue(storeys)

      service.moveStoreyUp('storey-2' as StoreyId)

      expect(mockActions.swapStoreyLevels).toHaveBeenCalledWith('storey-2', 'storey-3')
    })

    it('should increase all levels when moving highest storey up', () => {
      const storeys = [
        { id: 'storey-1' as StoreyId, name: 'Basement', level: createStoreyLevel(-1), height: createLength(3000) },
        { id: 'storey-2' as StoreyId, name: 'Ground', level: createStoreyLevel(0), height: createLength(3000) }
      ]

      mockActions.getStoreysOrderedByLevel.mockReturnValue(storeys)

      service.moveStoreyUp('storey-2' as StoreyId)

      expect(mockActions.adjustAllLevels).toHaveBeenCalledWith(1)
    })

    it('should throw error when moving highest would make lowest > 0', () => {
      const storeys = [
        { id: 'storey-1' as StoreyId, name: 'Ground', level: createStoreyLevel(0), height: createLength(3000) },
        { id: 'storey-2' as StoreyId, name: 'First', level: createStoreyLevel(1), height: createLength(3000) }
      ]

      mockActions.getStoreysOrderedByLevel.mockReturnValue(storeys)

      expect(() => service.moveStoreyUp('storey-2' as StoreyId)).toThrow(
        'Cannot move floor up: lowest floor would exceed ground level'
      )
    })

    it('should do nothing with single storey', () => {
      const storeys = [
        { id: 'storey-1' as StoreyId, name: 'Ground', level: createStoreyLevel(0), height: createLength(3000) }
      ]

      mockActions.getStoreysOrderedByLevel.mockReturnValue(storeys)

      service.moveStoreyUp('storey-1' as StoreyId)

      expect(mockActions.swapStoreyLevels).not.toHaveBeenCalled()
      expect(mockActions.adjustAllLevels).not.toHaveBeenCalled()
    })
  })

  describe('moveStoreyDown', () => {
    it('should swap with storey below when not lowest', () => {
      const storeys = [
        { id: 'storey-1' as StoreyId, name: 'Ground', level: createStoreyLevel(0), height: createLength(3000) },
        { id: 'storey-2' as StoreyId, name: 'First', level: createStoreyLevel(1), height: createLength(3000) },
        { id: 'storey-3' as StoreyId, name: 'Second', level: createStoreyLevel(2), height: createLength(3000) }
      ]

      mockActions.getStoreysOrderedByLevel.mockReturnValue(storeys)

      service.moveStoreyDown('storey-2' as StoreyId)

      expect(mockActions.swapStoreyLevels).toHaveBeenCalledWith('storey-2', 'storey-1')
    })

    it('should decrease all levels when moving lowest storey down', () => {
      const storeys = [
        { id: 'storey-1' as StoreyId, name: 'Ground', level: createStoreyLevel(0), height: createLength(3000) },
        { id: 'storey-2' as StoreyId, name: 'First', level: createStoreyLevel(1), height: createLength(3000) }
      ]

      mockActions.getStoreysOrderedByLevel.mockReturnValue(storeys)

      service.moveStoreyDown('storey-1' as StoreyId)

      expect(mockActions.adjustAllLevels).toHaveBeenCalledWith(-1)
    })

    it('should throw error when moving lowest would make highest < 0', () => {
      const storeys = [
        { id: 'storey-1' as StoreyId, name: 'Basement', level: createStoreyLevel(-1), height: createLength(3000) },
        { id: 'storey-2' as StoreyId, name: 'Ground', level: createStoreyLevel(0), height: createLength(3000) }
      ]

      mockActions.getStoreysOrderedByLevel.mockReturnValue(storeys)

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
        height: createLength(3000),
        slabConstructionConfigId: DEFAULT_SLAB_CONFIG_ID
      }

      const newStorey = {
        id: 'storey-2' as StoreyId,
        name: 'Ground Floor Copy',
        level: createStoreyLevel(1),
        height: createLength(3000),
        slabConstructionConfigId: DEFAULT_SLAB_CONFIG_ID
      }

      mockActions.getStoreyById.mockReturnValue(sourceStorey)
      mockActions.getStoreysOrderedByLevel.mockReturnValue([{}, {}, { level: createStoreyLevel(42) }]) // Simulate existing storeys
      mockActions.addStorey.mockReturnValue(newStorey)
      mockActions.getPerimetersByStorey.mockReturnValue([])

      const result = service.duplicateStorey('storey-1' as StoreyId)

      expect(mockActions.addStorey).toHaveBeenCalledWith(
        'Ground Floor Copy',
        createLength(3000),
        DEFAULT_SLAB_CONFIG_ID
      )
      expect(result).toEqual(newStorey)
    })

    it('should use custom name when provided', () => {
      const sourceStorey = {
        id: 'storey-1' as StoreyId,
        name: 'Ground Floor',
        level: createStoreyLevel(0),
        height: createLength(3000),
        slabConstructionConfigId: DEFAULT_SLAB_CONFIG_ID
      }

      const newStorey = {
        id: 'storey-2' as StoreyId,
        name: 'Custom Name',
        level: createStoreyLevel(1),
        height: createLength(3000),
        slabConstructionConfigId: DEFAULT_SLAB_CONFIG_ID
      }

      mockActions.getStoreyById.mockReturnValue(sourceStorey)
      mockActions.getStoreysOrderedByLevel.mockReturnValue([sourceStorey])
      mockActions.addStorey.mockReturnValue(newStorey)
      mockActions.getPerimetersByStorey.mockReturnValue([])

      service.duplicateStorey('storey-1' as StoreyId, 'Custom Name')

      expect(mockActions.addStorey).toHaveBeenCalledWith('Custom Name', createLength(3000), DEFAULT_SLAB_CONFIG_ID)
    })

    it('should throw error for non-existent storey', () => {
      mockActions.getStoreyById.mockReturnValue(null)

      expect(() => service.duplicateStorey('non-existent' as StoreyId)).toThrow('Source storey not found')
    })

    it('should handle duplication when only one storey exists', () => {
      const sourceStorey = {
        id: 'storey-1' as StoreyId,
        name: 'Only Floor',
        level: createStoreyLevel(0),
        height: createLength(3000),
        slabConstructionConfigId: DEFAULT_SLAB_CONFIG_ID
      }

      const newStorey = {
        id: 'storey-2' as StoreyId,
        name: 'Only Floor Copy',
        level: createStoreyLevel(1),
        height: createLength(3000),
        slabConstructionConfigId: DEFAULT_SLAB_CONFIG_ID
      }

      mockActions.getStoreyById.mockReturnValue(sourceStorey)
      mockActions.getStoreysOrderedByLevel.mockReturnValue([sourceStorey])
      mockActions.addStorey.mockReturnValue(newStorey)
      mockActions.getPerimetersByStorey.mockReturnValue([])

      const result = service.duplicateStorey('storey-1' as StoreyId)

      expect(mockActions.addStorey).toHaveBeenCalledWith('Only Floor Copy', createLength(3000), DEFAULT_SLAB_CONFIG_ID)
      expect(result).toEqual(newStorey)
    })

    it('should duplicate perimeters from source storey', () => {
      const sourceStorey = {
        id: 'storey-1' as StoreyId,
        name: 'Ground Floor',
        level: createStoreyLevel(0),
        height: createLength(3000),
        slabConstructionConfigId: DEFAULT_SLAB_CONFIG_ID
      }

      const newStorey = {
        id: 'storey-2' as StoreyId,
        name: 'Ground Floor Copy',
        level: createStoreyLevel(1),
        height: createLength(3000),
        slabConstructionConfigId: DEFAULT_SLAB_CONFIG_ID
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

      mockActions.getStoreyById.mockReturnValue(sourceStorey)
      mockActions.getStoreysOrderedByLevel.mockReturnValue([sourceStorey])
      mockActions.addStorey.mockReturnValue(newStorey)
      mockActions.getPerimetersByStorey.mockReturnValue([sourcePerimeter])

      service.duplicateStorey('storey-1' as StoreyId)

      expect(mockActions.addPerimeter).toHaveBeenCalledWith(
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

      mockActions.getPerimetersByStorey.mockReturnValue(perimeters)

      service.deleteStorey('storey-1' as StoreyId)

      expect(mockActions.removePerimeter).toHaveBeenCalledWith('perimeter-1')
      expect(mockActions.removePerimeter).toHaveBeenCalledWith('perimeter-2')
      expect(mockActions.removeStorey).toHaveBeenCalledWith('storey-1')
      // Note: compactStoreyLevels no longer exists - level consistency is handled automatically
    })
  })
})
