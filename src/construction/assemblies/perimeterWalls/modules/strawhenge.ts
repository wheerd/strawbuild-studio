import type { PerimeterWallWithGeometry } from '@/building/model'
import { getConfigActions, resolveLayerSetThickness } from '@/config/store'
import { BaseWallAssembly } from '@/construction/assemblies/perimeterWalls/base'
import { infillWallArea } from '@/construction/assemblies/perimeterWalls/infill/infill'
import { type WallLayerSetIds, constructWallLayers } from '@/construction/assemblies/perimeterWalls/layers'
import { segmentedWallConstruction } from '@/construction/assemblies/perimeterWalls/segmentation'
import { constructTriangularBattens } from '@/construction/assemblies/perimeterWalls/triangularBattens'
import type { StrawhengeWallConfig } from '@/construction/assemblies/perimeterWalls/types'
import { type PhysicsSeries, materialToPhysicsSeriesItem } from '@/construction/assemblies/physics'
import { constructStraw } from '@/construction/assemblies/straw'
import { WallConstructionArea } from '@/construction/assemblies/utils/WallConstructionArea'
import type { StoreyContext } from '@/construction/context/storeys'
import type { ConstructionModel } from '@/construction/model/model'
import { mergeModels } from '@/construction/model/model'
import type { ConstructionResult } from '@/construction/model/results'
import { aggregateResults, assignDeterministicIdsToResults } from '@/construction/model/results'
import { TAG_POST_SPACING, TAG_STRAWHENGE_CONSTRUCTION } from '@/construction/model/tags'
import { getMaterialById } from '@/materials/store'
import { type ThicknessRange, addThickness, getMaterialThickness } from '@/materials/thickness'
import { Bounds3D, type Length } from '@/shared/geometry'

import { constructModule, getModulePhysicsPaths } from './modules'

export class StrawhengeWallAssembly extends BaseWallAssembly<StrawhengeWallConfig> {
  construct(wall: PerimeterWallWithGeometry, storeyContext: StoreyContext): ConstructionModel {
    const layerSetIds: WallLayerSetIds = {
      insideLayerSetId: this.config.insideLayerSetId,
      outsideLayerSetId: this.config.outsideLayerSetId
    }

    const allResults = Array.from(
      segmentedWallConstruction(
        wall,
        storeyContext,
        layerSetIds,
        this.strawhengeWallArea.bind(this),
        area => infillWallArea(area, this.config.infill),
        this.config.openingAssemblyId,
        false
      )
    )

    assignDeterministicIdsToResults(allResults, wall.id)

    const aggRes = aggregateResults(allResults)
    const baseModel: ConstructionModel = {
      bounds: Bounds3D.merge(...aggRes.elements.map(e => e.bounds)),
      elements: aggRes.elements,
      measurements: aggRes.measurements,
      areas: aggRes.areas,
      errors: aggRes.errors,
      warnings: aggRes.warnings
    }

    const layerModel = constructWallLayers(wall, storeyContext, layerSetIds)

    return mergeModels(baseModel, layerModel)
  }

  private getStrawWidth(availableWidth: Length): Length {
    const { module, infill } = this.config
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

  private *placeStrawhengeSegments(area: WallConstructionArea, atStart: boolean): Generator<ConstructionResult> {
    const strawWidth = this.getStrawWidth(area.size[0])
    const { module, infill } = this.config

    let strawArea, restArea, moduleArea, remainingArea
    if (atStart) {
      ;[strawArea, restArea] = area.splitInX(strawWidth)
      ;[moduleArea, remainingArea] = restArea.splitInX(module.maxWidth)
    } else {
      ;[restArea, strawArea] = area.splitInX(area.size[0] - strawWidth)
      ;[remainingArea, moduleArea] = restArea.splitInX(restArea.size[0] - module.maxWidth)
    }

    if (!strawArea.isEmpty) {
      if (strawArea.size[0] < infill.minStrawSpace) {
        yield* infillWallArea(area, infill, false, false, atStart)
        return
      }
      yield* constructStraw(strawArea, infill.strawMaterial)
      yield* strawArea.yieldMeasurement('width', [TAG_POST_SPACING])
      yield* constructTriangularBattens(strawArea, infill.triangularBattens)
    }

    if (!moduleArea.isEmpty) {
      yield* constructModule(moduleArea, module, infill.infillMaterial ?? infill.strawMaterial)
    }

    if (!remainingArea.isEmpty) {
      yield* this.placeStrawhengeSegments(remainingArea, !atStart)
    }
  }

  protected *strawhengeWallArea(
    area: WallConstructionArea,
    startsWithStand = false,
    endsWithStand = false,
    startAtEnd = false
  ): Generator<ConstructionResult> {
    const { size } = area
    const { module, infill } = this.config
    const twoModules = 2 * module.maxWidth + infill.minStrawSpace
    const moduleAndMinFilling = module.minWidth + infill.minStrawSpace
    const postWidth = infill.posts.width
    const infillMaterial = infill.infillMaterial ?? infill.strawMaterial

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
      yield* this.placeStrawhengeSegments(inbetweenArea, !startAtEnd)
    }
  }

  get thicknessRange(): ThicknessRange {
    const { module, infill } = this.config
    const strawMaterialId = module.strawMaterial ?? infill.strawMaterial ?? getConfigActions().getDefaultStrawMaterial()
    const strawMaterial = getMaterialById(strawMaterialId)
    const insideThickness = resolveLayerSetThickness(this.config.insideLayerSetId)
    const outsideThickness = resolveLayerSetThickness(this.config.outsideLayerSetId)
    const layerThickness = insideThickness + outsideThickness
    return addThickness(strawMaterial ? getMaterialThickness(strawMaterial) : undefined, layerThickness)
  }

  getCorePhysicsStructure(coreThickness: Length, height: Length): PhysicsSeries[] {
    const { module, infill } = this.config

    const totalWidth = module.maxWidth + infill.desiredPostSpacing
    const moduleFraction = module.maxWidth / totalWidth
    const infillFraction = infill.desiredPostSpacing / totalWidth

    const strawItem = materialToPhysicsSeriesItem(
      infill.strawMaterial ?? getConfigActions().getDefaultStrawMaterial(),
      coreThickness
    )

    return [
      ...getModulePhysicsPaths(module, moduleFraction, module.maxWidth, height, coreThickness),
      {
        items: strawItem ? [strawItem] : [],
        areaFraction: infillFraction,
        label: t => t($ => $.physics.breakdown.straw, { ns: 'config' })
      }
    ]
  }

  readonly tag = TAG_STRAWHENGE_CONSTRUCTION
}
