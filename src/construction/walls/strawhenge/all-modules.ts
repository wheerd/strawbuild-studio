import type { Opening, Perimeter, PerimeterWall } from '@/building/model/model'
import type { WallLayersConfig } from '@/construction/config/types'
import type { ConstructionModel } from '@/construction/model'
import { constructOpeningFrame } from '@/construction/openings/openings'
import type { ConstructionResult } from '@/construction/results'
import { aggregateResults, yieldAsGroup } from '@/construction/results'
import { TAG_MODULE } from '@/construction/tags'
import type { BaseConstructionConfig, PerimeterWallConstructionMethod } from '@/construction/walls/construction'
import { type InfillConstructionConfig, infillWallArea } from '@/construction/walls/infill/infill'
import { segmentedWallConstruction } from '@/construction/walls/segmentation'
import { type Length, type Vec3, mergeBounds } from '@/shared/geometry'

import { type ModuleConfig, constructModule } from './modules'

export interface ModulesConstructionConfig extends BaseConstructionConfig {
  type: 'modules'
  module: ModuleConfig
  infill: InfillConstructionConfig
}

export function* moduleWallArea(
  position: Vec3,
  size: Vec3,
  config: ModulesConstructionConfig,
  startsWithStand = false,
  endsWithStand = false,
  startAtEnd = false
): Generator<ConstructionResult> {
  const { module, infill } = config

  if (size[0] < module.width) {
    yield* infillWallArea(position, size, infill, startsWithStand, endsWithStand, startAtEnd)
    return
  }

  const moduleSize: Vec3 = [module.width, size[1], size[2]]
  const remainingWidth = size[0] % module.width
  const start = position[0] + (startAtEnd ? remainingWidth : 0)
  const end = position[0] + size[0] - (startAtEnd ? 0 : remainingWidth)
  for (let x = start; x < end; x += module.width) {
    const modulePosition: Vec3 = [x, position[1], position[2]]
    yield* yieldAsGroup(constructModule(modulePosition, moduleSize, module), [TAG_MODULE])
  }
  if (remainingWidth > 0) {
    const remainingPosition: Vec3 = [startAtEnd ? position[0] : end, position[1], position[2]]
    const remainingSize: Vec3 = [remainingWidth, size[1], size[2]]
    yield* infillWallArea(remainingPosition, remainingSize, infill, startsWithStand, endsWithStand, startAtEnd)
  }
}

const _constructModuleWall = (
  wall: PerimeterWall,
  perimeter: Perimeter,
  floorHeight: Length,
  config: ModulesConstructionConfig,
  layers: WallLayersConfig
): Generator<ConstructionResult> =>
  segmentedWallConstruction(
    wall,
    perimeter,
    floorHeight,
    layers,
    (position, size, startsWithStand, endsWithStand, startAtEnd) =>
      moduleWallArea(position, size, config, startsWithStand, endsWithStand, startAtEnd),

    (position: Vec3, size: Vec3, zOffset: Length, openings: Opening[]) =>
      constructOpeningFrame({ type: 'opening', position, size, zOffset, openings }, config.openings, config.infill)
  )

export const constructModuleWall: PerimeterWallConstructionMethod<ModulesConstructionConfig> = (
  wall: PerimeterWall,
  perimeter: Perimeter,
  floorHeight: Length,
  config: ModulesConstructionConfig,
  layers: WallLayersConfig
): ConstructionModel => {
  const allResults = Array.from(_constructModuleWall(wall, perimeter, floorHeight, config, layers))

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
