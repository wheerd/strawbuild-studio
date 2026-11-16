import { describe, expect, it, vi } from 'vitest'

import type { Perimeter, PerimeterWallAssemblyId } from '@/building/model'
import { createConstraintsSlice } from '@/building/store/slices/constraintsSlice'
import { createIntermediateWallsSlice } from '@/building/store/slices/intermediateWallsSlice'
import { createPerimetersSlice } from '@/building/store/slices/perimeterSlice'
import { createWallEntitiesSlice } from '@/building/store/slices/wallEntitiesSlice'
import type { Store } from '@/building/store/types'
import { DEFAULT_INTERIOR_WALL_ASSEMBLY_ID } from '@/config/store/slices/interiorWalls.defaults'
import { newVec2 } from '@/shared/geometry'

import {
  createRectangularBoundary,
  createTriangularBoundary,
  expectConsistentIntermediateWallReferences,
  expectNoOrphanedIntermediateEntities
} from './__tests__/testHelpers'
import { cleanUpOrphaned } from './cleanup'

function setupMockStore() {
  const mockSet = vi.fn()
  const mockGet = vi.fn()
  const mockStore = {} as any

  const perimeterSlice = createPerimetersSlice(mockSet, mockGet, mockStore)
  const intermediateWallsSlice = createIntermediateWallsSlice(mockSet, mockGet, mockStore)
  const wallEntitiesSlice = createWallEntitiesSlice(mockSet, mockGet, mockStore)
  const constraintsSlice = createConstraintsSlice(mockSet, mockGet, mockStore)

  const store = {
    ...perimeterSlice,
    ...intermediateWallsSlice,
    ...wallEntitiesSlice,
    ...constraintsSlice,
    timestamps: {},
    actions: {
      ...perimeterSlice.actions,
      ...intermediateWallsSlice.actions,
      ...wallEntitiesSlice.actions,
      ...constraintsSlice.actions
    }
  } as any as Store

  mockGet.mockImplementation(() => store)

  mockSet.mockImplementation((updater: any) => {
    if (typeof updater === 'function') {
      updater(store)
    }
  })

  return store
}

describe('cleanUpOrphaned', () => {
  let store: Store
  let perimeter: Perimeter
  let otherPerimeter: Perimeter

  beforeEach(() => {
    store = setupMockStore()

    perimeter = store.actions.addPerimeter(
      'storey_1',
      createRectangularBoundary(),
      'wa_test' as PerimeterWallAssemblyId,
      300
    )
    otherPerimeter = store.actions.addPerimeter(
      'storey_1',
      createTriangularBoundary(),
      'wa_test' as PerimeterWallAssemblyId,
      300
    )
    const node1 = store.actions.addInnerWallNode(perimeter.id, newVec2(3000, 0))
    const node2 = store.actions.addPerimeterWallNode(perimeter.id, perimeter.wallIds[0], 100)

    store.actions.addIntermediateWall(
      perimeter.id,
      { axis: 'left', nodeId: node1.id },
      { axis: 'left', nodeId: node2.id },
      300,
      DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
    )
  })

  describe('perimeter wall cleanup', () => {
    it('should remove perimeter wall when its perimeter is deleted', () => {
      delete store.perimeters[perimeter.id]
      cleanUpOrphaned(store)

      for (const wid of perimeter.wallIds) {
        expect(store.perimeterWalls[wid]).toBeUndefined()
      }
    })

    it('should remove perimeter wall when removed from perimeter.wallIds', () => {
      const removedWallIds = [perimeter.wallIds[1], perimeter.wallIds[3]]
      store.perimeters[perimeter.id].wallIds = [perimeter.wallIds[0], perimeter.wallIds[2]]
      cleanUpOrphaned(store)

      for (const wid of removedWallIds) {
        expect(store.perimeterWalls[wid]).toBeUndefined()
        expect(store._perimeterWallGeometry[wid]).toBeUndefined()
      }
    })
  })

  describe('corner cleanup', () => {
    it('should remove orphaned corners when perimeter is deleted', () => {
      delete store.perimeters[perimeter.id]
      cleanUpOrphaned(store)

      for (const cid of perimeter.cornerIds) {
        expect(store.perimeterCorners[cid]).toBeUndefined()
        expect(store._perimeterCornerGeometry[cid]).toBeUndefined()
      }
    })
  })

  describe('intermediate wall cleanup', () => {
    it('should remove entities attached to an intermediate wall when the perimeter is deleted', () => {
      const nodeA = store.actions.addInnerWallNode(perimeter.id, newVec2(2000, 2500))
      const nodeB = store.actions.addInnerWallNode(perimeter.id, newVec2(8000, 2500))
      const wall = store.actions.addIntermediateWall(
        perimeter.id,
        { axis: 'left', nodeId: nodeA.id },
        { axis: 'left', nodeId: nodeB.id },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )
      const opening = store.actions.addWallOpening(wall.id, {
        openingType: 'door',
        centerOffsetFromWallStart: 2000,
        width: 900,
        height: 2100
      })
      const post = store.actions.addWallPost(wall.id, {
        postType: 'center',
        centerOffsetFromWallStart: 4000,
        width: 100,
        thickness: 100,
        replacesPosts: true,
        material: 'postMaterial' as any,
        infillMaterial: 'infillMaterial' as any
      })

      delete store.perimeters[perimeter.id]
      cleanUpOrphaned(store)

      expect(store.openings[opening.id]).toBeUndefined()
      expect(store.wallPosts[post.id]).toBeUndefined()
      expect(store._openingGeometry[opening.id]).toBeUndefined()
      expect(store._wallPostGeometry[post.id]).toBeUndefined()
    })

    it('should cascade delete intermediate walls when perimeter is deleted', () => {
      const wn1 = store.actions.addInnerWallNode(perimeter.id, newVec2(0, 0)).id
      const wn2 = store.actions.addInnerWallNode(perimeter.id, newVec2(0, 1000)).id
      const iw1 = store.actions.addIntermediateWall(
        perimeter.id,
        { axis: 'left', nodeId: wn1 },
        { axis: 'left', nodeId: wn2 },
        10,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      ).id

      delete store.perimeters[perimeter.id]
      cleanUpOrphaned(store)

      expect(store.intermediateWalls[iw1]).toBeUndefined()
      expect(store._intermediateWallGeometry[iw1]).toBeUndefined()
      expect(store.wallNodes[wn1]).toBeUndefined()
      expect(store.wallNodes[wn2]).toBeUndefined()
      expect(store._wallNodeGeometry[wn1]).toBeUndefined()
      expect(store._wallNodeGeometry[wn2]).toBeUndefined()
    })

    it('should not affect intermediate walls on other perimeters when one is deleted', () => {
      const wn1 = store.actions.addInnerWallNode(perimeter.id, newVec2(2000, 0)).id
      const wn2 = store.actions.addInnerWallNode(perimeter.id, newVec2(8000, 0)).id
      const iw1 = store.actions.addIntermediateWall(
        perimeter.id,
        { axis: 'left', nodeId: wn1 },
        { axis: 'left', nodeId: wn2 },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      ).id

      const ow1 = store.actions.addInnerWallNode(otherPerimeter.id, newVec2(500, 500)).id
      const ow2 = store.actions.addInnerWallNode(otherPerimeter.id, newVec2(1000, 1000)).id
      const oiw1 = store.actions.addIntermediateWall(
        otherPerimeter.id,
        { axis: 'left', nodeId: ow1 },
        { axis: 'left', nodeId: ow2 },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      ).id

      delete store.perimeters[perimeter.id]
      cleanUpOrphaned(store)

      expect(store.intermediateWalls[iw1]).toBeUndefined()
      expect(store.intermediateWalls[oiw1]).toBeDefined()
      expect(store.wallNodes[ow1]).toBeDefined()
      expect(store.wallNodes[ow2]).toBeDefined()
      expectNoOrphanedIntermediateEntities(store)
    })

    it('should delete intermediate wall when its start node is deleted', () => {
      const wn1 = store.actions.addInnerWallNode(perimeter.id, newVec2(2000, 0)).id
      const wn2 = store.actions.addInnerWallNode(perimeter.id, newVec2(8000, 0)).id
      const iw1 = store.actions.addIntermediateWall(
        perimeter.id,
        { axis: 'left', nodeId: wn1 },
        { axis: 'left', nodeId: wn2 },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      ).id

      delete store.wallNodes[wn1]
      delete store._wallNodeGeometry[wn1]
      cleanUpOrphaned(store)

      expect(store.intermediateWalls[iw1]).toBeUndefined()
      expect(store._intermediateWallGeometry[iw1]).toBeUndefined()
      expectNoOrphanedIntermediateEntities(store)
    })
  })

  describe('wall node cleanup', () => {
    it('should remove orphaned inner wall nodes when their intermediate wall is deleted', () => {
      const wn1 = store.actions.addInnerWallNode(perimeter.id, newVec2(2000, 0)).id
      const wn2 = store.actions.addInnerWallNode(perimeter.id, newVec2(8000, 0)).id
      const iw1 = store.actions.addIntermediateWall(
        perimeter.id,
        { axis: 'left', nodeId: wn1 },
        { axis: 'left', nodeId: wn2 },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      ).id

      const wallNodeCountBefore = Object.keys(store.wallNodes).length
      delete store.intermediateWalls[iw1]
      delete store._intermediateWallGeometry[iw1]
      cleanUpOrphaned(store)

      expect(store.wallNodes[wn1]).toBeUndefined()
      expect(store.wallNodes[wn2]).toBeUndefined()
      expect(Object.keys(store.wallNodes).length).toBeLessThan(wallNodeCountBefore)
      expectNoOrphanedIntermediateEntities(store)
    })

    it('should remove perimeter-wall node when its perimeter wall is deleted', () => {
      const wn1 = store.actions.addPerimeterWallNode(perimeter.id, perimeter.wallIds[0], 3000).id
      const wn2 = store.actions.addInnerWallNode(perimeter.id, newVec2(3000, 0)).id
      const iw1 = store.actions.addIntermediateWall(
        perimeter.id,
        { axis: 'left', nodeId: wn1 },
        { axis: 'left', nodeId: wn2 },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      ).id
      const wid = perimeter.wallIds[0]

      delete store.perimeterWalls[wid]
      delete store._perimeterWallGeometry[wid]
      cleanUpOrphaned(store)

      expect(store.wallNodes[wn1]).toBeUndefined()
      expect(store.wallNodes[wn2]).toBeUndefined()
      expect(store.intermediateWalls[iw1]).toBeUndefined()
      expectNoOrphanedIntermediateEntities(store)
    })

    it('should keep shared nodes when one of their walls is deleted', () => {
      const wn1 = store.actions.addInnerWallNode(perimeter.id, newVec2(2000, 0)).id
      const wn2 = store.actions.addInnerWallNode(perimeter.id, newVec2(5000, 0)).id
      const wn3 = store.actions.addInnerWallNode(perimeter.id, newVec2(8000, 0)).id
      const iw1 = store.actions.addIntermediateWall(
        perimeter.id,
        { axis: 'left', nodeId: wn1 },
        { axis: 'left', nodeId: wn2 },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      ).id
      const iw2 = store.actions.addIntermediateWall(
        perimeter.id,
        { axis: 'left', nodeId: wn2 },
        { axis: 'left', nodeId: wn3 },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      ).id

      delete store.intermediateWalls[iw2]
      delete store._intermediateWallGeometry[iw2]
      cleanUpOrphaned(store)

      expect(store.wallNodes[wn1]).toBeDefined()
      expect(store.wallNodes[wn2]).toBeDefined()
      expect(store.wallNodes[wn2].connectedWallIds).toEqual([iw1])
      expect(store.wallNodes[wn3]).toBeUndefined()
      expect(store.intermediateWalls[iw1]).toBeDefined()
      expectNoOrphanedIntermediateEntities(store)
    })

    it('should cascade: deleting a shared node cascades to connected walls, then to their other nodes', () => {
      const wn1 = store.actions.addInnerWallNode(perimeter.id, newVec2(2000, 0)).id
      const wn2 = store.actions.addInnerWallNode(perimeter.id, newVec2(5000, 0)).id
      const wn3 = store.actions.addInnerWallNode(perimeter.id, newVec2(8000, 0)).id
      const iw1 = store.actions.addIntermediateWall(
        perimeter.id,
        { axis: 'left', nodeId: wn1 },
        { axis: 'left', nodeId: wn2 },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      ).id
      const iw2 = store.actions.addIntermediateWall(
        perimeter.id,
        { axis: 'left', nodeId: wn2 },
        { axis: 'left', nodeId: wn3 },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      ).id

      delete store.wallNodes[wn2]
      delete store._wallNodeGeometry[wn2]
      cleanUpOrphaned(store)

      expect(store.wallNodes[wn1]).toBeUndefined()
      expect(store.wallNodes[wn2]).toBeUndefined()
      expect(store.wallNodes[wn3]).toBeUndefined()
      expect(store.intermediateWalls[iw1]).toBeUndefined()
      expect(store.intermediateWalls[iw2]).toBeUndefined()
      expectNoOrphanedIntermediateEntities(store)
    })
  })

  describe('perimeter reference cleanup', () => {
    it('should update perimeter.wallNodeIds to only include valid nodes', () => {
      const wn1 = store.actions.addInnerWallNode(perimeter.id, newVec2(2000, 0)).id
      const wn2 = store.actions.addInnerWallNode(perimeter.id, newVec2(8000, 0)).id
      const iw1 = store.actions.addIntermediateWall(
        perimeter.id,
        { axis: 'left', nodeId: wn1 },
        { axis: 'left', nodeId: wn2 },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      ).id

      const p = store.perimeters[perimeter.id]
      expect(p.wallNodeIds).toContain(wn1)
      expect(p.wallNodeIds).toContain(wn2)

      delete store.intermediateWalls[iw1]
      delete store._intermediateWallGeometry[iw1]
      cleanUpOrphaned(store)

      const pAfter = store.perimeters[perimeter.id]
      expect(pAfter.wallNodeIds).not.toContain(wn1)
      expect(pAfter.wallNodeIds).not.toContain(wn2)
      expectNoOrphanedIntermediateEntities(store)
    })

    it('should update perimeter.intermediateWallIds to only include valid walls', () => {
      const wn1 = store.actions.addInnerWallNode(perimeter.id, newVec2(2000, 0)).id
      const wn2 = store.actions.addInnerWallNode(perimeter.id, newVec2(5000, 0)).id
      const wn3 = store.actions.addInnerWallNode(perimeter.id, newVec2(8000, 0)).id
      const iw1 = store.actions.addIntermediateWall(
        perimeter.id,
        { axis: 'left', nodeId: wn1 },
        { axis: 'left', nodeId: wn2 },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      ).id
      const iw2 = store.actions.addIntermediateWall(
        perimeter.id,
        { axis: 'left', nodeId: wn2 },
        { axis: 'left', nodeId: wn3 },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      ).id

      const p = store.perimeters[perimeter.id]
      expect(p.intermediateWallIds).toContain(iw1)
      expect(p.intermediateWallIds).toContain(iw2)

      delete store.intermediateWalls[iw1]
      delete store._intermediateWallGeometry[iw1]
      cleanUpOrphaned(store)

      const pAfter = store.perimeters[perimeter.id]
      expect(pAfter.intermediateWallIds).not.toContain(iw1)
      expect(pAfter.intermediateWallIds).toContain(iw2)
      expectNoOrphanedIntermediateEntities(store)
    })

    it('should update perimeter.wallIds to only include valid walls', () => {
      const wid = perimeter.wallIds[1]
      const p = store.perimeters[perimeter.id]
      expect(p.wallIds).toContain(wid)

      delete store.perimeterWalls[wid]
      delete store._perimeterWallGeometry[wid]
      cleanUpOrphaned(store)

      const pAfter = store.perimeters[perimeter.id]
      expect(pAfter.wallIds).not.toContain(wid)
      expect(pAfter.wallIds).toHaveLength(3)
    })
  })

  describe('perimeter wall wallNodeIds cleanup', () => {
    it('should remove deleted node IDs from PerimeterWall.wallNodeIds', () => {
      const node = store.actions.addPerimeterWallNode(perimeter.id, perimeter.wallIds[0], 3000)
      const wid = perimeter.wallIds[0]
      expect(store.perimeterWalls[wid].wallNodeIds).toContain(node.id)

      delete store.wallNodes[node.id]
      delete store._wallNodeGeometry[node.id]
      cleanUpOrphaned(store)

      expect(store.perimeterWalls[wid].wallNodeIds).not.toContain(node.id)
    })
  })

  describe('geometry cleanup', () => {
    it('should remove orphaned geometry for intermediate walls and nodes', () => {
      const wn1 = store.actions.addInnerWallNode(perimeter.id, newVec2(2000, 0)).id
      const wn2 = store.actions.addInnerWallNode(perimeter.id, newVec2(8000, 0)).id
      const iw1 = store.actions.addIntermediateWall(
        perimeter.id,
        { axis: 'left', nodeId: wn1 },
        { axis: 'left', nodeId: wn2 },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      ).id

      delete store.intermediateWalls[iw1]
      delete store._intermediateWallGeometry[iw1]
      cleanUpOrphaned(store)

      expect(store._wallNodeGeometry[wn1]).toBeUndefined()
      expect(store._wallNodeGeometry[wn2]).toBeUndefined()
      expectNoOrphanedIntermediateEntities(store)
    })
  })

  describe('edge cases', () => {
    it('should handle empty state without errors', () => {
      for (const pid of Object.keys(store.perimeters)) {
        delete store.perimeters[pid as any]
      }
      cleanUpOrphaned(store)

      expect(Object.keys(store.perimeterWalls)).toHaveLength(0)
      expect(Object.keys(store.perimeterCorners)).toHaveLength(0)
    })

    it('should handle full perimeter deletion with perimeter-wall nodes', () => {
      const wn1 = store.actions.addPerimeterWallNode(perimeter.id, perimeter.wallIds[0], 3000).id
      const wn2 = store.actions.addInnerWallNode(perimeter.id, newVec2(3000, 0)).id
      store.actions.addIntermediateWall(
        perimeter.id,
        { axis: 'left', nodeId: wn1 },
        { axis: 'left', nodeId: wn2 },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )

      delete store.perimeters[perimeter.id]
      cleanUpOrphaned(store)

      expect(Object.keys(store.intermediateWalls)).toHaveLength(0)
      expect(Object.keys(store.wallNodes)).toHaveLength(0)
      expect(Object.keys(store._intermediateWallGeometry)).toHaveLength(0)
      expect(Object.keys(store._wallNodeGeometry)).toHaveLength(0)
    })
  })

  describe('reference integrity', () => {
    it('should maintain consistent references after perimeter deletion', () => {
      const wn1 = store.actions.addInnerWallNode(perimeter.id, newVec2(2000, 0)).id
      const wn2 = store.actions.addInnerWallNode(perimeter.id, newVec2(8000, 0)).id
      store.actions.addIntermediateWall(
        perimeter.id,
        { axis: 'left', nodeId: wn1 },
        { axis: 'left', nodeId: wn2 },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )

      delete store.perimeters[perimeter.id]
      cleanUpOrphaned(store)

      expectNoOrphanedIntermediateEntities(store)
    })

    it('should maintain consistent references after wall node deletion', () => {
      const wn1 = store.actions.addInnerWallNode(perimeter.id, newVec2(2000, 0)).id
      const wn2 = store.actions.addInnerWallNode(perimeter.id, newVec2(5000, 0)).id
      const wn3 = store.actions.addInnerWallNode(perimeter.id, newVec2(8000, 0)).id
      store.actions.addIntermediateWall(
        perimeter.id,
        { axis: 'left', nodeId: wn1 },
        { axis: 'left', nodeId: wn2 },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )
      const iw2 = store.actions.addIntermediateWall(
        perimeter.id,
        { axis: 'left', nodeId: wn2 },
        { axis: 'left', nodeId: wn3 },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      ).id

      delete store.intermediateWalls[iw2]
      delete store._intermediateWallGeometry[iw2]
      cleanUpOrphaned(store)

      expectConsistentIntermediateWallReferences(store, perimeter.id)
      expectNoOrphanedIntermediateEntities(store)
    })
  })
})
