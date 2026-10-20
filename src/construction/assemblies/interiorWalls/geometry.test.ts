import { describe, expect, it } from 'vitest'

import type { IntermediateWallWithGeometry, WallNodeWithGeometry } from '@/building/model'
import type { IntermediateWallId, WallNodeId } from '@/building/model/ids'
import type { PerimeterConstructionContext } from '@/construction/context/perimeter'
import { newVec2 } from '@/shared/geometry'
import { partial } from '@/test/helpers'

import { computeWallExtensionAndClipping, transformPolygonToWallCoordinates } from './geometry'

const wallId = 'interior-wall' as IntermediateWallId
const constructingWallId = 'constructing-wall' as IntermediateWallId
const startNodeId = 'start-node' as WallNodeId
const endNodeId = 'end-node' as WallNodeId

const wall = partial<IntermediateWallWithGeometry>({
  id: wallId,
  entityReferenceLine: {
    start: newVec2(0, 0),
    end: newVec2(100, 0)
  },
  direction: newVec2(1, 0)
})

describe('interior wall geometry', () => {
  it('computes extensions from core endpoints', () => {
    const context = partial<PerimeterConstructionContext>({
      interiorWallGeometry: new Map([
        [
          wallId,
          {
            coreLines: {
              left: { point: newVec2(0, 0), direction: newVec2(1, 0) },
              right: { point: newVec2(0, 100), direction: newVec2(1, 0) }
            },
            start: { nodeId: startNodeId, left: newVec2(-25, 0), right: newVec2(-25, 100) },
            end: { nodeId: endNodeId, left: newVec2(125, 0), right: newVec2(125, 100) }
          }
        ]
      ]),
      interiorWallNodePolygons: new Map()
    })

    expect(
      computeWallExtensionAndClipping(
        wall,
        partial<WallNodeWithGeometry>({
          id: startNodeId,
          type: 'inner',
          connectedWallIds: [],
          perimeterId: 'perimeter' as never,
          position: newVec2(0, 0)
        }),
        partial<WallNodeWithGeometry>({
          id: endNodeId,
          type: 'inner',
          connectedWallIds: [],
          perimeterId: 'perimeter' as never,
          position: newVec2(100, 0)
        }),
        context
      )
    ).toMatchObject({ startExtension: 25, endExtension: 25 })
  })

  it('transforms XY polygons into wall-local coordinates', () => {
    const rotatedWall = partial<IntermediateWallWithGeometry>({
      entityReferenceLine: {
        start: newVec2(10, 20),
        end: newVec2(10, 120)
      },
      direction: newVec2(0, 1)
    })

    expect(
      transformPolygonToWallCoordinates({ points: [newVec2(0, 20), newVec2(0, 30), newVec2(10, 30)] }, rotatedWall)
    ).toEqual({ points: [newVec2(0, 10), newVec2(10, 10), newVec2(10, 0)] })
  })

  it('selects the right constructing boundary at the start and the left boundary at the end', () => {
    const context = partial<PerimeterConstructionContext>({
      interiorWallGeometry: new Map([
        [
          wallId,
          {
            coreLines: {
              left: { point: newVec2(0, -5), direction: newVec2(1, 0) },
              right: { point: newVec2(0, 5), direction: newVec2(1, 0) }
            },
            start: { nodeId: startNodeId, left: newVec2(0, -5), right: newVec2(0, 5) },
            end: { nodeId: endNodeId, left: newVec2(100, -5), right: newVec2(100, 5) }
          }
        ],
        [
          constructingWallId,
          {
            coreLines: {
              left: { point: newVec2(-10, 0), direction: newVec2(0, 1) },
              right: { point: newVec2(10, 0), direction: newVec2(0, 1) }
            },
            start: { nodeId: startNodeId, left: newVec2(-10, 0), right: newVec2(10, 0) },
            end: { nodeId: endNodeId, left: newVec2(-10, 100), right: newVec2(10, 100) }
          }
        ]
      ]),
      interiorWallNodePolygons: new Map()
    })

    const result = computeWallExtensionAndClipping(
      partial<IntermediateWallWithGeometry>({
        id: wallId,
        entityReferenceLine: { start: newVec2(0, 0), end: newVec2(100, 0) },
        direction: newVec2(1, 0)
      }),
      partial<WallNodeWithGeometry>({ id: startNodeId, type: 'inner', constructedBy: constructingWallId }),
      partial<WallNodeWithGeometry>({ id: endNodeId, type: 'inner', constructedBy: constructingWallId }),
      context
    )

    expect(result.startClipPlane?.normal[0]).toBe(1)
    expect(Math.abs(result.startClipPlane?.normal[1] ?? 1)).toBe(0)
    expect(result.endClipPlane?.normal[0]).toBe(-1)
    expect(Math.abs(result.endClipPlane?.normal[1] ?? 1)).toBe(0)
  })
})
