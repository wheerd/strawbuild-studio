import { describe, expect, it } from 'vitest'

import type { IntermediateWallWithGeometry, WallNodeWithGeometry } from '@/building/model'
import type { IntermediateWallId, PerimeterWallId, WallNodeId } from '@/building/model/ids'
import type { PerimeterConstructionContext } from '@/construction/context/perimeter'
import { newVec2, newVec3 } from '@/shared/geometry'
import { partial } from '@/test/helpers'

import {
  computeLayerExtension,
  computeWallExtensionAndClipping,
  transformPlaneToWallCoordinates,
  transformPolygonToWallCoordinates
} from './geometry'

const wallId = 'intermediate_wall' as IntermediateWallId
const constructingWallId = 'intermediate_constructing' as IntermediateWallId
const startNodeId = 'start-node' as WallNodeId
const endNodeId = 'end-node' as WallNodeId
const neighborWallId = 'intermediate_neighbor' as IntermediateWallId

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
          position: newVec2(0, 0),
          incidentWalls: []
        }),
        partial<WallNodeWithGeometry>({
          id: endNodeId,
          type: 'inner',
          connectedWallIds: [],
          perimeterId: 'perimeter' as never,
          position: newVec2(100, 0),
          incidentWalls: []
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

  it('transforms plan clipping planes into wall-local coordinates', () => {
    const translatedWall = partial<IntermediateWallWithGeometry>({
      entityReferenceLine: {
        start: newVec2(10, 20),
        end: newVec2(110, 20)
      },
      direction: newVec2(1, 0)
    })

    const transformed = transformPlaneToWallCoordinates({ normal: newVec3(1, 0, 0), originOffset: 0 }, translatedWall)
    expect(Array.from(transformed.normal)).toEqual([1, 0, 0])
    expect(transformed.originOffset).toBe(-10)
  })

  it('uses the same global plane for walls with different placement transforms', () => {
    const horizontalWall = partial<IntermediateWallWithGeometry>({
      entityReferenceLine: { start: newVec2(0, 0), end: newVec2(100, 0) },
      direction: newVec2(1, 0)
    })
    const verticalWall = partial<IntermediateWallWithGeometry>({
      entityReferenceLine: { start: newVec2(0, 0), end: newVec2(0, 100) },
      direction: newVec2(0, 1)
    })
    const plane = { normal: newVec3(1, 0, 0), originOffset: 0 }

    const horizontal = transformPlaneToWallCoordinates(plane, horizontalWall)
    const vertical = transformPlaneToWallCoordinates(plane, verticalWall)

    expect(Array.from(horizontal.normal)).toEqual([1, 0, 0])
    expect(horizontal.originOffset).toBe(0)
    expect(vertical.normal[0]).toBeCloseTo(0)
    expect(vertical.normal[1]).toBe(-1)
    expect(vertical.normal[2]).toBe(0)
    expect(vertical.originOffset).toBe(0)
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
      partial<WallNodeWithGeometry>({
        id: startNodeId,
        type: 'inner',
        constructedBy: constructingWallId,
        incidentWalls: []
      }),
      partial<WallNodeWithGeometry>({
        id: endNodeId,
        type: 'inner',
        constructedBy: constructingWallId,
        incidentWalls: []
      }),
      context
    )

    expect(result.startClipPlane?.normal[0]).toBe(1)
    expect(Math.abs(result.startClipPlane?.normal[1] ?? 1)).toBe(0)
    expect(result.endClipPlane?.normal[0]).toBe(-1)
    expect(Math.abs(result.endClipPlane?.normal[1] ?? 1)).toBe(0)
  })

  it('orients perimeter clipping planes toward the attached wall', () => {
    const context = partial<PerimeterConstructionContext>({
      innerLinesById: {
        ['perimeterWall' as PerimeterWallId]: { point: newVec2(0, 0), direction: newVec2(0, 1) }
      },
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
        ]
      ]),
      interiorWallNodePolygons: new Map()
    })
    const wallWithPerimeterStart = partial<IntermediateWallWithGeometry>({
      id: wallId,
      entityReferenceLine: { start: newVec2(0, 0), end: newVec2(100, 0) },
      direction: newVec2(1, 0)
    })

    const result = computeWallExtensionAndClipping(
      wallWithPerimeterStart,
      partial<WallNodeWithGeometry>({
        type: 'perimeter',
        wallId: 'perimeterWall' as PerimeterWallId,
        incidentWalls: []
      }),
      partial<WallNodeWithGeometry>({ type: 'inner', constructedBy: wallId, incidentWalls: [] }),
      context
    )

    expect(result.startClipPlane?.normal[0]).toBe(1)
    expect(result.startClipPlane?.normal[1]).toBeCloseTo(0)
    expect(result.startClipPlane?.normal[2]).toBe(0)
  })

  it('uses neighboring construction geometry for cached layer clipping', () => {
    const layerWall = partial<IntermediateWallWithGeometry>({
      id: wallId,
      entityReferenceLine: { start: newVec2(0, 0), end: newVec2(100, 0) },
      direction: newVec2(1, 0),
      wallLength: 100
    })
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
          neighborWallId,
          {
            coreLines: {
              left: { point: newVec2(40, 0), direction: newVec2(0, 1) },
              right: { point: newVec2(30, 0), direction: newVec2(0, 1) }
            }
          }
        ]
      ]),
      interiorWallNodePolygons: new Map()
    })
    const node = partial<WallNodeWithGeometry>({
      id: startNodeId,
      type: 'inner',
      center: newVec2(0, 0),
      incidentWalls: [
        {
          id: wallId,
          direction: newVec2(1, 0),
          leftPoint: newVec2(0, 5),
          rightPoint: newVec2(0, -5),
          side: 'start'
        },
        {
          id: neighborWallId,
          direction: newVec2(0, 1),
          leftPoint: newVec2(0, 20),
          rightPoint: newVec2(0, 10),
          side: 'start'
        }
      ]
    })

    const wallExtension = computeWallExtensionAndClipping(layerWall, node, node, context)
    const extension = computeLayerExtension(layerWall, wallExtension.layerClipping.left, { start: 0, end: 10 })

    expect(extension.startClipPlane?.normal[0]).toBe(1)
    expect(extension.startClipPlane?.originOffset).toBe(30)
  })

  it('uses the node projection for a collinear layer transition', () => {
    const layerWall = partial<IntermediateWallWithGeometry>({
      id: wallId,
      entityReferenceLine: { start: newVec2(0, 0), end: newVec2(100, 0) },
      direction: newVec2(1, 0),
      wallLength: 100
    })
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
          neighborWallId,
          {
            coreLines: {
              left: { point: newVec2(0, -5), direction: newVec2(1, 0) },
              right: { point: newVec2(0, 5), direction: newVec2(1, 0) }
            }
          }
        ]
      ]),
      interiorWallNodePolygons: new Map()
    })
    const node = partial<WallNodeWithGeometry>({
      id: startNodeId,
      type: 'inner',
      center: newVec2(-25, 0),
      incidentWalls: [
        {
          id: wallId,
          direction: newVec2(1, 0),
          leftPoint: newVec2(-25, 5),
          rightPoint: newVec2(-25, -5),
          side: 'start'
        },
        {
          id: neighborWallId,
          direction: newVec2(1, 0),
          leftPoint: newVec2(-25, 5),
          rightPoint: newVec2(-25, -5),
          side: 'start'
        }
      ]
    })

    const wallExtension = computeWallExtensionAndClipping(layerWall, node, node, context)
    const extension = computeLayerExtension(layerWall, wallExtension.layerClipping.right, { start: -10, end: 0 })

    expect(extension.startClipPlane?.originOffset).toBe(-25)
    expect(extension.startExtension).toBe(25)
  })
})
