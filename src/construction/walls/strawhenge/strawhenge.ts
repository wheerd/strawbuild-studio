import { vec3 } from 'gl-matrix'

import type { Opening, Perimeter, PerimeterWall } from '@/building/model/model'
import { constructStraw } from '@/construction/materials/straw'
import type { ConstructionModel } from '@/construction/model'
import { constructOpeningFrame } from '@/construction/openings/openings'
import type { ConstructionResult } from '@/construction/results'
import { aggregateResults } from '@/construction/results'
import type { StrawhengeWallConfig, WallAssembly } from '@/construction/walls'
import { infillWallArea } from '@/construction/walls/infill/infill'
import { type WallStoreyContext, segmentedWallConstruction } from '@/construction/walls/segmentation'
import { type Length, mergeBounds } from '@/shared/geometry'

import { constructModule } from './modules'

function getStrawWidth(availableWidth: Length, config: StrawhengeWallConfig): Length {
  const { module, infill } = config
  const oneModule = module.width
  const maxFilling = infill.maxPostSpacing
  const minFilling = infill.minStrawSpace
  const moduleAndFullFilling = oneModule + maxFilling
  const moduleAndMinFilling = oneModule + minFilling

  if (availableWidth <= maxFilling) {
    return availableWidth
  } else if (availableWidth === oneModule) {
    return 0
  } else if (availableWidth < moduleAndFullFilling + minFilling && availableWidth > moduleAndFullFilling) {
    return availableWidth - moduleAndMinFilling
  } else if (availableWidth < moduleAndFullFilling) {
    return availableWidth - oneModule
  } else {
    return maxFilling
  }
}

function* placeStrawhengeSegments(
  position: vec3,
  size: vec3,
  config: StrawhengeWallConfig,
  atStart: boolean
): Generator<ConstructionResult> {
  const strawWidth = getStrawWidth(size[0], config)
  const { module } = config

  const strawPosition = vec3.fromValues(
    atStart ? position[0] : position[0] + size[0] - strawWidth,
    position[1],
    position[2]
  )
  const strawSize = vec3.fromValues(strawWidth, size[1], size[2])

  if (strawWidth > 0) {
    if (strawWidth < config.infill.minStrawSpace) {
      yield* infillWallArea(position, size, config.infill, false, false, atStart)
      return
    }
    yield* constructStraw(strawPosition, strawSize)
  }

  if (strawWidth + module.width <= size[0]) {
    const modulePosition: vec3 = [
      atStart ? strawPosition[0] + strawSize[0] : strawPosition[0] - module.width,
      position[1],
      position[2]
    ]
    const moduleSize = vec3.fromValues(module.width, size[1], size[2])

    yield* constructModule(modulePosition, moduleSize, module)

    const remainingPosition = vec3.fromValues(
      atStart ? modulePosition[0] + module.width : position[0],
      position[1],
      position[2]
    )
    const remainingSize = vec3.fromValues(size[0] - strawSize[0] - module.width, size[1], size[2])

    yield* placeStrawhengeSegments(remainingPosition, remainingSize, config, !atStart)
  }
}

export function* strawhengeWallArea(
  position: vec3,
  size: vec3,
  config: StrawhengeWallConfig,
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
    yield* constructModule(position, size, module)
    return
  }

  if (size[0] < moduleAndMinFilling + postWidth) {
    yield* infillWallArea(position, size, infill, startsWithStand, endsWithStand, startAtEnd)
    return
  }

  if (startsWithStand && endsWithStand && size[0] < twoModules) {
    // Single module plus remaining space
    if (startAtEnd) {
      const modulePosition = vec3.fromValues(position[0] + size[0] - oneModule, position[1], position[2])
      const moduleSize = vec3.fromValues(oneModule, size[1], size[2])
      const remainingPosition: vec3 = position
      const remainingSize = vec3.fromValues(size[0] - oneModule, size[1], size[2])

      yield* infillWallArea(remainingPosition, remainingSize, infill, true, false, false)
      yield* constructModule(modulePosition, moduleSize, module)
    } else {
      const modulePosition: vec3 = position
      const moduleSize = vec3.fromValues(oneModule, size[1], size[2])
      const remainingPosition = vec3.fromValues(position[0] + oneModule, position[1], position[2])
      const remainingSize = vec3.fromValues(size[0] - oneModule, size[1], size[2])

      yield* constructModule(modulePosition, moduleSize, module)
      yield* infillWallArea(remainingPosition, remainingSize, infill, false, true, true)
    }
    return
  }

  let left = position[0]
  let width = size[0]

  // Place start module if starts with stand
  if (startsWithStand) {
    const modulePosition = vec3.fromValues(left, position[1], position[2])
    const moduleSize = vec3.fromValues(oneModule, size[1], size[2])
    yield* constructModule(modulePosition, moduleSize, module)
    left += oneModule
    width -= oneModule
  }

  // Place end module if ends with stand
  if (endsWithStand) {
    const modulePosition = vec3.fromValues(position[0] + size[0] - oneModule, position[1], position[2])
    const moduleSize = vec3.fromValues(oneModule, size[1], size[2])
    yield* constructModule(modulePosition, moduleSize, module)
    width -= oneModule
  }

  // Fill the middle section recursively
  if (width > 0) {
    const middlePosition = vec3.fromValues(left, position[1], position[2])
    const middleSize = vec3.fromValues(width, size[1], size[2])
    yield* placeStrawhengeSegments(middlePosition, middleSize, config, !startAtEnd)
  }
}

export class StrawhengeWallAssembly implements WallAssembly<StrawhengeWallConfig> {
  construct(
    wall: PerimeterWall,
    perimeter: Perimeter,
    storeyContext: WallStoreyContext,
    config: StrawhengeWallConfig
  ): ConstructionModel {
    const allResults = Array.from(
      segmentedWallConstruction(
        wall,
        perimeter,
        storeyContext,
        config.layers,
        (position, size, startsWithStand, endsWithStand, startAtEnd) =>
          strawhengeWallArea(position, size, config, startsWithStand, endsWithStand, startAtEnd),

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
