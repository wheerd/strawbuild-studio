import { describe, expect, it } from 'vitest'

import type { InnerWallNode } from '@/building/model'
import { InvalidOperationError, NotFoundError } from '@/building/store/errors'
import { DEFAULT_INTERIOR_WALL_ASSEMBLY_ID } from '@/config/store/slices/interiorWalls.defaults'
import { distanceToInfiniteLine, lineFromSegment, newVec2, scaleAddVec2 } from '@/shared/geometry'

import {
  expectConsistentIntermediateWallReferences,
  expectNoOrphanedIntermediateEntities,
  mockPost,
  setupIntermediateWallsSlice
} from './__tests__/testHelpers'

describe('intermediateWallsSlice', () => {
  describe('applyGcsWallNodePositions', () => {
    it('applies inner-node positions and recomputes geometry in one update', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const node = state.actions.addInnerWallNode(perimeterData.perimeterId, newVec2(3000, 2500))

      state.actions.applyGcsWallNodePositions(perimeterData.perimeterId, {
        [node.id]: newVec2(3500, 2800)
      })

      expect(state.wallNodes[node.id]).toMatchObject({ position: newVec2(3500, 2800) })
      expect(state._wallNodeGeometry[node.id]).toBeDefined()
    })

    it('converts perimeter-node positions back to wall offsets', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const node = state.actions.addPerimeterWallNode(perimeterData.perimeterId, perimeterData.wallIds[0], 1000)
      const wallGeometry = state._perimeterWallGeometry[node.wallId]
      const solvedPosition = scaleAddVec2(wallGeometry.insideLine.start, wallGeometry.direction, 1800)

      state.actions.applyGcsWallNodePositions(perimeterData.perimeterId, {
        [node.id]: solvedPosition
      })

      expect(state.wallNodes[node.id]).toMatchObject({ offsetFromCornerStart: 1800 })
    })

    it('rejects nodes from another perimeter', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const node = state.actions.addInnerWallNode(perimeterData.perimeterId, newVec2(3000, 2500))

      expect(() => {
        state.actions.applyGcsWallNodePositions('perimeter_other' as any, {
          [node.id]: newVec2(3500, 2800)
        })
      }).toThrow(NotFoundError)
    })
  })

  describe('addInnerWallNode', () => {
    it('should create an inner wall node and return geometry', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const result = state.actions.addInnerWallNode(perimeterId, newVec2(3000, 2500))

      expect(result.type).toBe('inner')
      expect(result.position[0]).toBeCloseTo(3000, 0)
      expect(result.position[1]).toBeCloseTo(2500, 0)
      expect(result.perimeterId).toBe(perimeterId)
      expect(result.center).toBeDefined()
      expect(state.wallNodes[result.id]).toBeDefined()
      expect(state._wallNodeGeometry[result.id]).toBeDefined()
      expect(state.perimeters[perimeterId].wallNodeIds).toContain(result.id)
    })

    it('should throw NotFoundError for non-existent perimeter', () => {
      const { state } = setupIntermediateWallsSlice()

      expect(() => state.actions.addInnerWallNode('perimeter_nonexistent' as any, newVec2(0, 0))).toThrow(NotFoundError)
    })
  })

  describe('addPerimeterWallNode', () => {
    it('should create a perimeter wall node with correct offset', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId, wallIds } = perimeterData

      const result = state.actions.addPerimeterWallNode(perimeterId, wallIds[0], 3000)

      expect(result.type).toBe('perimeter')
      expect(result.wallId).toBe(wallIds[0])
      expect(result.offsetFromCornerStart).toBe(3000)
      expect(result.perimeterId).toBe(perimeterId)
      expect(state.wallNodes[result.id]).toBeDefined()
      expect(state._wallNodeGeometry[result.id]).toBeDefined()
      expect(state.perimeters[perimeterId].wallNodeIds).toContain(result.id)
    })

    it('should throw NotFoundError for non-existent perimeter', () => {
      const { state } = setupIntermediateWallsSlice()

      expect(() =>
        state.actions.addPerimeterWallNode('perimeter_nonexistent' as any, 'outwall_test' as any, 1000)
      ).toThrow(NotFoundError)
    })

    it('should throw NotFoundError for non-existent perimeter wall', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()

      expect(() =>
        state.actions.addPerimeterWallNode(perimeterData.perimeterId, 'outwall_nonexistent' as any, 1000)
      ).toThrow(NotFoundError)
    })
  })

  describe('addIntermediateWall', () => {
    it('should create a wall and update node connections', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeA = state.actions.addInnerWallNode(perimeterId, newVec2(2000, 2500))
      const nodeB = state.actions.addInnerWallNode(perimeterId, newVec2(8000, 2500))

      const wall = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'left' },
        { nodeId: nodeB.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )

      expect(wall.perimeterId).toBe(perimeterId)
      expect(wall.thickness).toBe(120)
      expect(wall.start.nodeId).toBe(nodeA.id)
      expect(wall.end.nodeId).toBe(nodeB.id)
      expect(wall.wallLength).toBeGreaterThan(0)
      expect(wall.boundary.points).toHaveLength(4)

      expect(state.intermediateWalls[wall.id]).toBeDefined()
      expect(state._intermediateWallGeometry[wall.id]).toBeDefined()
      expect(state.perimeters[perimeterId].intermediateWallIds).toContain(wall.id)
      expect(state.wallNodes[nodeA.id].connectedWallIds).toContain(wall.id)
      expect(state.wallNodes[nodeB.id].connectedWallIds).toContain(wall.id)

      expectConsistentIntermediateWallReferences(state, perimeterId)
    })

    it('should throw NotFoundError for non-existent perimeter', () => {
      const { state } = setupIntermediateWallsSlice()

      const nodeId = 'wallnode_test' as any
      expect(() =>
        state.actions.addIntermediateWall(
          'perimeter_nonexistent' as any,
          { nodeId, axis: 'left' },
          { nodeId, axis: 'left' },
          120,
          DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
        )
      ).toThrow(NotFoundError)
    })

    it('should throw NotFoundError for non-existent node', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()

      const nodeA = state.actions.addInnerWallNode(perimeterData.perimeterId, newVec2(2000, 2500))

      expect(() =>
        state.actions.addIntermediateWall(
          perimeterData.perimeterId,
          { nodeId: nodeA.id, axis: 'left' },
          { nodeId: 'wallnode_nonexistent' as any, axis: 'left' },
          120,
          DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
        )
      ).toThrow(NotFoundError)
    })

    it('should throw for thickness <= 0', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeA = state.actions.addInnerWallNode(perimeterId, newVec2(2000, 2500))
      const nodeB = state.actions.addInnerWallNode(perimeterId, newVec2(8000, 2500))

      expect(() =>
        state.actions.addIntermediateWall(
          perimeterId,
          { nodeId: nodeA.id, axis: 'left' },
          { nodeId: nodeB.id, axis: 'left' },
          0,
          DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
        )
      ).toThrow('Wall thickness must be greater than 0')

      expect(() =>
        state.actions.addIntermediateWall(
          perimeterId,
          { nodeId: nodeA.id, axis: 'left' },
          { nodeId: nodeB.id, axis: 'left' },
          -50,
          DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
        )
      ).toThrow('Wall thickness must be greater than 0')
    })
  })

  describe('removeIntermediateWall', () => {
    it('should remove wall and clean up orphaned nodes', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeA = state.actions.addInnerWallNode(perimeterId, newVec2(2000, 2500))
      const nodeB = state.actions.addInnerWallNode(perimeterId, newVec2(8000, 2500))
      const wall = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'left' },
        { nodeId: nodeB.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )

      state.actions.removeIntermediateWall(wall.id)

      expect(state.intermediateWalls[wall.id]).toBeUndefined()
      expect(state._intermediateWallGeometry[wall.id]).toBeUndefined()
      expect(state.perimeters[perimeterId].intermediateWallIds).not.toContain(wall.id)
      expect(state.wallNodes[nodeA.id]).toBeUndefined()
      expect(state.wallNodes[nodeB.id]).toBeUndefined()
    })

    it('should remove building constraints that reference the wall', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeA = state.actions.addInnerWallNode(perimeterId, newVec2(2000, 2500))
      const nodeB = state.actions.addInnerWallNode(perimeterId, newVec2(8000, 2500))
      const wall = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'left' },
        { nodeId: nodeB.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )
      const constraintId = state.actions.addBuildingConstraint({
        type: 'wallLength',
        wall: wall.id,
        side: 'left',
        length: 6000
      })

      state.actions.removeIntermediateWall(wall.id)

      expect(state.buildingConstraints[constraintId]).toBeUndefined()
      expect(state._constraintsByEntity[wall.id]).toBeUndefined()
    })

    it('should remove orphaned nodes after wall removal', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeA = state.actions.addInnerWallNode(perimeterId, newVec2(2000, 2500))
      const nodeB = state.actions.addInnerWallNode(perimeterId, newVec2(8000, 2500))
      const wall = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'left' },
        { nodeId: nodeB.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )

      state.actions.removeIntermediateWall(wall.id)

      expect(state.wallNodes[nodeA.id]).toBeUndefined()
      expect(state.wallNodes[nodeB.id]).toBeUndefined()
      expect(state._wallNodeGeometry[nodeA.id]).toBeUndefined()
      expect(state._wallNodeGeometry[nodeB.id]).toBeUndefined()
      expect(state.perimeters[perimeterId].wallNodeIds).not.toContain(nodeA.id)
      expect(state.perimeters[perimeterId].wallNodeIds).not.toContain(nodeB.id)
    })

    it('should only remove orphaned nodes, keeping nodes with other connections', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeA = state.actions.addInnerWallNode(perimeterId, newVec2(2000, 2500))
      const nodeB = state.actions.addInnerWallNode(perimeterId, newVec2(5000, 2500))
      const nodeC = state.actions.addInnerWallNode(perimeterId, newVec2(8000, 2500))

      const wall1 = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'left' },
        { nodeId: nodeB.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )
      const wall2 = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeB.id, axis: 'left' },
        { nodeId: nodeC.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )

      state.actions.removeIntermediateWall(wall2.id)

      expect(state.wallNodes[nodeA.id]).toBeDefined()
      expect(state.wallNodes[nodeB.id]).toBeDefined()
      expect(state.wallNodes[nodeC.id]).toBeUndefined()
      expect(state.wallNodes[nodeB.id].connectedWallIds).toEqual([wall1.id])
    })

    it('should be a no-op for non-existent wall', () => {
      const { state } = setupIntermediateWallsSlice()

      expect(() => {
        state.actions.removeIntermediateWall('intermediate_nonexistent' as any)
      }).not.toThrow()
    })

    it('should recompute geometry for remaining walls', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeA = state.actions.addInnerWallNode(perimeterId, newVec2(2000, 2500))
      const nodeB = state.actions.addInnerWallNode(perimeterId, newVec2(5000, 2500))
      const nodeC = state.actions.addInnerWallNode(perimeterId, newVec2(8000, 2500))

      const wall1 = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'left' },
        { nodeId: nodeB.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )
      const wall2 = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeB.id, axis: 'left' },
        { nodeId: nodeC.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )

      state.actions.removeIntermediateWall(wall2.id)

      const remainingGeo = state._intermediateWallGeometry[wall1.id]
      expect(remainingGeo).toBeDefined()
      expect(remainingGeo.wallLength).toBeCloseTo(3000, 0)
      expectNoOrphanedIntermediateEntities(state)
    })
  })

  describe('updateIntermediateWallThickness', () => {
    it('should update wall thickness and recompute geometry', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeA = state.actions.addInnerWallNode(perimeterId, newVec2(2000, 2500))
      const nodeB = state.actions.addInnerWallNode(perimeterId, newVec2(8000, 2500))
      const wall = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'left' },
        { nodeId: nodeB.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )

      state.actions.updateIntermediateWallThickness(wall.id, 200)

      expect(state.intermediateWalls[wall.id].thickness).toBe(200)
      const geo = state._intermediateWallGeometry[wall.id]
      expect(geo.wallLength).toBeCloseTo(6000, 0)
    })

    it('should throw for non-existent wall', () => {
      const { state } = setupIntermediateWallsSlice()

      expect(() => {
        state.actions.updateIntermediateWallThickness('intermediate_nonexistent' as any, 200)
      }).toThrow(NotFoundError)
    })

    it('should throw for thickness <= 0', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeA = state.actions.addInnerWallNode(perimeterId, newVec2(2000, 2500))
      const nodeB = state.actions.addInnerWallNode(perimeterId, newVec2(8000, 2500))
      const wall = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'left' },
        { nodeId: nodeB.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )

      expect(() => {
        state.actions.updateIntermediateWallThickness(wall.id, 0)
      }).toThrow('Wall thickness must be greater than 0')
    })
  })

  describe('updateIntermediateWallAlignment', () => {
    it('should update wall alignment and recompute geometry', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeA = state.actions.addInnerWallNode(perimeterId, newVec2(2000, 2500))
      const nodeB = state.actions.addInnerWallNode(perimeterId, newVec2(8000, 2500))
      const wall = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'left' },
        { nodeId: nodeB.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )

      state.actions.updateIntermediateWallAlignment(wall.id, 'left', 'right')

      expect(state.intermediateWalls[wall.id].start.axis).toBe('left')
      expect(state.intermediateWalls[wall.id].end.axis).toBe('right')
      expect(state._intermediateWallGeometry[wall.id]).toBeDefined()
    })

    it('should throw for non-existent wall', () => {
      const { state } = setupIntermediateWallsSlice()

      expect(() => {
        state.actions.updateIntermediateWallAlignment('intermediate_nonexistent' as any, 'left', 'right')
      }).toThrow(NotFoundError)
    })

    it('keeps geometry unchanged when the requested alignment is already active', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const nodeA = state.actions.addInnerWallNode(perimeterData.perimeterId, newVec2(2000, 2500))
      const nodeB = state.actions.addInnerWallNode(perimeterData.perimeterId, newVec2(8000, 2500))
      const wall = state.actions.addIntermediateWall(
        perimeterData.perimeterId,
        { nodeId: nodeA.id, axis: 'left' },
        { nodeId: nodeB.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )
      const before = state.actions.getIntermediateWallById(wall.id)

      state.actions.updateIntermediateWallAlignmentPreservingGeometry(wall.id, 'left')

      expect(state.actions.getIntermediateWallById(wall.id).entityReferenceLine).toEqual(before.entityReferenceLine)
    })

    it('updates an alignment when the current geometry can be preserved', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const nodeA = state.actions.addInnerWallNode(perimeterData.perimeterId, newVec2(2000, 2500))
      const nodeB = state.actions.addInnerWallNode(perimeterData.perimeterId, newVec2(8000, 2500))
      const wall = state.actions.addIntermediateWall(
        perimeterData.perimeterId,
        { nodeId: nodeA.id, axis: 'left' },
        { nodeId: nodeB.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )

      state.actions.updateIntermediateWallAlignmentPreservingGeometry(wall.id, 'left')

      expect(state.intermediateWalls[wall.id].start.axis).toBe('left')
      expect(state.intermediateWalls[wall.id].end.axis).toBe('left')
    })
  })

  describe('intermediate wall entities', () => {
    function createWall() {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData
      const nodeA = state.actions.addInnerWallNode(perimeterId, newVec2(2000, 2500))
      const nodeB = state.actions.addInnerWallNode(perimeterId, newVec2(8000, 2500))
      const wall = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'left' },
        { nodeId: nodeB.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )
      return { state, wall }
    }

    it('should support opening CRUD and retrieval by intermediate wall', () => {
      const { state, wall } = createWall()
      const opening = state.actions.addWallOpening(wall.id, {
        openingType: 'window',
        centerOffsetFromWallStart: 2000,
        width: 1200,
        height: 1500,
        sillHeight: 900
      })

      expect(state.intermediateWalls[wall.id].entityIds).toContain(opening.id)
      expect(state.actions.getWallOpeningsByWallId(wall.id)).toEqual([opening])

      state.actions.updateWallOpening(opening.id, { centerOffsetFromWallStart: 2500 })
      expect(state.openings[opening.id].centerOffsetFromWallStart).toBe(2500)

      state.actions.removeWallOpening(opening.id)
      expect(state.openings[opening.id]).toBeUndefined()
      expect(state.intermediateWalls[wall.id].entityIds).not.toContain(opening.id)
      expect(state._openingGeometry[opening.id]).toBeUndefined()
    })

    it('should support post CRUD and reject entities outside the wall', () => {
      const { state, wall } = createWall()
      const post = state.actions.addWallPost(wall.id, mockPost({ centerOffsetFromWallStart: 3000, width: 100 }))

      expect(state.intermediateWalls[wall.id].entityIds).toContain(post.id)
      expect(state.actions.getWallPostsByWallId(wall.id)).toEqual([post])
      expect(state.actions.isWallPostPlacementValid(wall.id, 3000, 100, post.id)).toBe(true)
      expect(state.actions.isWallPostPlacementValid(wall.id, -1, 100)).toBe(false)
      expect(() => state.actions.addWallPost(wall.id, mockPost({ centerOffsetFromWallStart: -1 }))).toThrow()

      state.actions.removeWallPost(post.id)
      expect(state.wallPosts[post.id]).toBeUndefined()
      expect(state.intermediateWalls[wall.id].entityIds).not.toContain(post.id)
      expect(state._wallPostGeometry[post.id]).toBeUndefined()
    })

    it('should reject overlapping openings and posts on intermediate walls', () => {
      const { state, wall } = createWall()
      state.actions.addWallOpening(wall.id, {
        openingType: 'door',
        centerOffsetFromWallStart: 2000,
        width: 900,
        height: 2100
      })

      expect(() =>
        state.actions.addWallOpening(wall.id, {
          openingType: 'window',
          centerOffsetFromWallStart: 2200,
          width: 500,
          height: 1500
        })
      ).toThrow()
      expect(() => state.actions.addWallPost(wall.id, mockPost({ centerOffsetFromWallStart: 2000 }))).toThrow()
    })

    it('should find valid intermediate wall entity positions around existing entities', () => {
      const { state, wall } = createWall()
      state.actions.addWallOpening(wall.id, {
        openingType: 'door',
        centerOffsetFromWallStart: 3000,
        width: 1000,
        height: 2100
      })

      expect(state.actions.findNearestValidWallOpeningPosition(wall.id, 3000, 500)).toBe(2250)
      expect(state.actions.findNearestValidWallOpeningPosition(wall.id, 3000, 500)).not.toBeNull()
    })
  })

  describe('splitIntermediateWallAtPoint', () => {
    it('should split wall at midpoint into two walls', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeA = state.actions.addInnerWallNode(perimeterId, newVec2(2000, 2500))
      const nodeB = state.actions.addInnerWallNode(perimeterId, newVec2(8000, 2500))
      const wall = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'left' },
        { nodeId: nodeB.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )

      const newNodeId = state.actions.splitIntermediateWallAtPoint(wall.id, newVec2(5000, 2500))

      expect(state.intermediateWalls[wall.id]).toBeUndefined()
      expect(state._intermediateWallGeometry[wall.id]).toBeUndefined()

      const remainingWalls = state.perimeters[perimeterId].intermediateWallIds.filter(id => id !== wall.id)
      expect(remainingWalls).toHaveLength(2)

      const wallA = state.intermediateWalls[remainingWalls[0]]
      const wallB = state.intermediateWalls[remainingWalls[1]]
      expect(wallA).toBeDefined()
      expect(wallB).toBeDefined()

      expect(wallA.start.nodeId).toBe(nodeA.id)
      expect(wallA.end.nodeId).toBe(newNodeId)
      expect(wallB.start.nodeId).toBe(newNodeId)
      expect(wallB.end.nodeId).toBe(nodeB.id)

      expect(wallA.thickness).toBe(120)
      expect(wallB.thickness).toBe(120)
      expect(wallA.end.axis).toBe('left')
      expect(wallB.start.axis).toBe('left')

      const splitNode = state.wallNodes[newNodeId]
      expect(splitNode).toBeDefined()
      expect(splitNode.type).toBe('inner')
      expect(splitNode.connectedWallIds).toHaveLength(2)
      expect(splitNode.connectedWallIds).toContain(wallA.id)
      expect(splitNode.connectedWallIds).toContain(wallB.id)

      expectConsistentIntermediateWallReferences(state, perimeterId)
      expectNoOrphanedIntermediateEntities(state)
    })

    it('should preserve wallAssemblyId across split', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeA = state.actions.addInnerWallNode(perimeterId, newVec2(2000, 2500))
      const nodeB = state.actions.addInnerWallNode(perimeterId, newVec2(8000, 2500))
      const wall = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'left' },
        { nodeId: nodeB.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )

      state.intermediateWalls[wall.id].wallAssemblyId = 'iwa_test' as any

      state.actions.splitIntermediateWallAtPoint(wall.id, newVec2(5000, 2500))

      const remainingWalls = state.perimeters[perimeterId].intermediateWallIds.filter(id => id !== wall.id)
      const wallA = state.intermediateWalls[remainingWalls[0]]
      const wallB = state.intermediateWalls[remainingWalls[1]]

      expect(wallA.wallAssemblyId).toBe('iwa_test')
      expect(wallB.wallAssemblyId).toBe('iwa_test')
    })

    it('should split at 1/3 point with correct proportions', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeA = state.actions.addInnerWallNode(perimeterId, newVec2(2000, 2500))
      const nodeB = state.actions.addInnerWallNode(perimeterId, newVec2(8000, 2500))
      const wall = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'left' },
        { nodeId: nodeB.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )

      state.actions.splitIntermediateWallAtPoint(wall.id, newVec2(4000, 2500))

      const remainingWalls = state.perimeters[perimeterId].intermediateWallIds.filter(id => id !== wall.id)
      const geoA = state._intermediateWallGeometry[remainingWalls[0]]
      const geoB = state._intermediateWallGeometry[remainingWalls[1]]

      expect(geoA.wallLength).toBeCloseTo(2000, -1)
      expect(geoB.wallLength).toBeCloseTo(4000, -1)
    })

    it('should partition entities using the requested split position', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData
      const nodeA = state.actions.addInnerWallNode(perimeterId, newVec2(2000, 2500))
      const nodeB = state.actions.addInnerWallNode(perimeterId, newVec2(8000, 2500))
      const wall = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'left' },
        { nodeId: nodeB.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )
      const opening = state.actions.addWallOpening(wall.id, {
        openingType: 'door',
        centerOffsetFromWallStart: 4200,
        width: 800,
        height: 2100
      })

      state.actions.splitIntermediateWallAtPoint(wall.id, newVec2(4000, 2500))

      const newWalls = state.perimeters[perimeterId].intermediateWallIds
      const secondWall = newWalls
        .map(id => state.intermediateWalls[id])
        .find(item => item.entityIds.includes(opening.id))
      expect(secondWall).toBeDefined()
      expect(state.openings[opening.id].wallId).toBe(secondWall?.id)
      expect(state.openings[opening.id].centerOffsetFromWallStart).toBeCloseTo(2200, 3)
      expect(state._openingGeometry[opening.id]).toBeDefined()
    })

    it('should project a trapezoidal wall split onto its fallback left line', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData
      const nodeA = state.actions.addInnerWallNode(perimeterId, newVec2(2000, 2500))
      const nodeB = state.actions.addInnerWallNode(perimeterId, newVec2(8000, 2500))
      const wall = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'left' },
        { nodeId: nodeB.id, axis: 'right' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )
      const originalLength = wall.wallLength
      const originalEntityReferenceLine = state._intermediateWallGeometry[wall.id].entityReferenceLine
      const originalLeftLine = state._intermediateWallGeometry[wall.id].leftLine

      state.actions.splitIntermediateWallAtPoint(wall.id, newVec2(4000, 2600))

      const newWalls = state.perimeters[perimeterId].intermediateWallIds.filter(id => id !== wall.id)
      const firstGeometry = state._intermediateWallGeometry[newWalls[0]]
      const secondGeometry = state._intermediateWallGeometry[newWalls[1]]

      expect(originalLength).toBeGreaterThan(0)
      expect(firstGeometry.wallLength).toBeGreaterThan(0)
      expect(secondGeometry.wallLength).toBeGreaterThan(0)
      const splitNode = Object.values(state.wallNodes).find(
        node => node.connectedWallIds.includes(newWalls[0]) && node.connectedWallIds.includes(newWalls[1])
      ) as InnerWallNode | undefined
      expect(splitNode).toBeDefined()
      expect(splitNode?.position[0]).toBeGreaterThan(originalEntityReferenceLine.start[0])
      expect(splitNode?.position[0]).toBeLessThan(originalEntityReferenceLine.end[0])
      expect(distanceToInfiniteLine(splitNode!.position, lineFromSegment(originalLeftLine))).toBeLessThan(1e-3)
      const firstWall = state.intermediateWalls[newWalls[0]]
      const secondWall = state.intermediateWalls[newWalls[1]]
      expect(firstWall.end.axis).toBe('left')
      expect(secondWall.start.axis).toBe('left')
    })

    it('should reject a split that crosses an entity without mutating state', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData
      const nodeA = state.actions.addInnerWallNode(perimeterId, newVec2(2000, 2500))
      const nodeB = state.actions.addInnerWallNode(perimeterId, newVec2(8000, 2500))
      const wall = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'left' },
        { nodeId: nodeB.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )
      const opening = state.actions.addWallOpening(wall.id, {
        openingType: 'door',
        centerOffsetFromWallStart: 3000,
        width: 1200,
        height: 2100
      })
      const wallIdsBefore = [...state.perimeters[perimeterId].intermediateWallIds]
      const entityBefore = { ...state.openings[opening.id] }

      expect(() => state.actions.splitIntermediateWallAtPoint(wall.id, newVec2(5000, 2500))).toThrow(
        InvalidOperationError
      )
      expect(state.perimeters[perimeterId].intermediateWallIds).toEqual(wallIdsBefore)
      expect(state.intermediateWalls[wall.id]).toBeDefined()
      expect(state.openings[opening.id]).toEqual(entityBefore)
    })

    it('should preserve post offsets and geometry when splitting', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData
      const nodeA = state.actions.addInnerWallNode(perimeterId, newVec2(2000, 2500))
      const nodeB = state.actions.addInnerWallNode(perimeterId, newVec2(8000, 2500))
      const wall = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'left' },
        { nodeId: nodeB.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )
      const post = state.actions.addWallPost(wall.id, mockPost({ centerOffsetFromWallStart: 4200, width: 100 }))

      state.actions.splitIntermediateWallAtPoint(wall.id, newVec2(4000, 2500))

      expect(state.wallPosts[post.id].centerOffsetFromWallStart).toBeCloseTo(2200, 3)
      expect(state._wallPostGeometry[post.id]).toBeDefined()
    })

    it('should throw NotFoundError for non-existent wall', () => {
      const { state } = setupIntermediateWallsSlice()

      expect(() =>
        state.actions.splitIntermediateWallAtPoint('intermediate_nonexistent' as any, newVec2(0, 0))
      ).toThrow(NotFoundError)
    })

    it('should return new node ID and add it to perimeter wallNodeIds', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeA = state.actions.addInnerWallNode(perimeterId, newVec2(2000, 2500))
      const nodeB = state.actions.addInnerWallNode(perimeterId, newVec2(8000, 2500))
      const wall = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'left' },
        { nodeId: nodeB.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )

      const newNodeId = state.actions.splitIntermediateWallAtPoint(wall.id, newVec2(5000, 2500))

      expect(state.perimeters[perimeterId].wallNodeIds).toContain(newNodeId)
    })

    it('should transfer wall constraints and endpoint relationships when splitting', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData
      const nodeA = state.actions.addInnerWallNode(perimeterId, newVec2(2000, 2500))
      const nodeB = state.actions.addInnerWallNode(perimeterId, newVec2(8000, 2500))
      const nodeC = state.actions.addInnerWallNode(perimeterId, newVec2(2000, 4000))
      const wall = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'left' },
        { nodeId: nodeB.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )
      const connectedWall = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeC.id, axis: 'left' },
        { nodeId: nodeA.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )

      state.actions.addBuildingConstraint({ type: 'wallLength', wall: wall.id, side: 'right', length: 6000 })
      state.actions.addBuildingConstraint({ type: 'horizontalWall', wall: wall.id })
      state.actions.addBuildingConstraint({ type: 'parallel', wallA: wall.id, wallB: connectedWall.id })
      state.actions.addBuildingConstraint({
        type: 'wallNodePerpendicular',
        node: nodeA.id,
        wallA: wall.id,
        wallB: connectedWall.id
      })

      const splitNodeId = state.actions.splitIntermediateWallAtPoint(wall.id, newVec2(5000, 2500))
      const splitWalls = state.perimeters[perimeterId].intermediateWallIds
        .map(id => state.intermediateWalls[id])
        .filter(item => item.id !== wall.id)
      const firstWall = splitWalls.find(item => item.start.nodeId === nodeA.id)
      const secondWall = splitWalls.find(item => item.end.nodeId === nodeB.id)

      expect(firstWall).toBeDefined()
      expect(secondWall).toBeDefined()
      expect(state.actions.getConstraintsForEntity(wall.id)).toHaveLength(0)

      const lengthConstraints = state.actions.getAllBuildingConstraints().filter(c => c.type === 'wallLength')
      expect(lengthConstraints).toHaveLength(2)
      expect(lengthConstraints.every(c => c.side === 'right')).toBe(true)
      expect(lengthConstraints.map(c => c.wall)).toEqual(expect.arrayContaining([firstWall!.id, secondWall!.id]))

      const horizontalConstraints = state.actions.getAllBuildingConstraints().filter(c => c.type === 'horizontalWall')
      expect(horizontalConstraints.map(c => c.wall)).toEqual(expect.arrayContaining([firstWall!.id, secondWall!.id]))

      const parallel = state.actions.getAllBuildingConstraints().find(c => c.type === 'parallel')
      expect(parallel).toMatchObject({ wallB: connectedWall.id })
      expect([parallel?.wallA]).toEqual(expect.arrayContaining([firstWall!.id]))

      const endpointConstraint = state.actions.getAllBuildingConstraints().find(c => c.type === 'wallNodePerpendicular')
      expect(endpointConstraint).toMatchObject({ node: nodeA.id, wallA: firstWall!.id, wallB: connectedWall.id })

      const splitConstraint = state.actions
        .getAllBuildingConstraints()
        .find(c => c.type === 'wallNodeColinear' && c.node === splitNodeId)
      expect(splitConstraint).toMatchObject({ wallA: firstWall!.id, wallB: secondWall!.id })
    })
  })

  describe('updateInnerWallNodePosition', () => {
    it('should update position and recompute connected wall geometry', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeA = state.actions.addInnerWallNode(perimeterId, newVec2(2000, 2500))
      const nodeB = state.actions.addInnerWallNode(perimeterId, newVec2(8000, 2500))
      const wall = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'left' },
        { nodeId: nodeB.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )

      state.actions.updateInnerWallNodePosition(nodeA.id, newVec2(3000, 2500))

      expect((state.wallNodes[nodeA.id] as any).position[0]).toBeCloseTo(3000, 0)
      const geo = state._intermediateWallGeometry[wall.id]
      expect(geo.wallLength).toBeCloseTo(5000, 0)
    })

    it('should refresh entity geometry when a connected node moves', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData
      const nodeA = state.actions.addInnerWallNode(perimeterId, newVec2(2000, 2500))
      const nodeB = state.actions.addInnerWallNode(perimeterId, newVec2(8000, 2500))
      const wall = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'left' },
        { nodeId: nodeB.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )
      const post = state.actions.addWallPost(wall.id, mockPost({ centerOffsetFromWallStart: 2000, width: 100 }))
      const oldCenter = [...state._wallPostGeometry[post.id].center]

      state.actions.updateInnerWallNodePosition(nodeA.id, newVec2(3000, 3000))

      expect(state._wallPostGeometry[post.id].center).not.toEqual(oldCenter)
    })

    it('should refresh entity geometry when wall thickness changes', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData
      const nodeA = state.actions.addInnerWallNode(perimeterId, newVec2(2000, 2500))
      const nodeB = state.actions.addInnerWallNode(perimeterId, newVec2(8000, 2500))
      const wall = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'left' },
        { nodeId: nodeB.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )
      const post = state.actions.addWallPost(wall.id, mockPost({ centerOffsetFromWallStart: 2000, width: 100 }))
      const oldPolygon = state._wallPostGeometry[post.id].polygon

      state.actions.updateIntermediateWallThickness(wall.id, 240)

      expect(state._wallPostGeometry[post.id].polygon).not.toEqual(oldPolygon)
    })

    it('should throw for non-existent node', () => {
      const { state } = setupIntermediateWallsSlice()

      expect(() => {
        state.actions.updateInnerWallNodePosition('wallnode_nonexistent' as any, newVec2(0, 0))
      }).toThrow(NotFoundError)
    })

    it('should throw when trying to update a perimeter node', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId, wallIds } = perimeterData

      const node = state.actions.addPerimeterWallNode(perimeterId, wallIds[0], 3000)

      expect(() => {
        state.actions.updateInnerWallNodePosition(node.id, newVec2(0, 0))
      }).toThrow('Cannot update position of perimeter wall node')
    })
  })

  describe('updatePerimeterWallNodeOffset', () => {
    it('should update offset and recompute geometry', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId, wallIds } = perimeterData

      const perimeterNode = state.actions.addPerimeterWallNode(perimeterId, wallIds[0], 3000)
      const innerNode = state.actions.addInnerWallNode(perimeterId, newVec2(3000, 2500))
      const wall = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: perimeterNode.id, axis: 'left' },
        { nodeId: innerNode.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )

      state.actions.updatePerimeterWallNodeOffset(perimeterNode.id, 5000)

      expect((state.wallNodes[perimeterNode.id] as any).offsetFromCornerStart).toBe(5000)
      expect(state._intermediateWallGeometry[wall.id]).toBeDefined()
    })

    it('should throw for non-existent node', () => {
      const { state } = setupIntermediateWallsSlice()

      expect(() => {
        state.actions.updatePerimeterWallNodeOffset('wallnode_nonexistent' as any, 1000)
      }).toThrow(NotFoundError)
    })

    it('should throw when trying to update an inner node', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const node = state.actions.addInnerWallNode(perimeterId, newVec2(3000, 2500))

      expect(() => {
        state.actions.updatePerimeterWallNodeOffset(node.id, 1000)
      }).toThrow('Cannot update offset of inner wall node')
    })
  })

  describe('removeWallNode', () => {
    it('should cascade delete connected walls', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeA = state.actions.addInnerWallNode(perimeterId, newVec2(2000, 2500))
      const nodeB = state.actions.addInnerWallNode(perimeterId, newVec2(5000, 2500))
      const nodeC = state.actions.addInnerWallNode(perimeterId, newVec2(8000, 2500))

      const wall1 = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'left' },
        { nodeId: nodeB.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )
      const wall2 = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeB.id, axis: 'left' },
        { nodeId: nodeC.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )

      state.actions.removeWallNode(nodeB.id)

      expect(state.wallNodes[nodeB.id]).toBeUndefined()
      expect(state.intermediateWalls[wall1.id]).toBeUndefined()
      expect(state.intermediateWalls[wall2.id]).toBeUndefined()
      expect(state.wallNodes[nodeA.id]).toBeUndefined()
      expect(state.wallNodes[nodeC.id]).toBeUndefined()
      expectNoOrphanedIntermediateEntities(state)
    })

    it('should be a no-op for non-existent node', () => {
      const { state } = setupIntermediateWallsSlice()

      expect(() => {
        state.actions.removeWallNode('wallnode_nonexistent' as any)
      }).not.toThrow()
    })
  })

  describe('mergeIntermediateWalls', () => {
    it('should merge colinear walls and translate second-wall entities', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData
      const nodeA = state.actions.addInnerWallNode(perimeterId, newVec2(2000, 2500))
      const nodeB = state.actions.addInnerWallNode(perimeterId, newVec2(5000, 2500))
      const nodeC = state.actions.addInnerWallNode(perimeterId, newVec2(8000, 2500))
      const wallA = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'left' },
        { nodeId: nodeB.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )
      const wallB = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeB.id, axis: 'left' },
        { nodeId: nodeC.id, axis: 'left' },
        180,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )
      const post = state.actions.addWallPost(wallB.id, mockPost({ centerOffsetFromWallStart: 1000, width: 100 }))

      const mergedId = state.actions.mergeIntermediateWalls(nodeB.id)

      expect(mergedId).toBeDefined()
      expect(state.intermediateWalls[mergedId!].thickness).toBe(180)
      expect(state.wallPosts[post.id].wallId).toBe(mergedId)
      expect(state.wallPosts[post.id].centerOffsetFromWallStart).toBeCloseTo(4000, 5)
      expect(state._wallPostGeometry[post.id]).toBeDefined()
      expect(state.intermediateWalls[wallA.id]).toBeUndefined()
      expect(state.intermediateWalls[wallB.id]).toBeUndefined()
      expectConsistentIntermediateWallReferences(state, perimeterId)
    })

    it('should merge walls when the first wall starts and the second wall ends at the merge node', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData
      const nodeA = state.actions.addInnerWallNode(perimeterId, newVec2(2000, 2500))
      const mergeNode = state.actions.addInnerWallNode(perimeterId, newVec2(5000, 2500))
      const nodeC = state.actions.addInnerWallNode(perimeterId, newVec2(8000, 2500))
      const wallA = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: mergeNode.id, axis: 'left' },
        { nodeId: nodeA.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )
      const wallB = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeC.id, axis: 'left' },
        { nodeId: mergeNode.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )
      const postA = state.actions.addWallPost(wallA.id, mockPost({ centerOffsetFromWallStart: 500, width: 100 }))
      const postB = state.actions.addWallPost(wallB.id, mockPost({ centerOffsetFromWallStart: 700, width: 100 }))
      const wallALength = state._intermediateWallGeometry[wallA.id].wallLength
      const wallBLength = state._intermediateWallGeometry[wallB.id].wallLength

      const mergedId = state.actions.mergeIntermediateWalls(mergeNode.id)

      expect(mergedId).toBeDefined()
      expect(state.intermediateWalls[mergedId!].start.nodeId).toBe(nodeA.id)
      expect(state.intermediateWalls[mergedId!].end.nodeId).toBe(nodeC.id)
      expect(state.wallPosts[postA.id].centerOffsetFromWallStart).toBeCloseTo(wallALength - 500, 5)
      expect(state.wallPosts[postB.id].centerOffsetFromWallStart).toBeCloseTo(wallALength + wallBLength - 700, 5)
      expect(state.wallNodes[mergeNode.id]).toBeUndefined()
      expectConsistentIntermediateWallReferences(state, perimeterId)
    })

    it('should merge walls when both walls start at the merge node', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData
      const nodeA = state.actions.addInnerWallNode(perimeterId, newVec2(2000, 2500))
      const mergeNode = state.actions.addInnerWallNode(perimeterId, newVec2(5000, 2500))
      const nodeC = state.actions.addInnerWallNode(perimeterId, newVec2(8000, 2500))
      const wallA = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: mergeNode.id, axis: 'left' },
        { nodeId: nodeA.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )
      const wallB = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: mergeNode.id, axis: 'left' },
        { nodeId: nodeC.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )
      const postA = state.actions.addWallPost(wallA.id, mockPost({ centerOffsetFromWallStart: 500, width: 100 }))
      const postB = state.actions.addWallPost(wallB.id, mockPost({ centerOffsetFromWallStart: 700, width: 100 }))
      const wallALength = state._intermediateWallGeometry[wallA.id].wallLength

      const mergedId = state.actions.mergeIntermediateWalls(mergeNode.id)

      expect(mergedId).toBeDefined()
      expect(state.intermediateWalls[mergedId!].start.nodeId).toBe(nodeA.id)
      expect(state.intermediateWalls[mergedId!].end.nodeId).toBe(nodeC.id)
      expect(state.wallPosts[postA.id].centerOffsetFromWallStart).toBeCloseTo(wallALength - 500, 5)
      expect(state.wallPosts[postB.id].centerOffsetFromWallStart).toBeCloseTo(wallALength + 700, 5)
      expect(state.wallNodes[mergeNode.id]).toBeUndefined()
      expectConsistentIntermediateWallReferences(state, perimeterId)
    })

    it('should merge walls when both walls end at the merge node', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData
      const nodeA = state.actions.addInnerWallNode(perimeterId, newVec2(2000, 2500))
      const mergeNode = state.actions.addInnerWallNode(perimeterId, newVec2(5000, 2500))
      const nodeC = state.actions.addInnerWallNode(perimeterId, newVec2(8000, 2500))
      const wallA = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'left' },
        { nodeId: mergeNode.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )
      const wallB = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeC.id, axis: 'left' },
        { nodeId: mergeNode.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )
      const postA = state.actions.addWallPost(wallA.id, mockPost({ centerOffsetFromWallStart: 500, width: 100 }))
      const postB = state.actions.addWallPost(wallB.id, mockPost({ centerOffsetFromWallStart: 700, width: 100 }))
      const wallALength = state._intermediateWallGeometry[wallA.id].wallLength
      const wallBLength = state._intermediateWallGeometry[wallB.id].wallLength

      const mergedId = state.actions.mergeIntermediateWalls(mergeNode.id)

      expect(mergedId).toBeDefined()
      expect(state.intermediateWalls[mergedId!].start.nodeId).toBe(nodeA.id)
      expect(state.intermediateWalls[mergedId!].end.nodeId).toBe(nodeC.id)
      expect(state.wallPosts[postA.id].centerOffsetFromWallStart).toBeCloseTo(500, 5)
      expect(state.wallPosts[postB.id].centerOffsetFromWallStart).toBeCloseTo(wallALength + wallBLength - 700, 5)
      expect(state.wallNodes[mergeNode.id]).toBeUndefined()
      expectConsistentIntermediateWallReferences(state, perimeterId)
    })

    it('should transfer constraints to the merged wall and remove internal-node relationships', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData
      const nodeA = state.actions.addInnerWallNode(perimeterId, newVec2(2000, 2500))
      const mergeNode = state.actions.addInnerWallNode(perimeterId, newVec2(5000, 2500))
      const nodeC = state.actions.addInnerWallNode(perimeterId, newVec2(8000, 2500))
      const nodeD = state.actions.addInnerWallNode(perimeterId, newVec2(2000, 4000))
      const wallA = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'left' },
        { nodeId: mergeNode.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )
      const wallB = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: mergeNode.id, axis: 'left' },
        { nodeId: nodeC.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )
      const connectedWall = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'left' },
        { nodeId: nodeD.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )

      state.actions.addBuildingConstraint({ type: 'wallLength', wall: wallA.id, side: 'right', length: 3000 })
      state.actions.addBuildingConstraint({ type: 'wallLength', wall: wallB.id, side: 'right', length: 3000 })
      state.actions.addBuildingConstraint({ type: 'horizontalWall', wall: wallA.id })
      state.actions.addBuildingConstraint({ type: 'horizontalWall', wall: wallB.id })
      state.actions.addBuildingConstraint({ type: 'parallel', wallA: wallA.id, wallB: connectedWall.id })
      state.actions.addBuildingConstraint({
        type: 'wallNodePerpendicular',
        node: nodeA.id,
        wallA: wallA.id,
        wallB: connectedWall.id
      })
      state.actions.addBuildingConstraint({
        type: 'wallNodeColinear',
        node: mergeNode.id,
        wallA: wallA.id,
        wallB: wallB.id
      })

      const mergedId = state.actions.mergeIntermediateWalls(mergeNode.id)

      expect(mergedId).not.toBeNull()
      expect(state.actions.getConstraintsForEntity(wallA.id)).toHaveLength(0)
      expect(state.actions.getConstraintsForEntity(wallB.id)).toHaveLength(0)
      expect(state.actions.getConstraintsForEntity(mergeNode.id)).toHaveLength(0)

      const constraints = state.actions.getAllBuildingConstraints()
      expect(constraints.filter(c => c.type === 'wallLength')).toHaveLength(1)
      expect(constraints.filter(c => c.type === 'horizontalWall')).toHaveLength(1)
      expect(constraints.find(c => c.type === 'parallel')).toMatchObject({ wallA: mergedId, wallB: connectedWall.id })
      expect(constraints.find(c => c.type === 'wallNodePerpendicular')).toMatchObject({
        node: nodeA.id,
        wallA: mergedId,
        wallB: connectedWall.id
      })
      expect(constraints.find(c => c.type === 'wallNodeColinear')).toBeUndefined()
    })
  })

  describe('getters', () => {
    it('getIntermediateWallById should return merged model + geometry', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeA = state.actions.addInnerWallNode(perimeterId, newVec2(2000, 2500))
      const nodeB = state.actions.addInnerWallNode(perimeterId, newVec2(8000, 2500))
      const wall = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'left' },
        { nodeId: nodeB.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )

      const result = state.actions.getIntermediateWallById(wall.id)

      expect(result.id).toBe(wall.id)
      expect(result.perimeterId).toBe(perimeterId)
      expect(result.thickness).toBe(120)
      expect(result.wallLength).toBeGreaterThan(0)
      expect(result.boundary.points).toHaveLength(4)
      expect(result.entityReferenceLine).toBeDefined()
    })

    it('getIntermediateWallById should throw for non-existent wall', () => {
      const { state } = setupIntermediateWallsSlice()

      expect(() => state.actions.getIntermediateWallById('intermediate_nonexistent' as any)).toThrow(NotFoundError)
    })

    it('getAllIntermediateWalls should return all walls', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeA = state.actions.addInnerWallNode(perimeterId, newVec2(2000, 2500))
      const nodeB = state.actions.addInnerWallNode(perimeterId, newVec2(5000, 2500))
      const nodeC = state.actions.addInnerWallNode(perimeterId, newVec2(8000, 2500))

      state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'left' },
        { nodeId: nodeB.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )
      state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeB.id, axis: 'left' },
        { nodeId: nodeC.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )

      const allWalls = state.actions.getAllIntermediateWalls()
      expect(allWalls).toHaveLength(2)
      allWalls.forEach(w => {
        expect(w.wallLength).toBeGreaterThan(0)
        expect(w.boundary.points).toBeDefined()
      })
    })

    it('getIntermediateWallsByPerimeter should return filtered walls', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeA = state.actions.addInnerWallNode(perimeterId, newVec2(2000, 2500))
      const nodeB = state.actions.addInnerWallNode(perimeterId, newVec2(8000, 2500))

      state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'left' },
        { nodeId: nodeB.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )

      const walls = state.actions.getIntermediateWallsByPerimeter(perimeterId)
      expect(walls).toHaveLength(1)
    })

    it('getIntermediateWallsByPerimeter should throw for non-existent perimeter', () => {
      const { state } = setupIntermediateWallsSlice()

      expect(() => state.actions.getIntermediateWallsByPerimeter('perimeter_nonexistent' as any)).toThrow(NotFoundError)
    })

    it('getWallNodeById should return merged model + geometry for inner node', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const node = state.actions.addInnerWallNode(perimeterId, newVec2(3000, 2500))

      const result = state.actions.getWallNodeById(node.id)

      expect(result.id).toBe(node.id)
      expect(result.type).toBe('inner')
      expect(result.position[0]).toBeCloseTo(3000, 0)
      expect(result.center).toBeDefined()
    })

    it('getWallNodeById should return merged model + geometry for perimeter node', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId, wallIds } = perimeterData

      const node = state.actions.addPerimeterWallNode(perimeterId, wallIds[0], 3000)

      const result = state.actions.getWallNodeById(node.id)

      expect(result.id).toBe(node.id)
      expect(result.type).toBe('perimeter')
      expect(result.center).toBeDefined()
    })

    it('getWallNodeById should throw for non-existent node', () => {
      const { state } = setupIntermediateWallsSlice()

      expect(() => state.actions.getWallNodeById('wallnode_nonexistent' as any)).toThrow(NotFoundError)
    })

    it('getAllWallNodes should return all nodes', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId, wallIds } = perimeterData

      state.actions.addInnerWallNode(perimeterId, newVec2(3000, 2500))
      state.actions.addPerimeterWallNode(perimeterId, wallIds[0], 5000)

      const nodes = state.actions.getAllWallNodes()
      expect(nodes).toHaveLength(2)
    })

    it('getWallNodesByPerimeter should return filtered nodes', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId, wallIds } = perimeterData

      state.actions.addInnerWallNode(perimeterId, newVec2(3000, 2500))
      state.actions.addPerimeterWallNode(perimeterId, wallIds[0], 5000)

      const nodes = state.actions.getWallNodesByPerimeter(perimeterId)
      expect(nodes).toHaveLength(2)
    })

    it('getWallNodesByPerimeter should throw for non-existent perimeter', () => {
      const { state } = setupIntermediateWallsSlice()

      expect(() => state.actions.getWallNodesByPerimeter('perimeter_nonexistent' as any)).toThrow(NotFoundError)
    })
  })

  describe('reference integrity', () => {
    it('should maintain consistent references after add + remove cycle', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeA = state.actions.addInnerWallNode(perimeterId, newVec2(2000, 2500))
      const nodeB = state.actions.addInnerWallNode(perimeterId, newVec2(8000, 2500))
      const wall = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'left' },
        { nodeId: nodeB.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )

      state.actions.removeIntermediateWall(wall.id)

      expectNoOrphanedIntermediateEntities(state)
    })

    it('should maintain consistent references after split', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeA = state.actions.addInnerWallNode(perimeterId, newVec2(2000, 2500))
      const nodeB = state.actions.addInnerWallNode(perimeterId, newVec2(8000, 2500))
      const wall = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'left' },
        { nodeId: nodeB.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )

      state.actions.splitIntermediateWallAtPoint(wall.id, newVec2(5000, 2500))

      expectConsistentIntermediateWallReferences(state, perimeterId)
      expectNoOrphanedIntermediateEntities(state)
    })

    it('should maintain consistent references after node position update', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeA = state.actions.addInnerWallNode(perimeterId, newVec2(2000, 2500))
      const nodeB = state.actions.addInnerWallNode(perimeterId, newVec2(8000, 2500))
      state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'left' },
        { nodeId: nodeB.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )

      state.actions.updateInnerWallNodePosition(nodeA.id, newVec2(3000, 2500))

      expectConsistentIntermediateWallReferences(state, perimeterId)
      expectNoOrphanedIntermediateEntities(state)
    })
  })

  describe('PerimeterWall.wallNodeIds sync', () => {
    it('should track perimeter wall node IDs on the PerimeterWall', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId, wallIds } = perimeterData

      const node = state.actions.addPerimeterWallNode(perimeterId, wallIds[0], 3000)

      expect(state.perimeterWalls[wallIds[0]].wallNodeIds).toContain(node.id)
      expect(state.perimeterWalls[wallIds[1]].wallNodeIds).not.toContain(node.id)
      expect(state.perimeters[perimeterId].wallNodeIds).toContain(node.id)

      expectConsistentIntermediateWallReferences(state, perimeterId)
      expectNoOrphanedIntermediateEntities(state)
    })

    it('should not track inner wall node IDs on PerimeterWall', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId, wallIds } = perimeterData

      const node = state.actions.addInnerWallNode(perimeterId, newVec2(3000, 2500))

      for (const wallId of wallIds) {
        expect(state.perimeterWalls[wallId].wallNodeIds).not.toContain(node.id)
      }
      expect(state.perimeters[perimeterId].wallNodeIds).toContain(node.id)
    })

    it('should remove node ID from PerimeterWall when node is deleted', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId, wallIds } = perimeterData

      const node = state.actions.addPerimeterWallNode(perimeterId, wallIds[0], 3000)
      expect(state.perimeterWalls[wallIds[0]].wallNodeIds).toContain(node.id)

      state.actions.removeWallNode(node.id)

      expect(state.perimeterWalls[wallIds[0]].wallNodeIds).not.toContain(node.id)
    })

    it('should remove node ID from PerimeterWall when orphaned after wall removal', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId, wallIds } = perimeterData

      const perimNode = state.actions.addPerimeterWallNode(perimeterId, wallIds[0], 3000)
      const innerNode = state.actions.addInnerWallNode(perimeterId, newVec2(3000, 2500))
      state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: perimNode.id, axis: 'left' },
        { nodeId: innerNode.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )

      state.actions.removeIntermediateWall(state.perimeters[perimeterId].intermediateWallIds[0])

      expect(state.perimeterWalls[wallIds[0]].wallNodeIds).not.toContain(perimNode.id)
      expectNoOrphanedIntermediateEntities(state)
    })
  })
})
