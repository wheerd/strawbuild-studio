import { type IntermediateWallWithGeometry, isOpeningId } from '@/building/model'
import { getModelActions } from '@/building/store'
import { resolveLayerSetLayers, resolveLayerSetThickness } from '@/config/store'
import type { MonolithicWallAssemblyConfig } from '@/config/types'
import { runLayerConstruction } from '@/construction/assemblies/perimeterWalls/layers'
import type { PerimeterConstructionContext } from '@/construction/context/perimeter'
import type { StoreyContext } from '@/construction/context/storeys'
import { createConstructionElement } from '@/construction/model/elements'
import { type ConstructionModel, type DebugClippingPlane } from '@/construction/model/model'
import { aggregateResults, assignDeterministicIdsToResults } from '@/construction/model/results'
import type { ConstructionResult } from '@/construction/model/results'
import { createExtrudedPolygon } from '@/construction/model/shapes'
import { createTag } from '@/construction/model/tags'
import { intermediateWallTransform } from '@/construction/model/transforms'
import { Bounds3D, type Polygon2D, type PolygonWithHoles2D, fromTrans, newVec2, newVec3 } from '@/shared/geometry'

import {
  clipInteriorWallResults,
  computeLayerExtension,
  computeTerminalCapLayerOffset,
  computeWallExtensionAndClipping,
  transformPlaneToWallCoordinates
} from './geometry'
import type { LayerExtension } from './geometry'
import type { InteriorWallAssembly } from './types'

export class MonolithicInteriorWallAssembly implements InteriorWallAssembly {
  private readonly config: MonolithicWallAssemblyConfig

  constructor(config: MonolithicWallAssemblyConfig) {
    this.config = config
  }

  construct(
    wall: IntermediateWallWithGeometry,
    storeyContext: StoreyContext,
    perimeterContext: PerimeterConstructionContext
  ): ConstructionModel {
    const { getWallOpeningById, getWallNodeById } = getModelActions()
    const faceThickness = resolveLayerSetThickness(this.config.layerSetId)
    const coreThickness = wall.thickness - faceThickness * 2

    const height = storeyContext.ceilingConstructionBottom - storeyContext.floorConstructionTop
    const layerDirection = wall.direction
    const openingHoles = wall.entityIds
      .filter(isOpeningId)
      .map(id => getWallOpeningById(id))
      .flatMap(opening => {
        const start = Math.max(0, opening.centerOffsetFromWallStart - opening.width / 2)
        const end = Math.min(wall.wallLength, opening.centerOffsetFromWallStart + opening.width / 2)
        const bottom = Math.max(
          0,
          storeyContext.finishedFloorTop + (opening.sillHeight ?? 0) - storeyContext.floorConstructionTop
        )
        const top = Math.min(height, bottom + opening.height)
        return end > start && top > bottom
          ? [
              {
                points: [newVec2(start, bottom), newVec2(end, bottom), newVec2(end, top), newVec2(start, top)]
              } satisfies Polygon2D
            ]
          : []
      })

    const startNode = getWallNodeById(wall.start.nodeId)
    const endNode = getWallNodeById(wall.end.nodeId)
    const extension = computeWallExtensionAndClipping(wall, startNode, endNode, perimeterContext, faceThickness)
    const debugPlaneEntries: { endpoint: 'start' | 'end'; plane: typeof extension.startClipPlane }[] = [
      { endpoint: 'start', plane: extension.startClipPlane },
      { endpoint: 'end', plane: extension.endClipPlane }
    ]
    const debugClippingPlanes: DebugClippingPlane[] = debugPlaneEntries.flatMap(({ endpoint, plane }) => {
      if (!plane) return []
      const localPlane = transformPlaneToWallCoordinates(plane, wall, storeyContext.wallBottom)
      return [
        {
          id: `${wall.id}-${endpoint}`,
          sourceWallId: wall.id,
          endpoint,
          normal: localPlane.normal,
          originOffset: localPlane.originOffset
        }
      ]
    })
    const corePolygon: PolygonWithHoles2D = {
      outer: {
        points: [
          newVec2(-extension.startExtension, 0),
          newVec2(wall.wallLength + extension.endExtension, 0),
          newVec2(wall.wallLength + extension.endExtension, height),
          newVec2(-extension.startExtension, height)
        ]
      },
      holes: openingHoles
    }
    const core = createConstructionElement(
      this.config.material,
      createExtrudedPolygon(corePolygon, 'xz', coreThickness),
      fromTrans(
        newVec3(0, -wall.thickness / 2 + faceThickness, storeyContext.floorConstructionTop - storeyContext.wallBottom)
      )
    )

    const layerResults: ConstructionResult[] = []
    const layers = resolveLayerSetLayers(this.config.layerSetId)
    for (const [index, layer] of layers.entries()) {
      const offset = layers
        .slice(0, index)
        .filter(candidate => !candidate.overlap)
        .reduce((sum, candidate) => sum + candidate.thickness, 0)
      const leftBand = {
        start: wall.thickness / 2 - faceThickness + offset,
        end: wall.thickness / 2 - faceThickness + offset + layer.thickness
      }
      const rightBand = {
        start: -wall.thickness / 2 + faceThickness - offset - layer.thickness,
        end: -wall.thickness / 2 + faceThickness - offset
      }
      const leftExtension = computeLayerExtension(wall, extension.layerClipping.left, leftBand)
      const rightExtension = computeLayerExtension(wall, extension.layerClipping.right, rightBand)
      const createLayerPolygon = (layerExtension: LayerExtension): PolygonWithHoles2D => ({
        outer: {
          points: [
            newVec2(-layerExtension.startExtension, 0),
            newVec2(wall.wallLength + layerExtension.endExtension, 0),
            newVec2(wall.wallLength + layerExtension.endExtension, height),
            newVec2(-layerExtension.startExtension, height)
          ]
        },
        holes: openingHoles
      })
      const leftResults = runLayerConstruction(
        createLayerPolygon(leftExtension),
        wall.thickness / 2 - faceThickness + offset,
        'xz',
        layer,
        layerDirection
      )
      const rightResults = runLayerConstruction(
        createLayerPolygon(rightExtension),
        rightBand.start,
        'xz',
        layer,
        layerDirection
      )
      assignDeterministicIdsToResults(leftResults, `${wall.id}_left_${index}`)
      assignDeterministicIdsToResults(rightResults, `${wall.id}_right_${index}`)
      layerResults.push(
        ...clipInteriorWallResults(
          leftResults,
          leftExtension,
          wall,
          height,
          perimeterContext,
          intermediateWallTransform(wall, storeyContext.wallBottom)
        ),
        ...clipInteriorWallResults(
          rightResults,
          rightExtension,
          wall,
          height,
          perimeterContext,
          intermediateWallTransform(wall, storeyContext.wallBottom)
        )
      )
    }

    const capPolygon: PolygonWithHoles2D = {
      outer: {
        points: [
          newVec2(-wall.thickness / 2, 0),
          newVec2(wall.thickness / 2, 0),
          newVec2(wall.thickness / 2, height),
          newVec2(-wall.thickness / 2, height)
        ]
      },
      holes: []
    }
    for (const [endpoint, node] of [
      ['start', startNode],
      ['end', endNode]
    ] as const) {
      if (node.incidentWalls.length !== 1) continue
      const capPlane = endpoint === 'start' ? extension.layerClipping.left.start : extension.layerClipping.left.end
      if (!capPlane) continue

      const localCapPlane = transformPlaneToWallCoordinates(capPlane, wall)
      const normalX = localCapPlane.normal[0]
      if (Math.abs(normalX) <= 1e-6) continue
      const capX = localCapPlane.originOffset / normalX

      for (const [index, layer] of layers.entries()) {
        const offset = layers
          .slice(0, index)
          .filter(candidate => !candidate.overlap)
          .reduce((sum, candidate) => sum + candidate.thickness, 0)
        const layerX = computeTerminalCapLayerOffset(endpoint, capX, faceThickness, offset, layer.thickness)
        const capResults = runLayerConstruction(capPolygon, layerX, 'yz', layer, newVec2(1, 0))
        assignDeterministicIdsToResults(capResults, `${wall.id}_cap_${endpoint}_${index}`)
        layerResults.push(...capResults)
      }
    }
    const clippedCoreResults = clipInteriorWallResults(
      [{ type: 'element', element: core }],
      extension,
      wall,
      height,
      perimeterContext,
      intermediateWallTransform(wall, storeyContext.wallBottom)
    )
    const aggregated = aggregateResults([...clippedCoreResults, ...layerResults])
    return {
      elements: aggregated.elements,
      measurements: aggregated.measurements,
      areas: aggregated.areas,
      errors: aggregated.errors,
      warnings: aggregated.warnings,
      bounds: Bounds3D.merge(...aggregated.elements.map(element => element.bounds)),
      debugClippingPlanes
    }
  }

  get tags() {
    const nameKey = this.config.nameKey
    return [
      createTag('wall-assembly', this.config.id, nameKey != null ? t => t(nameKey, { ns: 'config' }) : this.config.name)
    ]
  }
}
