import type { Perimeter, PerimeterWall } from '@/building/model/model'
import { WallConstructionArea } from '@/construction/geometry'
import { constructStraw } from '@/construction/materials/straw'
import { yieldMeasurementFromArea } from '@/construction/measurements'
import type { ConstructionModel } from '@/construction/model'
import { mergeModels } from '@/construction/model'
import type { ConstructionResult } from '@/construction/results'
import { aggregateResults } from '@/construction/results'
import type { StoreyContext } from '@/construction/storeys/context'
import { TAG_POST_SPACING, TAG_STRAWHENGE_CONSTRUCTION } from '@/construction/tags'
import type { StrawhengeWallConfig } from '@/construction/walls'
import { BaseWallAssembly } from '@/construction/walls/base'
import { infillWallArea } from '@/construction/walls/infill/infill'
import { constructWallLayers } from '@/construction/walls/layers'
import { segmentedWallConstruction } from '@/construction/walls/segmentation'
import { Bounds3D, type Length } from '@/shared/geometry'

import { constructModule } from './modules'

function getStrawWidth(availableWidth: Length, config: StrawhengeWallConfig): Length {
  const { module, infill } = config
  const oneMinModule = module.minWidth
  const oneFullModule = module.maxWidth
  const maxFilling = infill.maxPostSpacing
  const desiredFilling = infill.desiredPostSpacing
  const minFilling = infill.minStrawSpace
  const moduleAndFullFilling = oneFullModule + maxFilling
  const moduleAndMinFilling = oneFullModule + minFilling

  if (availableWidth < oneMinModule) {
    return availableWidth
  } else if (availableWidth >= oneMinModule && availableWidth <= oneFullModule) {
    return 0
  } else if (availableWidth < moduleAndFullFilling + minFilling && availableWidth > moduleAndFullFilling) {
    return availableWidth - moduleAndMinFilling
  } else if (availableWidth < moduleAndFullFilling) {
    return availableWidth - oneFullModule
  } else if (availableWidth <= maxFilling) {
    return availableWidth
  } else {
    return desiredFilling
  }
}

function* placeStrawhengeSegments(
  area: WallConstructionArea,
  config: StrawhengeWallConfig,
  atStart: boolean
): Generator<ConstructionResult> {
  const strawWidth = getStrawWidth(area.size[0], config)
  const { module } = config

  let strawArea, restArea, moduleArea, remainingArea
  if (atStart) {
    ;[strawArea, restArea] = area.splitInX(strawWidth)
    ;[moduleArea, remainingArea] = restArea.splitInX(module.maxWidth)
  } else {
    ;[restArea, strawArea] = area.splitInX(area.size[0] - strawWidth)
    ;[remainingArea, moduleArea] = restArea.splitInX(restArea.size[0] - module.maxWidth)
  }

  if (!strawArea.isEmpty) {
    if (strawArea.size[0] < config.infill.minStrawSpace) {
      yield* infillWallArea(area, config.infill, false, false, atStart)
      return
    }
    yield* constructStraw(strawArea, config.infill.strawMaterial)
    yield* yieldMeasurementFromArea(strawArea, 'width', [TAG_POST_SPACING])
  }

  if (!moduleArea.isEmpty) {
    yield* constructModule(moduleArea, module, config.infill.infillMaterial ?? config.infill.strawMaterial)
  }

  if (!remainingArea.isEmpty) {
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
  const twoModules = 2 * module.maxWidth + infill.minStrawSpace
  const moduleAndMinFilling = module.minWidth + infill.minStrawSpace
  const postWidth = infill.posts.width
  const infillMaterial = config.infill.infillMaterial ?? config.infill.strawMaterial

  // No space for a module -> fallback to infill
  if (size[0] < module.minWidth) {
    yield* infillWallArea(area, infill, startsWithStand, endsWithStand, startAtEnd)
    return
  }

  // Single module
  if (size[0] >= module.minWidth && size[0] <= module.maxWidth) {
    yield* constructModule(area, module, infillMaterial)
    return
  }

  // Not enough space for module + minmal infill -> fallback to infill
  if (size[0] < moduleAndMinFilling + postWidth) {
    yield* infillWallArea(area, infill, startsWithStand, endsWithStand, startAtEnd)
    return
  }

  // Need stands at both ends, but not enough space for two modules + minimal infill
  // -> Fit either two modules without gap or one module + infill
  const bothStands = startsWithStand && endsWithStand
  if (bothStands && size[0] !== 2 * module.minWidth && size[0] < twoModules) {
    if (startAtEnd) {
      // Single module plus remaining space
      const [infillArea, moduleArea] = area.splitInX(size[0] - module.minWidth)
      yield* infillWallArea(infillArea, infill, true, false, false)
      yield* constructModule(moduleArea, module, infillMaterial)
    } else {
      // Single module plus remaining space
      const [moduleArea, infillArea] = area.splitInX(module.minWidth)
      yield* constructModule(moduleArea, module, infillMaterial)
      yield* infillWallArea(infillArea, infill, false, true, true)
    }
    return
  }

  let inbetweenArea = area
  const oneModule = Math.min(module.maxWidth, size[0] - infill.minStrawSpace)

  // Place start module if starts with stand
  if (startsWithStand) {
    const [moduleArea, remainingArea] = inbetweenArea.splitInX(oneModule)
    inbetweenArea = remainingArea
    yield* constructModule(moduleArea, module, infillMaterial)
  }

  // Place end module if ends with stand
  if (endsWithStand) {
    const [remainingArea, moduleArea] = inbetweenArea.splitInX(inbetweenArea.size[0] - oneModule)
    inbetweenArea = remainingArea
    yield* constructModule(moduleArea, module, infillMaterial)
  }

  // Fill the middle section recursively
  if (inbetweenArea.size[0] > 0) {
    yield* placeStrawhengeSegments(inbetweenArea, config, !startAtEnd)
  }
}

export class StrawhengeWallAssembly extends BaseWallAssembly<StrawhengeWallConfig> {
  construct(wall: PerimeterWall, perimeter: Perimeter, storeyContext: StoreyContext): ConstructionModel {
    const allResults = Array.from(
      segmentedWallConstruction(
        wall,
        perimeter,
        storeyContext,
        this.config.layers,
        (area, startsWithStand, endsWithStand, startAtEnd) =>
          strawhengeWallArea(area, this.config, startsWithStand, endsWithStand, startAtEnd),
        area => infillWallArea(area, this.config.infill),
        this.config.openingAssemblyId
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

    const layerModel = constructWallLayers(wall, perimeter, storeyContext, this.config.layers)

    return mergeModels(baseModel, layerModel)
  }

  readonly tag = TAG_STRAWHENGE_CONSTRUCTION
}
