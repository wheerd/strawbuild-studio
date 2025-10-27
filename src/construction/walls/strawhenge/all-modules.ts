import { vec3 } from 'gl-matrix'

import type { Opening, Perimeter, PerimeterWall } from '@/building/model/model'
import type { ConstructionModel } from '@/construction/model'
import { constructOpeningFrame } from '@/construction/openings/openings'
import type { ConstructionResult } from '@/construction/results'
import { aggregateResults } from '@/construction/results'
import type { ModulesWallConfig, WallAssembly } from '@/construction/walls'
import { infillWallArea } from '@/construction/walls/infill/infill'
import { type WallStoreyContext, segmentedWallConstruction } from '@/construction/walls/segmentation'
import { type Length, mergeBounds } from '@/shared/geometry'

import { constructModule } from './modules'

export function* moduleWallArea(
  position: vec3,
  size: vec3,
  config: ModulesWallConfig,
  startsWithStand = false,
  endsWithStand = false,
  startAtEnd = false
): Generator<ConstructionResult> {
  const { module, infill } = config

  if (size[0] < module.width) {
    yield* infillWallArea(position, size, infill, startsWithStand, endsWithStand, startAtEnd)
    return
  }

  const moduleSize = vec3.fromValues(module.width, size[1], size[2])
  const remainingWidth = size[0] % module.width
  const start = position[0] + (startAtEnd ? remainingWidth : 0)
  const end = position[0] + size[0] - (startAtEnd ? 0 : remainingWidth)
  for (let x = start; x < end; x += module.width) {
    const modulePosition = vec3.fromValues(x, position[1], position[2])
    yield* constructModule(modulePosition, moduleSize, module)
  }
  if (remainingWidth > 0) {
    const remainingPosition = vec3.fromValues(startAtEnd ? position[0] : end, position[1], position[2])
    const remainingSize = vec3.fromValues(remainingWidth, size[1], size[2])
    yield* infillWallArea(remainingPosition, remainingSize, infill, startsWithStand, endsWithStand, startAtEnd)
  }
}

export class ModulesWallAssembly implements WallAssembly<ModulesWallConfig> {
  construct(
    wall: PerimeterWall,
    perimeter: Perimeter,
    storeyContext: WallStoreyContext,
    config: ModulesWallConfig
  ): ConstructionModel {
    const allResults = Array.from(
      segmentedWallConstruction(
        wall,
        perimeter,
        storeyContext,
        config.layers,
        (position, size, startsWithStand, endsWithStand, startAtEnd) =>
          moduleWallArea(position, size, config, startsWithStand, endsWithStand, startAtEnd),

        (position: vec3, size: vec3, zOffset: Length, openings: Opening[]) =>
          constructOpeningFrame({ type: 'opening', position, size, zOffset, openings }, config.openings, (p, s) =>
            infillWallArea(p, s, config.infill)
          )
      )
    )

    const aggRes = aggregateResults(allResults)

    return {
      bounds: mergeBounds(...aggRes.elements.map(e => e.bounds)),
      elements: aggRes.elements,
      measurements: aggRes.measurements,
      areas: aggRes.areas,
      errors: aggRes.errors,
      warnings: aggRes.warnings
    }
  }
}
