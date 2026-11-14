import { describe, expect, it } from 'vitest'

import type { PerimeterWallNodeGeometry } from '@/building/model'
import { createIntermediateWallId, createWallNodeId } from '@/building/model/ids'
import { computeWallLines, updateAllWallNodeGeometry } from '@/building/store/slices/intermediateWallGeometry'
import { DEFAULT_INTERIOR_WALL_ASSEMBLY_ID } from '@/config/store/slices/interiorWalls.defaults'
import {
  distVec2,
  distanceToInfiniteLine,
  dotVec2,
  lineFromSegment,
  newVec2,
  perpendicularCCW,
  projectPointOntoLine,
  scaleAddVec2,
  subVec2
} from '@/shared/geometry'

import { setupIntermediateWallsSlice } from './__tests__/testHelpers'

describe('intermediateWallGeometry', () => {
  describe('computeWallLines', () => {
    const start = newVec2(0, 0)
    const end = newVec2(1000, 0)
    const thickness = 100

    describe('same axis alignment (startAxis === endAxis)', () => {
      it('should create parallel left/right lines for left/left on horizontal segment', () => {
        const result = computeWallLines(start, 'left', end, 'left', thickness)

        expect(result.left.direction).toEqual(newVec2(1, 0))
        expect(result.right.direction).toEqual(newVec2(1, 0))

        const leftPerpDir = perpendicularCCW(result.left.direction)
        const distance = Math.abs(dotVec2(leftPerpDir, result.right.point) - dotVec2(leftPerpDir, result.left.point))
        expect(distance).toBeCloseTo(thickness, 1)
      })

      it('should create parallel left/right lines for left/left on vertical segment', () => {
        const vStart = newVec2(0, 0)
        const vEnd = newVec2(0, 1000)

        const result = computeWallLines(vStart, 'left', vEnd, 'left', thickness)

        expect(result.left.direction).toEqual(newVec2(0, 1))
        expect(result.right.direction).toEqual(newVec2(0, 1))

        const leftPerpDir = perpendicularCCW(result.left.direction)
        const distance = Math.abs(dotVec2(leftPerpDir, result.right.point) - dotVec2(leftPerpDir, result.left.point))
        expect(distance).toBeCloseTo(thickness, 1)
      })

      it('should place left line through start point for left/left', () => {
        const result = computeWallLines(start, 'left', end, 'left', thickness)

        expect(result.left.point).toEqual(start)
      })

      it('should place right line through start point for right/right', () => {
        const result = computeWallLines(start, 'right', end, 'right', thickness)

        expect(result.right.point).toEqual(start)
      })

      it('should offset left and right from the left attachment axis', () => {
        const result = computeWallLines(start, 'left', end, 'left', thickness)

        const midX = (start[0] + end[0]) / 2
        const midY = (start[1] + end[1]) / 2
        const midPoint = newVec2(midX, midY)

        const leftPerpDist = dotVec2(perpendicularCCW(result.left.direction), result.left.point)
        const rightPerpDist = dotVec2(perpendicularCCW(result.right.direction), result.right.point)

        const centerPerpDist = dotVec2(perpendicularCCW(result.left.direction), midPoint)

        expect(leftPerpDist).toBeCloseTo(centerPerpDist, 1)
        expect(rightPerpDist).toBeCloseTo(centerPerpDist - thickness, 1)
      })

      it('should work correctly on a diagonal segment (45 degrees)', () => {
        const dStart = newVec2(0, 0)
        const dEnd = newVec2(1000, 1000)

        const result = computeWallLines(dStart, 'left', dEnd, 'left', thickness)

        const dir = result.left.direction
        const expectedDirLen = Math.sqrt(2)
        expect(dir[0]).toBeCloseTo(1 / expectedDirLen, 5)
        expect(dir[1]).toBeCloseTo(1 / expectedDirLen, 5)

        const perpDir = perpendicularCCW(dir)
        const distance = Math.abs(dotVec2(perpDir, result.right.point) - dotVec2(perpDir, result.left.point))
        expect(distance).toBeCloseTo(thickness, 1)
      })

      it('should have left/right distance equal to thickness for left/left', () => {
        const result = computeWallLines(start, 'left', end, 'left', thickness)

        const perpDir = perpendicularCCW(result.left.direction)
        const distance = Math.abs(dotVec2(perpDir, result.right.point) - dotVec2(perpDir, result.left.point))
        expect(distance).toBeCloseTo(thickness, 1)
      })

      it('should keep the left line on the left side for every attachment-axis combination', () => {
        const axes = ['left', 'right'] as const

        for (const startAxis of axes) {
          for (const endAxis of axes) {
            const result = computeWallLines(start, startAxis, end, endAxis, thickness)
            const wallDirection = result.left.direction
            const leftDirection = perpendicularCCW(wallDirection)
            const rightFromLeft = subVec2(result.right.point, result.left.point)

            expect(dotVec2(wallDirection, subVec2(end, start))).toBeGreaterThan(0)
            expect(dotVec2(leftDirection, rightFromLeft)).toBeLessThan(0)
          }
        }
      })
    })

    describe('different axis alignment (startAxis !== endAxis)', () => {
      it('should use start point as left base for left/right', () => {
        const result = computeWallLines(start, 'left', end, 'right', thickness)

        expect(result.left.point).toEqual(start)
      })

      it('should offset right base by -thickness from left for left/right', () => {
        const result = computeWallLines(start, 'left', end, 'right', thickness)

        const leftPerpDir = perpendicularCCW(result.left.direction)
        const leftDist = dotVec2(leftPerpDir, result.left.point)
        const rightDist = dotVec2(leftPerpDir, result.right.point)
        expect(Math.abs(leftDist - rightDist)).toBeCloseTo(thickness, 1)
      })

      it('should have parallel left/right line directions', () => {
        const result = computeWallLines(start, 'left', end, 'right', thickness)

        const cross =
          result.left.direction[0] * result.right.direction[1] - result.left.direction[1] * result.right.direction[0]
        expect(Math.abs(cross)).toBeLessThan(1e-10)
      })

      it('should throw when thickness exceeds distance between points', () => {
        const closeStart = newVec2(0, 0)
        const closeEnd = newVec2(99, 0)

        expect(() => computeWallLines(closeStart, 'left', closeEnd, 'right', 100)).toThrow(
          'Wall thickness larger than distance between points'
        )
      })

      it('should succeed when thickness is just under distance', () => {
        const closeStart = newVec2(0, 0)
        const closeEnd = newVec2(100, 0)

        expect(() => computeWallLines(closeStart, 'left', closeEnd, 'right', 99.9)).not.toThrow()
      })
    })
  })

  describe('updateAllWallNodeGeometry', () => {
    it('should compute geometry for a single wall between two inner nodes', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeAId = createWallNodeId()
      const nodeBId = createWallNodeId()
      const wallId = createIntermediateWallId()

      state.wallNodes[nodeAId] = {
        id: nodeAId,
        perimeterId,
        type: 'inner',
        position: newVec2(2000, 2500),
        connectedWallIds: [wallId]
      }
      state.wallNodes[nodeBId] = {
        id: nodeBId,
        perimeterId,
        type: 'inner',
        position: newVec2(8000, 2500),
        connectedWallIds: [wallId]
      }
      state.intermediateWalls[wallId] = {
        id: wallId,
        perimeterId,
        entityIds: [],
        start: { nodeId: nodeAId, axis: 'left' },
        end: { nodeId: nodeBId, axis: 'left' },
        thickness: 120,
        wallAssemblyId: DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      }
      state.perimeters[perimeterId].intermediateWallIds.push(wallId)
      state.perimeters[perimeterId].wallNodeIds.push(nodeAId, nodeBId)

      updateAllWallNodeGeometry(state, perimeterId)

      const wallGeometry = state._intermediateWallGeometry[wallId]
      expect(wallGeometry).toBeDefined()
      expect(wallGeometry.wallLength).toBeCloseTo(6000, 0)
      expect(wallGeometry.boundary.points).toHaveLength(4)
      expect(wallGeometry.entityReferenceLine.start).toBeDefined()
      expect(wallGeometry.entityReferenceLine.end).toBeDefined()

      const centerLen = distVec2(wallGeometry.entityReferenceLine.start, wallGeometry.entityReferenceLine.end)
      expect(centerLen).toBeCloseTo(6000, 0)
      expect(centerLen).toBeCloseTo(wallGeometry.wallLength, 0)
    })

    it('should compute node geometry for wall end node (1 connected wall)', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeAId = createWallNodeId()
      const nodeBId = createWallNodeId()
      const wallId = createIntermediateWallId()

      state.wallNodes[nodeAId] = {
        id: nodeAId,
        perimeterId,
        type: 'inner',
        position: newVec2(2000, 2500),
        connectedWallIds: [wallId]
      }
      state.wallNodes[nodeBId] = {
        id: nodeBId,
        perimeterId,
        type: 'inner',
        position: newVec2(8000, 2500),
        connectedWallIds: [wallId]
      }
      state.intermediateWalls[wallId] = {
        id: wallId,
        perimeterId,
        entityIds: [],
        start: { nodeId: nodeAId, axis: 'left' },
        end: { nodeId: nodeBId, axis: 'left' },
        thickness: 120,
        wallAssemblyId: DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      }
      state.perimeters[perimeterId].intermediateWallIds.push(wallId)
      state.perimeters[perimeterId].wallNodeIds.push(nodeAId, nodeBId)

      updateAllWallNodeGeometry(state, perimeterId)

      const nodeAGeometry = state._wallNodeGeometry[nodeAId]
      expect(nodeAGeometry).toBeDefined()
      expect(nodeAGeometry.boundary).toBeUndefined()

      const nodeBGeometry = state._wallNodeGeometry[nodeBId]
      expect(nodeBGeometry).toBeDefined()
      expect(nodeBGeometry.boundary).toBeUndefined()
    })

    it('should create a node boundary with 4 points for a simple 90-degree corner (2 walls)', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeId = createWallNodeId()
      const nodeAId = createWallNodeId()
      const nodeBId = createWallNodeId()
      const wallAId = createIntermediateWallId()
      const wallBId = createIntermediateWallId()

      state.wallNodes[nodeId] = {
        id: nodeId,
        perimeterId,
        type: 'inner',
        position: newVec2(5000, 2500),
        connectedWallIds: [wallAId, wallBId]
      }
      state.wallNodes[nodeAId] = {
        id: nodeAId,
        perimeterId,
        type: 'inner',
        position: newVec2(2000, 2500),
        connectedWallIds: [wallAId]
      }
      state.wallNodes[nodeBId] = {
        id: nodeBId,
        perimeterId,
        type: 'inner',
        position: newVec2(5000, 4500),
        connectedWallIds: [wallBId]
      }
      state.intermediateWalls[wallAId] = {
        id: wallAId,
        perimeterId,
        entityIds: [],
        start: { nodeId: nodeAId, axis: 'left' },
        end: { nodeId, axis: 'left' },
        thickness: 120,
        wallAssemblyId: DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      }
      state.intermediateWalls[wallBId] = {
        id: wallBId,
        perimeterId,
        entityIds: [],
        start: { nodeId, axis: 'left' },
        end: { nodeId: nodeBId, axis: 'left' },
        thickness: 120,
        wallAssemblyId: DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      }
      state.perimeters[perimeterId].intermediateWallIds.push(wallAId, wallBId)
      state.perimeters[perimeterId].wallNodeIds.push(nodeId, nodeAId, nodeBId)

      updateAllWallNodeGeometry(state, perimeterId)

      const nodeGeometry = state._wallNodeGeometry[nodeId]
      expect(nodeGeometry).toBeDefined()
      expect(nodeGeometry.boundary?.points).toHaveLength(4)

      const geometryA = state._intermediateWallGeometry[wallAId]
      const geometryB = state._intermediateWallGeometry[wallBId]
      expect(geometryA.leftLine.end).toEqual(geometryB.leftLine.start)
      expect(geometryA.rightLine.end).toEqual(geometryB.rightLine.start)
    })

    it('should handle colinear walls meeting at a node (180-degree junction)', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeId = createWallNodeId()
      const nodeAId = createWallNodeId()
      const nodeBId = createWallNodeId()
      const wallAId = createIntermediateWallId()
      const wallBId = createIntermediateWallId()

      state.wallNodes[nodeId] = {
        id: nodeId,
        perimeterId,
        type: 'inner',
        position: newVec2(5000, 2500),
        connectedWallIds: [wallAId, wallBId]
      }
      state.wallNodes[nodeAId] = {
        id: nodeAId,
        perimeterId,
        type: 'inner',
        position: newVec2(2000, 2500),
        connectedWallIds: [wallAId]
      }
      state.wallNodes[nodeBId] = {
        id: nodeBId,
        perimeterId,
        type: 'inner',
        position: newVec2(8000, 2500),
        connectedWallIds: [wallBId]
      }
      state.intermediateWalls[wallAId] = {
        id: wallAId,
        perimeterId,
        entityIds: [],
        start: { nodeId: nodeAId, axis: 'left' },
        end: { nodeId, axis: 'left' },
        thickness: 120,
        wallAssemblyId: DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      }
      state.intermediateWalls[wallBId] = {
        id: wallBId,
        perimeterId,
        entityIds: [],
        start: { nodeId, axis: 'left' },
        end: { nodeId: nodeBId, axis: 'left' },
        thickness: 120,
        wallAssemblyId: DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      }
      state.perimeters[perimeterId].intermediateWallIds.push(wallAId, wallBId)
      state.perimeters[perimeterId].wallNodeIds.push(nodeId, nodeAId, nodeBId)

      updateAllWallNodeGeometry(state, perimeterId)

      const nodeGeometry = state._wallNodeGeometry[nodeId]
      expect(nodeGeometry).toBeDefined()
      expect(nodeGeometry.boundary).toBeUndefined()

      const wallAGeometry = state._intermediateWallGeometry[wallAId]
      const wallBGeometry = state._intermediateWallGeometry[wallBId]
      expect(wallAGeometry).toBeDefined()
      expect(wallBGeometry).toBeDefined()
      expect(wallAGeometry.leftLine.end).toEqual(wallBGeometry.leftLine.start)
      expect(wallAGeometry.rightLine.end).toEqual(wallBGeometry.rightLine.start)
      expect(wallAGeometry.leftLine.end).toEqual(
        projectPointOntoLine(state.wallNodes[nodeId].position, lineFromSegment(wallAGeometry.leftLine))
      )
      expect(wallAGeometry.rightLine.end).toEqual(
        projectPointOntoLine(state.wallNodes[nodeId].position, lineFromSegment(wallAGeometry.rightLine))
      )
      expect(wallAGeometry.wallLength + wallBGeometry.wallLength).toBeCloseTo(6000, 0)
    })

    it('should include both sides of every sector for a three-way node', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData
      const nodeId = createWallNodeId()
      const endNodeIds = [createWallNodeId(), createWallNodeId(), createWallNodeId()]
      const wallIds = [createIntermediateWallId(), createIntermediateWallId(), createIntermediateWallId()]
      const endPositions = [newVec2(2000, 3000), newVec2(6500, 5598), newVec2(6500, 402)]

      state.wallNodes[nodeId] = {
        id: nodeId,
        perimeterId,
        type: 'inner',
        position: newVec2(5000, 3000),
        connectedWallIds: wallIds
      }

      for (let i = 0; i < wallIds.length; i++) {
        const endNodeId = endNodeIds[i]
        state.wallNodes[endNodeId] = {
          id: endNodeId,
          perimeterId,
          type: 'inner',
          position: endPositions[i],
          connectedWallIds: [wallIds[i]]
        }
        state.intermediateWalls[wallIds[i]] = {
          id: wallIds[i],
          perimeterId,
          entityIds: [],
          start: { nodeId, axis: 'left' },
          end: { nodeId: endNodeId, axis: 'left' },
          thickness: 120,
          wallAssemblyId: DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
        }
      }

      state.perimeters[perimeterId].intermediateWallIds.push(...wallIds)
      state.perimeters[perimeterId].wallNodeIds.push(nodeId, ...endNodeIds)

      updateAllWallNodeGeometry(state, perimeterId)

      const nodeGeometry = state._wallNodeGeometry[nodeId]
      expect(nodeGeometry.boundary?.points).toHaveLength(6)
    })

    it('should retain irregular sector endpoints around a three-way node', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData
      const nodeId = createWallNodeId()
      const endNodeIds = [createWallNodeId(), createWallNodeId(), createWallNodeId()]
      const wallIds = [createIntermediateWallId(), createIntermediateWallId(), createIntermediateWallId()]
      const center = newVec2(5000, 3000)
      const angles = [180, 80, -38]

      state.wallNodes[nodeId] = {
        id: nodeId,
        perimeterId,
        type: 'inner',
        position: center,
        connectedWallIds: wallIds
      }

      for (let i = 0; i < wallIds.length; i++) {
        const radians = (angles[i] * Math.PI) / 180
        const endNodeId = endNodeIds[i]
        state.wallNodes[endNodeId] = {
          id: endNodeId,
          perimeterId,
          type: 'inner',
          position: newVec2(center[0] + Math.cos(radians) * 3000, center[1] + Math.sin(radians) * 3000),
          connectedWallIds: [wallIds[i]]
        }
        state.intermediateWalls[wallIds[i]] = {
          id: wallIds[i],
          perimeterId,
          entityIds: [],
          start: { nodeId, axis: 'left' },
          end: { nodeId: endNodeId, axis: 'left' },
          thickness: 120,
          wallAssemblyId: DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
        }
      }

      state.perimeters[perimeterId].intermediateWallIds.push(...wallIds)
      state.perimeters[perimeterId].wallNodeIds.push(nodeId, ...endNodeIds)

      updateAllWallNodeGeometry(state, perimeterId)

      // The raw three-sector polygon retains both endpoints and each sector
      // intersection for the irregular junction.
      const points = state._wallNodeGeometry[nodeId].boundary?.points ?? []
      expect(points).toHaveLength(6)
      expect(points).not.toContainEqual([0, 0])
    })

    it('should include the opposite corner in a perpendicular T-junction', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData
      const nodeId = createWallNodeId()
      const endNodeIds = [createWallNodeId(), createWallNodeId(), createWallNodeId()]
      const wallIds = [createIntermediateWallId(), createIntermediateWallId(), createIntermediateWallId()]
      const center = newVec2(5000, 3000)
      const endPositions = [newVec2(2000, 3000), newVec2(8000, 3000), newVec2(5000, 6000)]

      state.wallNodes[nodeId] = {
        id: nodeId,
        perimeterId,
        type: 'inner',
        position: center,
        connectedWallIds: wallIds
      }

      for (let i = 0; i < wallIds.length; i++) {
        const endNodeId = endNodeIds[i]
        state.wallNodes[endNodeId] = {
          id: endNodeId,
          perimeterId,
          type: 'inner',
          position: endPositions[i],
          connectedWallIds: [wallIds[i]]
        }
        state.intermediateWalls[wallIds[i]] = {
          id: wallIds[i],
          perimeterId,
          entityIds: [],
          start: { nodeId: i === 1 ? endNodeId : nodeId, axis: 'left' },
          end: { nodeId: i === 1 ? nodeId : endNodeId, axis: 'left' },
          thickness: 200,
          wallAssemblyId: DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
        }
      }

      state.perimeters[perimeterId].intermediateWallIds.push(...wallIds)
      state.perimeters[perimeterId].wallNodeIds.push(nodeId, ...endNodeIds)

      updateAllWallNodeGeometry(state, perimeterId)

      const points = state._wallNodeGeometry[nodeId].boundary?.points ?? []
      expect(points).toHaveLength(4)
      expect(points).toContainEqual(newVec2(5000, 3000))
      expect(points).toContainEqual(newVec2(5200, 3000))
      expect(points).toContainEqual(newVec2(5200, 3200))
      expect(points).toContainEqual(newVec2(5000, 3200))
    })

    it('should compute position for perimeter wall node from offset', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId, wallIds } = perimeterData

      const nodeId = createWallNodeId()
      const innerNodeId = createWallNodeId()
      const wallId = createIntermediateWallId()
      const offset = 3000

      state.wallNodes[nodeId] = {
        id: nodeId,
        perimeterId,
        type: 'perimeter',
        wallId: wallIds[1],
        offsetFromCornerStart: offset,
        connectedWallIds: [wallId]
      }
      state.wallNodes[innerNodeId] = {
        id: innerNodeId,
        perimeterId,
        type: 'inner',
        position: newVec2(3000, 2500),
        connectedWallIds: [wallId]
      }
      state.intermediateWalls[wallId] = {
        id: wallId,
        perimeterId,
        entityIds: [],
        start: { nodeId, axis: 'left' },
        end: { nodeId: innerNodeId, axis: 'left' },
        thickness: 120,
        wallAssemblyId: DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      }
      state.perimeters[perimeterId].intermediateWallIds.push(wallId)
      state.perimeters[perimeterId].wallNodeIds.push(nodeId, innerNodeId)

      updateAllWallNodeGeometry(state, perimeterId)

      const nodeGeometry = state._wallNodeGeometry[nodeId] as PerimeterWallNodeGeometry
      expect(nodeGeometry).toBeDefined()
      expect(nodeGeometry.center[0]).toBeCloseTo(2940, 0)
      expect(nodeGeometry.center[1]).toBeCloseTo(5210, 0)
      expect(nodeGeometry.insideLine.start).toEqual(newVec2(2880, 5000))
      expect(nodeGeometry.insideLine.end).toEqual(newVec2(3000, 5000))
      expect(nodeGeometry.outsideLine.start).toEqual(newVec2(2880, 5420))
      expect(nodeGeometry.outsideLine.end).toEqual(newVec2(3000, 5420))
      expect(nodeGeometry.incidentWalls).toHaveLength(3)
    })

    it('should return early for non-existent perimeter', () => {
      const { state } = setupIntermediateWallsSlice()

      expect(() => {
        updateAllWallNodeGeometry(state, 'perimeter_nonexistent' as any)
      }).not.toThrow()
    })

    it('should return without error for empty perimeter (no walls/nodes)', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()

      state.perimeters[perimeterData.perimeterId].intermediateWallIds = []
      state.perimeters[perimeterData.perimeterId].wallNodeIds = []

      expect(() => {
        updateAllWallNodeGeometry(state, perimeterData.perimeterId)
      }).not.toThrow()
    })

    it('should have entityReferenceLine between leftLine and rightLine for left/left wall', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeAId = createWallNodeId()
      const nodeBId = createWallNodeId()
      const wallId = createIntermediateWallId()

      state.wallNodes[nodeAId] = {
        id: nodeAId,
        perimeterId,
        type: 'inner',
        position: newVec2(2000, 2500),
        connectedWallIds: [wallId]
      }
      state.wallNodes[nodeBId] = {
        id: nodeBId,
        perimeterId,
        type: 'inner',
        position: newVec2(8000, 2500),
        connectedWallIds: [wallId]
      }
      state.intermediateWalls[wallId] = {
        id: wallId,
        perimeterId,
        entityIds: [],
        start: { nodeId: nodeAId, axis: 'left' },
        end: { nodeId: nodeBId, axis: 'left' },
        thickness: 120,
        wallAssemblyId: DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      }
      state.perimeters[perimeterId].intermediateWallIds.push(wallId)
      state.perimeters[perimeterId].wallNodeIds.push(nodeAId, nodeBId)

      updateAllWallNodeGeometry(state, perimeterId)

      const geo = state._intermediateWallGeometry[wallId]
      expect(geo).toBeDefined()

      const perpDir = perpendicularCCW(geo.direction)

      const centerStartPerp = dotVec2(perpDir, geo.entityReferenceLine.start)
      const leftStartPerp = dotVec2(perpDir, geo.leftLine.start)
      const rightStartPerp = dotVec2(perpDir, geo.rightLine.start)

      expect(centerStartPerp).toBeGreaterThan(Math.min(leftStartPerp, rightStartPerp))
      expect(centerStartPerp).toBeLessThan(Math.max(leftStartPerp, rightStartPerp))
    })

    it('should preserve a trapezoid and limit both centerline endpoints to the side spans', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData
      const startNode = state.actions.addInnerWallNode(perimeterId, newVec2(2000, 2500))
      const endNode = state.actions.addInnerWallNode(perimeterId, newVec2(8000, 2500))
      const wall = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: startNode.id, axis: 'left' },
        { nodeId: endNode.id, axis: 'right' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )
      const geometry = state._intermediateWallGeometry[wall.id]
      const epsilon = 1e-3

      expect(geometry.leftLength).not.toBeCloseTo(geometry.rightLength, 5)
      expect(geometry.boundary.points).toHaveLength(4)

      for (const [center, left, right] of [
        [geometry.entityReferenceLine.start, geometry.leftLine, geometry.rightLine],
        [geometry.entityReferenceLine.end, geometry.leftLine, geometry.rightLine]
      ] as const) {
        const centerProjection = dotVec2(geometry.direction, center)
        const leftStart = dotVec2(geometry.direction, left.start)
        const leftEnd = dotVec2(geometry.direction, left.end)
        const rightStart = dotVec2(geometry.direction, right.start)
        const rightEnd = dotVec2(geometry.direction, right.end)
        const overlapStart = Math.max(Math.min(leftStart, leftEnd), Math.min(rightStart, rightEnd))
        const overlapEnd = Math.min(Math.max(leftStart, leftEnd), Math.max(rightStart, rightEnd))
        expect(centerProjection).toBeGreaterThanOrEqual(overlapStart - epsilon)
        expect(centerProjection).toBeLessThanOrEqual(overlapEnd + epsilon)
      }
    })

    it('should preserve physical side lines when a trapezoidal wall direction is reversed', () => {
      const forward = computeWallLines(newVec2(0, 0), 'left', newVec2(6000, 0), 'right', 120)
      const reverse = computeWallLines(newVec2(6000, 0), 'right', newVec2(0, 0), 'left', 120)

      expect(distanceToInfiniteLine(forward.left.point, reverse.left)).toBeCloseTo(0, 5)
      expect(distanceToInfiniteLine(forward.right.point, reverse.right)).toBeCloseTo(0, 5)
      expect(dotVec2(reverse.left.direction, subVec2(newVec2(0, 0), newVec2(6000, 0)))).toBeGreaterThan(0)
      expect(dotVec2(reverse.right.direction, subVec2(newVec2(0, 0), newVec2(6000, 0)))).toBeGreaterThan(0)
    })

    it('should position wall entities from the finalized centerline', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData
      const startNode = state.actions.addInnerWallNode(perimeterId, newVec2(2000, 2500))
      const endNode = state.actions.addInnerWallNode(perimeterId, newVec2(8000, 2500))
      const wall = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: startNode.id, axis: 'left' },
        { nodeId: endNode.id, axis: 'right' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )
      const opening = state.actions.addWallOpening(wall.id, {
        openingType: 'door',
        centerOffsetFromWallStart: wall.wallLength / 3,
        width: 800,
        height: 2100
      })
      const geometry = state._intermediateWallGeometry[wall.id]
      const openingGeometry = state._openingGeometry[opening.id]
      const expectedCenter = scaleAddVec2(
        geometry.entityReferenceLine.start,
        geometry.direction,
        opening.centerOffsetFromWallStart
      )

      expect(distVec2(openingGeometry.center, expectedCenter)).toBeLessThan(1e-3)
      expect(distVec2(openingGeometry.insideLine.start, openingGeometry.outsideLine.start)).toBeCloseTo(120, 3)
      expect(distVec2(openingGeometry.insideLine.end, openingGeometry.outsideLine.end)).toBeCloseTo(120, 3)
    })

    it('should generate a valid opening polygon from finalized intermediate wall sides', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData
      const nodeA = state.actions.addInnerWallNode(perimeterId, newVec2(500, 300))
      const nodeB = state.actions.addInnerWallNode(perimeterId, newVec2(3200, 1400))
      const wall = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'left' },
        { nodeId: nodeB.id, axis: 'left' },
        120,
        DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      )
      const opening = state.actions.addWallOpening(wall.id, {
        openingType: 'door',
        centerOffsetFromWallStart: wall.wallLength / 2,
        width: 800,
        height: 2100
      })
      const geometry = state._openingGeometry[opening.id]
      const points = geometry.polygon.points
      expect(points).toHaveLength(4)
      expect(distVec2(geometry.insideLine.start, geometry.insideLine.end)).toBeCloseTo(800, 3)
      expect(distVec2(geometry.outsideLine.start, geometry.outsideLine.end)).toBeCloseTo(800, 3)
      expect(new Set(points).size).toBe(4)
      expect(geometry.polygon.points).toEqual(points)
    })
  })
})
