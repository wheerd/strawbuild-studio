import { type IntermediateWallWithGeometry, isOpeningId } from '@/building/model'
import { getModelActions } from '@/building/store'
import { resolveLayerSetLayers, resolveLayerSetThickness } from '@/config/store'
import type { InteriorWallAssemblyConfig } from '@/config/types'
import { runLayerConstruction } from '@/construction/assemblies/walls/layers'
import type { StoreyContext } from '@/construction/context/storeys'
import { createConstructionElement } from '@/construction/model/elements'
import type { ConstructionModel } from '@/construction/model/model'
import { aggregateResults, assignDeterministicIdsToResults } from '@/construction/model/results'
import type { ConstructionResult } from '@/construction/model/results'
import { createExtrudedPolygon } from '@/construction/model/shapes'
import { createTag } from '@/construction/model/tags'
import { Bounds3D, type Polygon2D, type PolygonWithHoles2D, fromTrans, newVec2, newVec3 } from '@/shared/geometry'

import type { InteriorWallAssembly } from './types'

const emptyModel = (): ConstructionModel => ({
  elements: [],
  measurements: [],
  areas: [],
  errors: [],
  warnings: [],
  bounds: Bounds3D.EMPTY
})

export function resolveInteriorWallAssembly(config: InteriorWallAssemblyConfig): InteriorWallAssembly {
  if (config.type !== 'monolithic') return new EmptyInteriorWallAssembly(config)
  return new MonolithicInteriorWallAssembly(config)
}

class EmptyInteriorWallAssembly implements InteriorWallAssembly {
  private readonly config: InteriorWallAssemblyConfig

  constructor(config: InteriorWallAssemblyConfig) {
    this.config = config
  }

  construct(): ConstructionModel {
    return emptyModel()
  }

  get tag() {
    return createTag('wall-assembly', this.config.id, this.config.name)
  }
}

class MonolithicInteriorWallAssembly implements InteriorWallAssembly {
  private readonly config: Extract<InteriorWallAssemblyConfig, { type: 'monolithic' }>

  constructor(config: Extract<InteriorWallAssemblyConfig, { type: 'monolithic' }>) {
    this.config = config
  }

  construct(wall: IntermediateWallWithGeometry, storeyContext: StoreyContext): ConstructionModel {
    const faceThickness = resolveLayerSetThickness(this.config.layerSetId)
    const coreThickness = wall.thickness - faceThickness * 2
    if (coreThickness <= 0) return emptyModel()

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
    const corePolygon: PolygonWithHoles2D = {
      outer: {
        points: [newVec2(0, 0), newVec2(wall.wallLength, 0), newVec2(wall.wallLength, height), newVec2(0, height)]
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

  get tag() {
    return createTag('wall-assembly', this.config.id, this.config.name)
  }
}
