import { type IntermediateWallWithGeometry, isOpeningId } from '@/building/model'
import { getModelActions } from '@/building/store'
import { resolveLayerSetLayers, resolveLayerSetThickness } from '@/config/store'
import type { MonolithicWallAssemblyConfig } from '@/config/types'
import { runLayerConstruction } from '@/construction/assemblies/perimeterWalls/layers'
import type { StoreyContext } from '@/construction/context/storeys'
import { createConstructionElement } from '@/construction/model/elements'
import { type ConstructionModel } from '@/construction/model/model'
import { aggregateResults, assignDeterministicIdsToResults } from '@/construction/model/results'
import type { ConstructionResult } from '@/construction/model/results'
import { createExtrudedPolygon } from '@/construction/model/shapes'
import { createTag } from '@/construction/model/tags'
import {
  Bounds3D,
  type Length,
  type Polygon2D,
  type PolygonWithHoles2D,
  dotVec2,
  fromTrans,
  newVec2,
  newVec3,
  offsetPolygon,
  subtractPolygons
} from '@/shared/geometry'

import type { InteriorWallAssembly } from './types'

export class MonolithicInteriorWallAssembly implements InteriorWallAssembly {
  private readonly config: MonolithicWallAssemblyConfig

  constructor(config: MonolithicWallAssemblyConfig) {
    this.config = config
  }

  construct(wall: IntermediateWallWithGeometry, storeyContext: StoreyContext): ConstructionModel {
    const faceThickness = resolveLayerSetThickness(this.config.layerSetId)
    const coreThickness = wall.thickness - faceThickness * 2

    const height = storeyContext.ceilingConstructionBottom - storeyContext.floorConstructionTop
    const layerDirection = wall.direction
    const openingHoles = wall.entityIds
      .filter(isOpeningId)
      .map(id => getModelActions().getWallOpeningById(id))
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
    const extension = computeWallExtension(wall)
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
      const polygon: PolygonWithHoles2D = {
        outer: {
          points: [newVec2(0, 0), newVec2(wall.wallLength, 0), newVec2(wall.wallLength, height), newVec2(0, height)]
        },
        holes: openingHoles
      }
      layerResults.push(...runLayerConstruction(polygon, -wall.thickness / 2 + offset, 'xz', layer, layerDirection))
      layerResults.push(
        ...runLayerConstruction(polygon, wall.thickness / 2 - faceThickness + offset, 'xz', layer, layerDirection)
      )
    }
    assignDeterministicIdsToResults(layerResults, wall.id)
    const aggregated = aggregateResults(layerResults)
    return {
      elements: [core, ...aggregated.elements],
      measurements: aggregated.measurements,
      areas: aggregated.areas,
      errors: aggregated.errors,
      warnings: aggregated.warnings,
      bounds: Bounds3D.merge(core.bounds, ...aggregated.elements.map(element => element.bounds))
    }
  }

  get tags() {
    const nameKey = this.config.nameKey
    return [
      createTag('wall-assembly', this.config.id, nameKey != null ? t => t(nameKey, { ns: 'config' }) : this.config.name)
    ]
  }
}

export function computeWallExtension(wall: IntermediateWallWithGeometry) {
  const { getWallNodeById, getIntermediateWallById, getPerimeterWallById } = getModelActions()
  const startNode = getWallNodeById(wall.start.nodeId)
  const constructStart = startNode.type === 'inner' && startNode.constructedBy === wall.id
  let startExtension: Length
  let startClipPolygon: Polygon2D | undefined
  if (constructStart) {
    const baseProjection = dotVec2(wall.entityReferenceLine.start, wall.direction)
    const extensionProjection = Math.min(
      ...startNode.incidentWalls.flatMap(w => [
        dotVec2(w.leftPoint, wall.direction),
        dotVec2(w.rightPoint, wall.direction)
      ])
    )
    startExtension = baseProjection - extensionProjection // TODO: Properly account for layer thickness
    startClipPolygon = startNode.boundary
      ? subtractPolygons([offsetPolygon(startNode.boundary, wall.thickness)], [startNode.boundary, wall.boundary])[0]
          .outer
      : undefined // TODO: Properly account for layer thickness
  } else {
    const baseProjection = dotVec2(wall.entityReferenceLine.start, wall.direction)
    const leftProjection = dotVec2(wall.leftLine.start, wall.direction)
    const rightProjection = dotVec2(wall.rightLine.start, wall.direction)
    startExtension = baseProjection - Math.min(leftProjection, rightProjection) // TODO: Properly account for layer thickness

    if (startNode.type === 'inner') {
      if (startNode.constructedBy) {
        const constructingWall = getIntermediateWallById(startNode.constructedBy)
        startClipPolygon = constructingWall.boundary // TODO: Properly account for layer thickness
      }
    } else {
      const constructingWall = getPerimeterWallById(startNode.wallId)
      startClipPolygon = constructingWall.polygon // TODO: Properly account for layer thickness
    }
  }

  const endNode = getWallNodeById(wall.end.nodeId)
  const constructEnd = endNode.type === 'inner' && endNode.constructedBy === wall.id
  let endExtension: Length
  let endClipPolygon: Polygon2D | undefined
  if (constructEnd) {
    const baseProjection = dotVec2(wall.entityReferenceLine.end, wall.direction)
    const extensionProjection = Math.max(
      ...endNode.incidentWalls.flatMap(w => [
        dotVec2(w.leftPoint, wall.direction),
        dotVec2(w.rightPoint, wall.direction)
      ])
    ) // TODO: Properly account for layer thickness
    endExtension = extensionProjection - baseProjection
    endClipPolygon = endNode.boundary
      ? subtractPolygons([offsetPolygon(endNode.boundary, wall.thickness)], [endNode.boundary, wall.boundary])[0].outer
      : undefined // TODO: Properly account for layer thickness
  } else {
    const baseProjection = dotVec2(wall.entityReferenceLine.end, wall.direction)
    const leftProjection = dotVec2(wall.leftLine.end, wall.direction)
    const rightProjection = dotVec2(wall.rightLine.end, wall.direction)
    endExtension = Math.max(leftProjection, rightProjection) - baseProjection // TODO: Properly account for layer thickness

    if (endNode.type === 'inner') {
      if (endNode.constructedBy) {
        const constructingWall = getIntermediateWallById(endNode.constructedBy)
        endClipPolygon = constructingWall.boundary // TODO: Properly account for layer thickness
      }
    } else {
      const constructingWall = getPerimeterWallById(endNode.wallId)
      endClipPolygon = constructingWall.polygon // TODO: Properly account for layer thickness
    }
  }

  return { startExtension, startClipPolygon, endExtension, endClipPolygon }
}
