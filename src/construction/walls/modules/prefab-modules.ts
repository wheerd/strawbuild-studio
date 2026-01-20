import type { PerimeterWallWithGeometry } from '@/building/model'
import { type ConstructionElement, createConstructionElement } from '@/construction/elements'
import { WallConstructionArea } from '@/construction/geometry'
import type { PrefabMaterial } from '@/construction/materials/material'
import { getMaterialsActions } from '@/construction/materials/store'
import type { ConstructionModel } from '@/construction/model'
import { mergeModels } from '@/construction/model'
import type { ConstructionResult } from '@/construction/results'
import { resultsToModel, yieldElement, yieldError } from '@/construction/results'
import { createCuboid, createElementFromArea } from '@/construction/shapes'
import type { StoreyContext } from '@/construction/storeys/context'
import { TAG_INFILL_CONSTRUCTION, TAG_MODULE } from '@/construction/tags'
import type { PrefabModulesWallConfig } from '@/construction/walls'
import { BaseWallAssembly } from '@/construction/walls/base'
import { constructWallLayers } from '@/construction/walls/layers'
import { segmentedWallConstruction } from '@/construction/walls/segmentation'
import { type Vec3, addVec3, composeTransform, fromRot, fromTrans, newVec3 } from '@/shared/geometry'

export class PrefabModulesWallAssembly extends BaseWallAssembly<PrefabModulesWallConfig> {
  construct(wall: PerimeterWallWithGeometry, storeyContext: StoreyContext): ConstructionModel {
    const allResults = Array.from(
      segmentedWallConstruction(
        wall,
        storeyContext,
        this.config.layers,
        this.moduleWallArea.bind(this),
        this.moduleSubWallArea.bind(this),
        this.config.openingAssemblyId,
        false
      )
    )

    const baseModel = resultsToModel(allResults)
    const layerModel = constructWallLayers(wall, storeyContext, this.config.layers)

    return mergeModels(baseModel, layerModel)
  }

  private *moduleWallArea(
    area: WallConstructionArea,
    _startsWithStand = false,
    _endsWithStand = false,
    startAtEnd = false
  ): Generator<ConstructionResult> {
    const { getMaterialById } = getMaterialsActions()
    const { defaultMaterial, inclinedMaterial, targetWidth, maxWidth, preferEqualWidths } = this.config
    const width = area.size[0]
    const height = area.size[2]

    const standardModule = getMaterialById(defaultMaterial)
    if (standardModule?.type !== 'prefab') {
      throw new Error(`Invalid default material for prefab module: ${defaultMaterial}`)
    }

    let usedModule = standardModule

    if (!area.isFlat) {
      const inclinedModule = getMaterialById(inclinedMaterial)
      if (inclinedModule?.type !== 'prefab') {
        throw new Error(`Invalid inclined material for prefab module: ${inclinedMaterial}`)
      }

      const topOffsets = area.topOffsets ?? []
      if (topOffsets.length > 2) {
        const [a, b] = area.splitInX(topOffsets[1][0])
        yield* this.moduleWallArea(a)
        yield* this.moduleWallArea(b)
        return
      }

      if (topOffsets[0][1] !== topOffsets[1][1]) {
        usedModule = inclinedModule
      }
    }

    if (width < usedModule.minWidth || height < usedModule.minHeight) {
      return yield* this.fallback(area)
    }

    if (preferEqualWidths) {
      const minCount = Math.ceil(width / Math.min(usedModule.maxWidth, maxWidth))
      const maxCount = Math.floor(width / usedModule.minWidth)
      const desiredCount = Math.round(width / targetWidth)
      const moduleCount = Math.min(Math.max(desiredCount, minCount), maxCount)
      const moduleWidth = width / moduleCount
      for (let i = 0; i < moduleCount; i++) {
        const moduleArea = area.withXAdjustment(i * moduleWidth, moduleWidth)
        yield* yieldElement(
          createElementFromArea(moduleArea, usedModule.id, [TAG_MODULE], { type: 'module', subtype: 'standard' })
        )
      }
    } else {
      let remainingArea = area
      while (remainingArea.size[0] >= targetWidth) {
        const [a, b] = remainingArea.splitInX(startAtEnd ? remainingArea.size[0] - targetWidth : targetWidth)
        remainingArea = startAtEnd ? a : b
        const moduleArea = startAtEnd ? b : a
        yield* yieldElement(
          createElementFromArea(moduleArea, usedModule.id, [TAG_MODULE], { type: 'module', subtype: 'standard' })
        )
      }
      if (remainingArea.size[0] > 0) {
        yield* yieldElement(
          createElementFromArea(remainingArea, usedModule.id, [TAG_MODULE], { type: 'module', subtype: 'standard' })
        )
      }
    }
  }

  private *fallback(area: WallConstructionArea) {
    const { getMaterialById } = getMaterialsActions()
    const { fallbackMaterial } = this.config
    const width = area.size[0]
    const height = area.size[2]

    const fallbackModule = getMaterialById(fallbackMaterial)
    if (fallbackModule?.type !== 'prefab') {
      throw new Error(`Invalid fallback material for prefab module: ${fallbackMaterial}`)
    }

    const shouldFlip =
      (width < fallbackModule.minWidth &&
        width >= fallbackModule.minHeight &&
        height >= fallbackModule.minWidth &&
        height <= fallbackModule.maxWidth) ||
      (height < fallbackModule.minHeight &&
        height >= fallbackModule.minWidth &&
        width >= fallbackModule.minHeight &&
        width <= fallbackModule.maxHeight)

    if (shouldFlip && area.minHeight === area.size[2]) {
      const flippedSize = newVec3(area.size[2], area.size[1], area.size[0])
      const shape = createCuboid(flippedSize)
      const rot = fromRot(Math.PI / 2, newVec3(0, -1, 0))
      const trans = fromTrans(addVec3(area.position, newVec3(area.size[0], 0, 0)))
      const transform = composeTransform(trans, rot)
      const element = createConstructionElement(fallbackMaterial, shape, transform, [TAG_MODULE], {
        type: 'module',
        subtype: 'fallback'
      })
      return yield* this.yieldWithValidation(element, fallbackModule, flippedSize)
    }

    const element = createElementFromArea(area, fallbackMaterial, [TAG_MODULE], { type: 'module', subtype: 'fallback' })

    if (element) {
      return yield* this.yieldWithValidation(element, fallbackModule, area.size)
    }
  }

  private *yieldWithValidation(element: ConstructionElement, fallbackModule: PrefabMaterial, size: Vec3) {
    yield* yieldElement(element)
    const width = size[0]
    const thickness = size[1]
    const height = size[2]
    if (width < fallbackModule.minHeight || height < fallbackModule.minWidth) {
      yield yieldError($ => $.construction.prefabModules.tooSmall, undefined, [element])
    }
    if (thickness < fallbackModule.minThickness) {
      yield yieldError($ => $.construction.prefabModules.tooThin, undefined, [element], 'prefab-too-thin')
    }
  }

  private *moduleSubWallArea(_area: WallConstructionArea, _type: 'lintel' | 'sill'): Generator<ConstructionResult> {
    yield* []
  }

  readonly tag = TAG_INFILL_CONSTRUCTION
}
