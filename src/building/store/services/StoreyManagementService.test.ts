import { type Mocked, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  type PerimeterWallWithGeometry,
  type PerimeterWithGeometry,
  type Storey,
  createStoreyLevel
} from '@/building/model'
import {
  DEFAULT_FLOOR_ASSEMBLY_ID,
  type PerimeterCornerId,
  type PerimeterId,
  type PerimeterWallId,
  type StoreyId
} from '@/building/model/ids'
import type { StoreActions } from '@/building/store/types'
import { newVec2 } from '@/shared/geometry'
import { partial, partialMock } from '@/test/helpers'

import { StoreyManagementService } from './StoreyManagementService'

describe('StoreyManagementService', () => {
  let service: StoreyManagementService
  let mockActions: Mocked<StoreActions>

  beforeEach(() => {
    mockActions = partialMock<StoreActions>({
      addStorey: vi.fn(),
      removeStorey: vi.fn(),
      swapStoreyLevels: vi.fn(),
      adjustAllLevels: vi.fn(),
      getStoreyById: vi.fn(),
      getStoreysOrderedByLevel: vi.fn(),
      getStoreyAbove: vi.fn(),
      addPerimeter: vi.fn(),
      removePerimeter: vi.fn(),
      getPerimetersByStorey: vi.fn(),
      getPerimeterWallById: vi.fn(),
      getFloorAreasByStorey: vi.fn(),
      updatePerimeterWallAssembly: vi.fn(),
      updatePerimeterWallThickness: vi.fn(),
      setWallTopRingBeam: vi.fn(),
      setWallBaseRingBeam: vi.fn(),
      removeFloorArea: vi.fn(),
      getFloorOpeningsByStorey: vi.fn(() => []),
      removeFloorOpening: vi.fn(),
      getRoofsByStorey: vi.fn(),
      removeRoof: vi.fn(),
      getWallOpeningsById: vi.fn(() => []),
      getWallPostsById: vi.fn(() => []),
      addWallOpening: vi.fn(),
      addWallPost: vi.fn(),
      addFloorOpening: vi.fn(),
      getAllBuildingConstraints: vi.fn(() => []),
      getConstraintsForEntity: vi.fn(() => []),
      addBuildingConstraint: vi.fn()
    })
    service = new StoreyManagementService(mockActions)
  })

  describe('moveStoreyUp', () => {
    it('should swap with storey above when not highest', () => {
      const storeys = [
        partial<Storey>({ id: 'storey-1' as StoreyId, name: 'Ground', level: createStoreyLevel(0), floorHeight: 3000 }),
        partial<Storey>({ id: 'storey-2' as StoreyId, name: 'First', level: createStoreyLevel(1), floorHeight: 3000 }),
        partial<Storey>({ id: 'storey-3' as StoreyId, name: 'Second', level: createStoreyLevel(2), floorHeight: 3000 })
      ]

      mockActions.getStoreysOrderedByLevel.mockReturnValue(storeys)
      mockActions.getStoreyAbove.mockImplementation((id: StoreyId) => (id === storeys[1].id ? storeys[2] : null))

      service.moveStoreyUp('storey-2' as StoreyId)

      expect(mockActions.swapStoreyLevels).toHaveBeenCalledWith('storey-2', 'storey-3')
    })

    it('should increase all levels when moving highest storey up', () => {
      const storeys = [
        partial<Storey>({
          id: 'storey-1' as StoreyId,
          name: 'Basement',
          level: createStoreyLevel(-1),
          floorHeight: 3000
        }),
        partial<Storey>({ id: 'storey-2' as StoreyId, name: 'Ground', level: createStoreyLevel(0), floorHeight: 3000 })
      ]

      mockActions.getStoreysOrderedByLevel.mockReturnValue(storeys)
      mockActions.getStoreyAbove.mockReturnValue(null)

      service.moveStoreyUp('storey-2' as StoreyId)

      expect(mockActions.adjustAllLevels).toHaveBeenCalledWith(1)
    })

    it('should throw error when moving highest would make lowest > 0', () => {
      const storeys = [
        partial<Storey>({ id: 'storey-1' as StoreyId, name: 'Ground', level: createStoreyLevel(0), floorHeight: 3000 }),
        partial<Storey>({ id: 'storey-2' as StoreyId, name: 'First', level: createStoreyLevel(1), floorHeight: 3000 })
      ]

      mockActions.getStoreysOrderedByLevel.mockReturnValue(storeys)
      mockActions.getStoreyAbove.mockReturnValue(null)

      expect(() => {
        service.moveStoreyUp('storey-2' as StoreyId)
      }).toThrow('Cannot move floor up: lowest floor would exceed ground level')
    })

    it('should do nothing with single storey', () => {
      const storeys = [
        partial<Storey>({ id: 'storey-1' as StoreyId, name: 'Ground', level: createStoreyLevel(0), floorHeight: 3000 })
      ]

      mockActions.getStoreysOrderedByLevel.mockReturnValue(storeys)
      mockActions.getStoreyAbove.mockReturnValue(null)

      service.moveStoreyUp('storey-1' as StoreyId)

      expect(mockActions.swapStoreyLevels).not.toHaveBeenCalled()
      expect(mockActions.adjustAllLevels).not.toHaveBeenCalled()
    })
  })

  describe('moveStoreyDown', () => {
    it('should swap with storey below when not lowest', () => {
      const storeys = [
        partial<Storey>({ id: 'storey-1' as StoreyId, name: 'Ground', level: createStoreyLevel(0), floorHeight: 3000 }),
        partial<Storey>({ id: 'storey-2' as StoreyId, name: 'First', level: createStoreyLevel(1), floorHeight: 3000 }),
        partial<Storey>({ id: 'storey-3' as StoreyId, name: 'Second', level: createStoreyLevel(2), floorHeight: 3000 })
      ]

      mockActions.getStoreysOrderedByLevel.mockReturnValue(storeys)

      service.moveStoreyDown('storey-2' as StoreyId)

      expect(mockActions.swapStoreyLevels).toHaveBeenCalledWith('storey-2', 'storey-1')
    })

    it('should decrease all levels when moving lowest storey down', () => {
      const storeys = [
        partial<Storey>({ id: 'storey-1' as StoreyId, name: 'Ground', level: createStoreyLevel(0), floorHeight: 3000 }),
        partial<Storey>({ id: 'storey-2' as StoreyId, name: 'First', level: createStoreyLevel(1), floorHeight: 3000 })
      ]

      mockActions.getStoreysOrderedByLevel.mockReturnValue(storeys)

      service.moveStoreyDown('storey-1' as StoreyId)

      expect(mockActions.adjustAllLevels).toHaveBeenCalledWith(-1)
    })

    it('should throw error when moving lowest would make highest < 0', () => {
      const storeys = [
        partial<Storey>({
          id: 'storey-1' as StoreyId,
          name: 'Basement',
          level: createStoreyLevel(-1),
          floorHeight: 3000
        }),
        partial<Storey>({ id: 'storey-2' as StoreyId, name: 'Ground', level: createStoreyLevel(0), floorHeight: 3000 })
      ]

      mockActions.getStoreysOrderedByLevel.mockReturnValue(storeys)

      expect(() => {
        service.moveStoreyDown('storey-1' as StoreyId)
      }).toThrow('Cannot move floor down: highest floor would go below ground level')
    })
  })

  describe('duplicateStorey', () => {
    it('should create a copy with next available level', () => {
      const sourceStorey = partial<Storey>({
        id: 'storey-1' as StoreyId,
        name: 'Ground Floor',
        level: createStoreyLevel(0),
        floorHeight: 3000,
        floorAssemblyId: DEFAULT_FLOOR_ASSEMBLY_ID
      })

      const newStorey = partial<Storey>({
        id: 'storey-2' as StoreyId,
        level: createStoreyLevel(1),
        floorHeight: 3000,
        floorAssemblyId: DEFAULT_FLOOR_ASSEMBLY_ID
      })

      mockActions.getStoreyById.mockReturnValue(sourceStorey)
      mockActions.getStoreysOrderedByLevel.mockReturnValue([
        {} as Storey,
        {} as Storey,
        { level: createStoreyLevel(42) } as Storey
      ]) // Simulate existing storeys
      mockActions.addStorey.mockReturnValue(newStorey)
      mockActions.getPerimetersByStorey.mockReturnValue([])

      const result = service.duplicateStorey('storey-1' as StoreyId)

      expect(mockActions.addStorey).toHaveBeenCalledWith(3000, DEFAULT_FLOOR_ASSEMBLY_ID)
      expect(result).toEqual(newStorey)
    })

    it('should use custom name when provided', () => {
      const sourceStorey = partial<Storey>({
        id: 'storey-1' as StoreyId,
        name: 'Ground Floor',
        level: createStoreyLevel(0),
        floorHeight: 3000,
        floorAssemblyId: DEFAULT_FLOOR_ASSEMBLY_ID
      })

      const newStorey = partial<Storey>({
        id: 'storey-2' as StoreyId,
        name: 'Custom Name',
        level: createStoreyLevel(1),
        floorHeight: 3000,
        floorAssemblyId: DEFAULT_FLOOR_ASSEMBLY_ID
      })

      mockActions.getStoreyById.mockReturnValue(sourceStorey)
      mockActions.getStoreysOrderedByLevel.mockReturnValue([sourceStorey])
      mockActions.addStorey.mockReturnValue(newStorey)
      mockActions.getPerimetersByStorey.mockReturnValue([])

      service.duplicateStorey('storey-1' as StoreyId)

      expect(mockActions.addStorey).toHaveBeenCalledWith(3000, DEFAULT_FLOOR_ASSEMBLY_ID)
    })

    it('should throw error for non-existent storey', () => {
      mockActions.getStoreyById.mockReturnValue(null)

      expect(() => service.duplicateStorey('non-existent' as StoreyId)).toThrow('Source storey not found')
    })

    it('should handle duplication when only one storey exists', () => {
      const sourceStorey = partial<Storey>({
        id: 'storey-1' as StoreyId,
        name: 'Only Floor',
        level: createStoreyLevel(0),
        floorHeight: 3000,
        floorAssemblyId: DEFAULT_FLOOR_ASSEMBLY_ID
      })

      const newStorey = partial<Storey>({
        id: 'storey-2' as StoreyId,
        name: 'Only Floor Copy',
        level: createStoreyLevel(1),
        floorHeight: 3000,
        floorAssemblyId: DEFAULT_FLOOR_ASSEMBLY_ID
      })

      mockActions.getStoreyById.mockReturnValue(sourceStorey)
      mockActions.getStoreysOrderedByLevel.mockReturnValue([sourceStorey])
      mockActions.addStorey.mockReturnValue(newStorey)
      mockActions.getPerimetersByStorey.mockReturnValue([])

      const result = service.duplicateStorey('storey-1' as StoreyId)

      expect(mockActions.addStorey).toHaveBeenCalledWith(3000, DEFAULT_FLOOR_ASSEMBLY_ID)
      expect(result).toEqual(newStorey)
    })

    it('should duplicate perimeters from source storey', () => {
      const sourceStorey = partial<Storey>({
        id: 'storey-1' as StoreyId,
        name: 'Ground Floor',
        level: createStoreyLevel(0),
        floorHeight: 3000,
        floorAssemblyId: DEFAULT_FLOOR_ASSEMBLY_ID
      })

      const newStorey = partial<Storey>({
        id: 'storey-2' as StoreyId,
        name: 'Ground Floor Copy',
        level: createStoreyLevel(1),
        floorHeight: 3000,
        floorAssemblyId: DEFAULT_FLOOR_ASSEMBLY_ID
      })

      const sourceWall = partial<PerimeterWallWithGeometry>({
        id: 'source-wall-id' as PerimeterWallId,
        wallAssemblyId: 'assembly-1' as any,
        thickness: 400,
        baseRingBeamAssemblyId: 'base-assembly' as any,
        topRingBeamAssemblyId: 'top-assembly' as any
      })

      const referencePolygon = {
        points: [newVec2(0, 0), newVec2(10, 0), newVec2(10, 10), newVec2(0, 10)]
      }

      const sourcePerimeter = partial<PerimeterWithGeometry>({
        id: 'perimeter-1' as PerimeterId,
        storeyId: 'storey-1' as StoreyId,
        referenceSide: 'inside' as const,
        innerPolygon: referencePolygon,
        wallIds: [sourceWall.id],
        cornerIds: ['corner-1' as PerimeterCornerId, 'corner-2' as PerimeterCornerId]
      })

      const newPerimeter = partial<PerimeterWithGeometry>({
        id: 'perimeter-1' as PerimeterId,
        storeyId: 'storey-1' as StoreyId,
        referenceSide: 'inside' as const,
        wallIds: ['new-wall-id' as PerimeterWallId],
        cornerIds: ['new-corner-1' as PerimeterCornerId, 'new-corner-2' as PerimeterCornerId]
      })

      mockActions.getStoreyById.mockReturnValue(sourceStorey)
      mockActions.getStoreysOrderedByLevel.mockReturnValue([sourceStorey])
      mockActions.addStorey.mockReturnValue(newStorey)
      mockActions.getPerimetersByStorey.mockReturnValue([sourcePerimeter])
      mockActions.getPerimeterWallById.mockReturnValue(sourceWall)
      mockActions.addPerimeter.mockReturnValue(newPerimeter)

      service.duplicateStorey('storey-1' as StoreyId)

      expect(mockActions.addPerimeter).toHaveBeenCalledWith(
        newStorey.id,
        referencePolygon,
        expect.any(String),
        expect.any(Number),
        undefined,
        undefined,
        sourcePerimeter.referenceSide
      )

      expect(mockActions.updatePerimeterWallAssembly).toHaveBeenCalledWith('new-wall-id', sourceWall.wallAssemblyId)
      expect(mockActions.updatePerimeterWallThickness).toHaveBeenCalledWith('new-wall-id', sourceWall.thickness)
      expect(mockActions.setWallTopRingBeam).toHaveBeenCalledWith('new-wall-id', sourceWall.topRingBeamAssemblyId)
      expect(mockActions.setWallBaseRingBeam).toHaveBeenCalledWith('new-wall-id', sourceWall.baseRingBeamAssemblyId)
    })
  })

  describe('deleteStorey', () => {
    it('should delete storey and associated perimeters, then compact levels', () => {
      const perimeters = [
        { id: 'perimeter-1' as PerimeterId } as PerimeterWithGeometry,
        { id: 'perimeter-2' as PerimeterId } as PerimeterWithGeometry
      ]

      mockActions.getPerimetersByStorey.mockReturnValue(perimeters)
      mockActions.getFloorAreasByStorey.mockReturnValue([])
      mockActions.getFloorOpeningsByStorey.mockReturnValue([])
      mockActions.getRoofsByStorey.mockReturnValue([])

      service.deleteStorey('storey-1' as StoreyId)

      expect(mockActions.removePerimeter).toHaveBeenCalledWith('perimeter-1')
      expect(mockActions.removePerimeter).toHaveBeenCalledWith('perimeter-2')
      expect(mockActions.removeStorey).toHaveBeenCalledWith('storey-1')
      // Note: compactStoreyLevels no longer exists - level consistency is handled automatically
    })
  })
})
