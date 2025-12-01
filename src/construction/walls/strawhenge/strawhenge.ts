import type { Perimeter, PerimeterWall } from '@/building/model/model'
import { WallConstructionArea } from '@/construction/geometry'
import { constructStraw } from '@/construction/materials/straw'
import type { ConstructionModel } from '@/construction/model'
import { mergeModels } from '@/construction/model'
import { constructOpeningFrame } from '@/construction/openings/openings'
import type { ConstructionResult } from '@/construction/results'
import { aggregateResults } from '@/construction/results'
import type { StrawhengeWallConfig, WallAssembly } from '@/construction/walls'
import { infillWallArea } from '@/construction/walls/infill/infill'
import { constructWallLayers } from '@/construction/walls/layers'
import { type WallStoreyContext, segmentedWallConstruction } from '@/construction/walls/segmentation'
import { Bounds3D, type Length } from '@/shared/geometry'

import { constructModule } from './modules'

function getStrawWidth(availableWidth: Length, config: StrawhengeWallConfig): Length {
  const { module, infill } = config
  const oneModule = module.width
  const maxFilling = infill.maxPostSpacing
  const minFilling = infill.minStrawSpace
  const moduleAndFullFilling = oneModule + maxFilling
  const moduleAndMinFilling = oneModule + minFilling

  if (availableWidth < oneModule) {
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
  area: WallConstructionArea,
  config: StrawhengeWallConfig,
  atStart: boolean
): Generator<ConstructionResult> {
  const { size } = area
  const strawWidth = getStrawWidth(size[0], config)
  const { module } = config

  if (strawWidth > 0) {
    if (strawWidth < config.infill.minStrawSpace) {
      yield* infillWallArea(area, config.infill, false, false, atStart)
      return
    }
    const strawArea = area.withXAdjustment(atStart ? 0 : size[0] - strawWidth, strawWidth)
    yield* constructStraw(strawArea, config.infill.strawMaterial)
  }

  if (strawWidth + module.width <= size[0]) {
    const moduleArea = area.withXAdjustment(atStart ? strawWidth : size[0] - strawWidth - module.width, module.width)
    yield* constructModule(moduleArea, module)

    const remainingArea = atStart
      ? area.withXAdjustment(strawWidth + module.width)
      : area.withXAdjustment(0, size[0] - strawWidth - module.width)
    yield* placeStrawhengeSegments(remainingArea, config, !atStart)
  }
}

export function* strawhengeWallArea(
  area: WallConstructionArea,
  config: StrawhengeWallConfig,
  startsWithStand = false,
  endsWithStand = false,
  startAtEnd = false
): Generator<ConstructionResult> {
  const { size } = area
  const { module, infill } = config
  const oneModule = module.width
  const twoModules = 2 * module.width + infill.minStrawSpace
  const moduleAndMinFilling = module.width + infill.minStrawSpace
  const postWidth = infill.posts.width

  // Check if strawhenge is possible
  if (size[0] < oneModule) {
    yield* infillWallArea(area, infill, startsWithStand, endsWithStand, startAtEnd)
    return
  }

  if (size[0] === oneModule) {
    yield* constructModule(area, module)
    return
  }

  if (size[0] < moduleAndMinFilling + postWidth) {
    yield* infillWallArea(area, infill, startsWithStand, endsWithStand, startAtEnd)
    return
  }

  if (startsWithStand && endsWithStand && size[0] < twoModules) {
    // Single module plus remaining space
    if (startAtEnd) {
      const [infillArea, moduleArea] = area.splitInX(size[0] - oneModule)
      yield* infillWallArea(infillArea, infill, true, false, false)
      yield* constructModule(moduleArea, module)
    } else {
      const [moduleArea, infillArea] = area.splitInX(oneModule)
      yield* constructModule(moduleArea, module)
      yield* infillWallArea(infillArea, infill, false, true, true)
    }
    return
  }

  let inbetweenArea = area

  // Place start module if starts with stand
  if (startsWithStand) {
    const [moduleArea, remainingArea] = inbetweenArea.splitInX(oneModule)
    inbetweenArea = remainingArea
    yield* constructModule(moduleArea, module)
  }

  // Place end module if ends with stand
  if (endsWithStand) {
    const [remainingArea, moduleArea] = inbetweenArea.splitInX(inbetweenArea.size[0] - oneModule)
    inbetweenArea = remainingArea
    yield* constructModule(moduleArea, module)
  }

  // Fill the middle section recursively
  if (inbetweenArea.size[0] > 0) {
    yield* placeStrawhengeSegments(inbetweenArea, config, !startAtEnd)
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
        (area, startsWithStand, endsWithStand, startAtEnd) =>
          strawhengeWallArea(area, config, startsWithStand, endsWithStand, startAtEnd),

        (area, zOffset, openings) =>
          constructOpeningFrame(area, openings, zOffset, config.openings, a => infillWallArea(a, config.infill)),
        config.openings.padding
      )
    )

    const aggRes = aggregateResults(allResults)
    const baseModel: ConstructionModel = {
      bounds: Bounds3D.merge(...aggRes.elements.map(e => e.bounds)),
      elements: aggRes.elements,
      measurements: aggRes.measurements,
      areas: aggRes.areas,
      errors: aggRes.errors,
      warnings: aggRes.warnings
    }

    const layerModel = constructWallLayers(wall, perimeter, storeyContext, config.layers)

    return mergeModels(baseModel, layerModel)
  }
}
