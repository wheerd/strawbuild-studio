import type { PerimeterWallWithGeometry } from '@/building/model'
import { type ConstructionElement, createConstructionElement } from '@/construction/elements'
import { WallConstructionArea } from '@/construction/geometry'
import type { MaterialId, PrefabMaterial } from '@/construction/materials/material'
import { getMaterialsActions } from '@/construction/materials/store'
import { yieldMeasurementFromArea } from '@/construction/measurements'
import type { ConstructionModel } from '@/construction/model'
import { mergeModels } from '@/construction/model'
import type { ConstructionResult } from '@/construction/results'
import { resultsToModel, yieldElement, yieldError } from '@/construction/results'
import { createCuboid, createElementFromArea } from '@/construction/shapes'
import type { StoreyContext } from '@/construction/storeys/context'
import { TAG_INFILL_CONSTRUCTION, TAG_MODULE, TAG_MODULE_HEIGHT, TAG_MODULE_WIDTH } from '@/construction/tags'
import type { PrefabModulesWallConfig } from '@/construction/walls'
import { BaseWallAssembly } from '@/construction/walls/base'
import { constructWallLayers } from '@/construction/walls/layers'
import { segmentedWallConstruction } from '@/construction/walls/segmentation'
import { type Length, type Vec3, addVec3, composeTransform, fromRot, fromTrans, newVec3 } from '@/shared/geometry'

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
    const { defaultMaterial, inclinedMaterial, targetWidth, maxWidth, preferEqualWidths } = this.config
    const width = area.size[0]
    const height = area.size[2]

    const standardModule = this.getModuleMaterial(defaultMaterial)
    let module = standardModule
    let subtype = 'standard'

    if (!area.isFlat) {
      const inclinedModule = this.getModuleMaterial(inclinedMaterial)
      const topOffsets = area.topOffsets ?? []
      if (topOffsets.length > 2) {
        const [a, b] = area.splitInX(topOffsets[1][0])
        yield* this.moduleWallArea(a)
        yield* this.moduleWallArea(b)
        return
      }

      if (topOffsets[0][1] !== topOffsets[1][1]) {
        module = inclinedModule
        subtype = 'inclined'
      }
    }

    if (width < module.minWidth || height < module.minHeight) {
      return yield* this.fallback(area)
    }

    if (preferEqualWidths) {
      const minCount = Math.ceil(width / Math.min(module.maxWidth, maxWidth))
      const maxCount = Math.floor(width / module.minWidth)
      const desiredCount = Math.round(width / targetWidth)
      const moduleCount = Math.min(Math.max(desiredCount, minCount), maxCount)
      const moduleWidth = width / moduleCount
      for (let i = 0; i < moduleCount; i++) {
        const moduleArea = area.withXAdjustment(i * moduleWidth, moduleWidth)
        yield* this.yieldModule(moduleArea, module, subtype)
      }
    } else {
      let remainingArea = area
      while (remainingArea.size[0] >= targetWidth) {
        const [a, b] = remainingArea.splitInX(startAtEnd ? remainingArea.size[0] - targetWidth : targetWidth)
        remainingArea = startAtEnd ? a : b
        const moduleArea = startAtEnd ? b : a
        yield* this.yieldModule(moduleArea, module, subtype)
      }
      if (remainingArea.size[0] > 0) {
        // TODO: Proper handling with fallback
        yield* this.yieldModule(remainingArea, module, subtype)
      }
    }
  }

  private *moduleSubWallArea(area: WallConstructionArea, type: 'lintel' | 'sill'): Generator<ConstructionResult> {
    const { sillMaterial, lintelMaterial } = this.config
    const width = area.size[0]
    const height = area.size[2]

    if (type === 'sill' && sillMaterial) {
      const sillModule = this.getModuleMaterial(sillMaterial)
      if (width <= sillModule.maxWidth && height <= sillModule.maxHeight) {
        if (width < sillModule.minWidth || height < sillModule.minHeight) {
          return yield* this.fallback(area)
        }

        return yield* this.yieldModule(area, sillModule, 'sill')
      }
    }

    if (type === 'lintel' && lintelMaterial) {
      const lintelModule = this.getModuleMaterial(lintelMaterial)
      if (width <= lintelModule.maxWidth && height <= lintelModule.maxHeight) {
        if (width < lintelModule.minWidth || height < lintelModule.minHeight) {
          return yield* this.fallback(area)
        }

        return yield* this.yieldModule(area, lintelModule, 'lintel')
      }

      // TODO: Proper fallback for lintel
    }

    yield* this.moduleWallArea(area)
  }

  private *fallback(area: WallConstructionArea) {
    const { fallbackMaterial } = this.config
    const fallbackModule = this.getModuleMaterial(fallbackMaterial)
    const shouldFlip = this.shouldFlip(area.size[0], area.size[2], fallbackModule)
    if (shouldFlip && area.minHeight === area.size[2]) {
      yield* this.yieldFlippedModule(area, fallbackMaterial, fallbackModule, 'fallback')
    }

    yield* this.yieldModule(area, fallbackModule, 'fallback')
  }

  private getModuleMaterial(materialId: MaterialId) {
    const moduleMaterial = getMaterialsActions().getMaterialById(materialId)
    if (moduleMaterial?.type !== 'prefab') {
      throw new Error(`Invalid module material for prefab module: ${materialId}`)
    }
    return moduleMaterial
  }

  private *yieldFlippedModule(
    area: WallConstructionArea,
    fallbackMaterial: MaterialId,
    fallbackModule: PrefabMaterial,
    subtype: string,
    validateFlipped = true
  ) {
    const flippedSize = newVec3(area.size[2], area.size[1], area.size[0])
    const shape = createCuboid(flippedSize)
    const rot = fromRot(Math.PI / 2, newVec3(0, -1, 0))
    const trans = fromTrans(addVec3(area.position, newVec3(area.size[0], 0, 0)))
    const transform = composeTransform(trans, rot)
    const element = createConstructionElement(fallbackMaterial, shape, transform, [TAG_MODULE], {
      type: 'module',
      subtype
    })
    yield* yieldMeasurementFromArea(area, 'width', [TAG_MODULE_WIDTH])
    yield* yieldMeasurementFromArea(area, 'height', [TAG_MODULE_HEIGHT])
    yield* this.yieldWithValidation(element, fallbackModule, validateFlipped ? flippedSize : area.size)
  }

  private *yieldModule(area: WallConstructionArea, material: PrefabMaterial, subtype: string) {
    const element = createElementFromArea(area, material.id, [TAG_MODULE], { type: 'module', subtype })

    if (element) {
      yield* yieldMeasurementFromArea(area, 'width', [TAG_MODULE_WIDTH])
      yield* yieldMeasurementFromArea(area, 'height', [TAG_MODULE_HEIGHT])
      yield* this.yieldWithValidation(element, material, area.size)
    }
  }

  private shouldFlip(width: Length, height: Length, module: PrefabMaterial) {
    return (
      (width < module.minWidth &&
        width >= module.minHeight &&
        height >= module.minWidth &&
        height <= module.maxWidth) ||
      (height < module.minHeight && height >= module.minWidth && width >= module.minHeight && width <= module.maxHeight)
    )
  }

  private *yieldWithValidation(element: ConstructionElement, module: PrefabMaterial, size: Vec3) {
    yield* yieldElement(element)
    const width = size[0]
    const thickness = size[1]
    const height = size[2]
    if (width < module.minWidth || height < module.minHeight) {
      yield yieldError($ => $.construction.prefabModules.tooSmall, undefined, [element])
    }
    if (thickness < module.minThickness) {
      yield yieldError($ => $.construction.prefabModules.tooThin, undefined, [element], 'prefab-too-thin')
    }
  }

  readonly tag = TAG_INFILL_CONSTRUCTION
}
