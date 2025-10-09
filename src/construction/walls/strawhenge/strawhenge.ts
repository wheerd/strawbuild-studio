import type { Opening, Perimeter, PerimeterWall } from '@/building/model/model'
import type { LayersConfig } from '@/construction/config/types'
import { constructStraw } from '@/construction/materials/straw'
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

export interface StrawhengeConstructionConfig extends BaseConstructionConfig {
  type: 'strawhenge'
  module: ModuleConfig
  infill: InfillConstructionConfig
}

function getStrawWidth(availableWidth: Length, config: StrawhengeConstructionConfig): Length {
  const { module, infill } = config
  const oneModule = module.width
  const maxFilling = infill.maxPostSpacing
  const minFilling = infill.minStrawSpace
  const moduleAndFullFilling = oneModule + maxFilling
  const moduleAndMinFilling = oneModule + minFilling

  if (availableWidth <= maxFilling) {
    return availableWidth
  } else if (availableWidth === oneModule) {
    return 0 as Length
  } else if (availableWidth < moduleAndFullFilling + minFilling && availableWidth > moduleAndFullFilling) {
    return (availableWidth - moduleAndMinFilling) as Length
  } else if (availableWidth < moduleAndFullFilling) {
    return (availableWidth - oneModule) as Length
  } else {
    return maxFilling
  }
}

function* placeStrawhengeSegments(
  position: Vec3,
  size: Vec3,
  config: StrawhengeConstructionConfig,
  atStart: boolean
): Generator<ConstructionResult> {
  const strawWidth = getStrawWidth(size[0] as Length, config)
  const { module } = config

  const strawPosition: Vec3 = [atStart ? position[0] : position[0] + size[0] - strawWidth, position[1], position[2]]
  const strawSize: Vec3 = [strawWidth, size[1], size[2]]

  if (strawWidth > 0) {
    if (strawWidth < config.infill.minStrawSpace) {
      yield* infillWallArea(position, size, config.infill, false, false, atStart)
      return
    }
    yield* constructStraw(strawPosition, strawSize, config.straw)
  }

  if (strawWidth + module.width <= size[0]) {
    const modulePosition: Vec3 = [
      atStart ? strawPosition[0] + strawSize[0] : strawPosition[0] - module.width,
      position[1],
      position[2]
    ]
    const moduleSize: Vec3 = [module.width, size[1], size[2]]

    yield* yieldAsGroup(constructModule(modulePosition, moduleSize, module), [TAG_MODULE])

    const remainingPosition: Vec3 = [atStart ? modulePosition[0] + module.width : position[0], position[1], position[2]]
    const remainingSize: Vec3 = [size[0] - strawSize[0] - module.width, size[1], size[2]]

    yield* placeStrawhengeSegments(remainingPosition, remainingSize, config, !atStart)
  }
}

export function* strawhengeWallArea(
  position: Vec3,
  size: Vec3,
  config: StrawhengeConstructionConfig,
  startsWithStand = false,
  endsWithStand = false,
  startAtEnd = false
): Generator<ConstructionResult> {
  const { module, infill } = config
  const oneModule = module.width
  const twoModules = 2 * module.width + infill.minStrawSpace
  const moduleAndMinFilling = module.width + infill.minStrawSpace
  const postWidth = infill.posts.width

  // Check if strawhenge is possible
  if (size[0] < oneModule) {
    yield* infillWallArea(position, size, infill, startsWithStand, endsWithStand, startAtEnd)
    return
  }

  if (size[0] === oneModule) {
    yield* yieldAsGroup(constructModule(position, size, module), [TAG_MODULE])
    return
  }

  if (size[0] < moduleAndMinFilling + postWidth) {
    yield* infillWallArea(position, size, infill, startsWithStand, endsWithStand, startAtEnd)
    return
  }

  if (startsWithStand && endsWithStand && size[0] < twoModules) {
    // Single module plus remaining space
    if (startAtEnd) {
      const modulePosition: Vec3 = [position[0] + size[0] - oneModule, position[1], position[2]]
      const moduleSize: Vec3 = [oneModule, size[1], size[2]]
      const remainingPosition: Vec3 = position
      const remainingSize: Vec3 = [size[0] - oneModule, size[1], size[2]]

      yield* infillWallArea(remainingPosition, remainingSize, infill, true, false, false)
      yield* yieldAsGroup(constructModule(modulePosition, moduleSize, module), [TAG_MODULE])
    } else {
      const modulePosition: Vec3 = position
      const moduleSize: Vec3 = [oneModule, size[1], size[2]]
      const remainingPosition: Vec3 = [position[0] + oneModule, position[1], position[2]]
      const remainingSize: Vec3 = [size[0] - oneModule, size[1], size[2]]

      yield* yieldAsGroup(constructModule(modulePosition, moduleSize, module), [TAG_MODULE])
      yield* infillWallArea(remainingPosition, remainingSize, infill, false, true, true)
    }
    return
  }

  let left = position[0]
  let width = size[0]

  // Place start module if starts with stand
  if (startsWithStand) {
    const modulePosition: Vec3 = [left, position[1], position[2]]
    const moduleSize: Vec3 = [oneModule, size[1], size[2]]
    yield* yieldAsGroup(constructModule(modulePosition, moduleSize, module), [TAG_MODULE])
    left += oneModule
    width -= oneModule
  }

  // Place end module if ends with stand
  if (endsWithStand) {
    const modulePosition: Vec3 = [position[0] + size[0] - oneModule, position[1], position[2]]
    const moduleSize: Vec3 = [oneModule, size[1], size[2]]
    yield* yieldAsGroup(constructModule(modulePosition, moduleSize, module), [TAG_MODULE])
    width -= oneModule
  }

  // Fill the middle section recursively
  if (width > 0) {
    const middlePosition: Vec3 = [left, position[1], position[2]]
    const middleSize: Vec3 = [width, size[1], size[2]]
    yield* placeStrawhengeSegments(middlePosition, middleSize, config, !startAtEnd)
  }
}

const _constructStrawhengeWall = (
  wall: PerimeterWall,
  perimeter: Perimeter,
  floorHeight: Length,
  config: StrawhengeConstructionConfig,
  layers: LayersConfig
): Generator<ConstructionResult> =>
  segmentedWallConstruction(
    wall,
    perimeter,
    floorHeight,
    layers,
    (position, size, startsWithStand, endsWithStand, startAtEnd) =>
      strawhengeWallArea(position, size, config, startsWithStand, endsWithStand, startAtEnd),

    (position: Vec3, size: Vec3, zOffset: Length, openings: Opening[]) =>
      constructOpeningFrame({ type: 'opening', position, size, zOffset, openings }, config.openings, config.infill)
  )

export const constructStrawhengeWall: PerimeterWallConstructionMethod<StrawhengeConstructionConfig> = (
  wall: PerimeterWall,
  perimeter: Perimeter,
  floorHeight: Length,
  config: StrawhengeConstructionConfig,
  layers: LayersConfig
): ConstructionModel => {
  const allResults = Array.from(_constructStrawhengeWall(wall, perimeter, floorHeight, config, layers))

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
