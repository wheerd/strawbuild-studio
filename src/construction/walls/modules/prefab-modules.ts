import type { PerimeterWallWithGeometry } from '@/building/model'
import { type ConstructionElement, createConstructionElement } from '@/construction/elements'
import { WallConstructionArea } from '@/construction/geometry'
import type { MaterialId, PrefabMaterial } from '@/construction/materials/material'
import { getMaterialsActions } from '@/construction/materials/store'
import type { ThicknessRange } from '@/construction/materials/thickness'
import { yieldMeasurementFromArea } from '@/construction/measurements'
import type { ConstructionModel } from '@/construction/model'
import { mergeModels } from '@/construction/model'
import type { ConstructionResult } from '@/construction/results'
import { assignDeterministicIdsToResults, resultsToModel, yieldElement, yieldError } from '@/construction/results'
import { createCuboid, createElementFromArea } from '@/construction/shapes'
import type { StoreyContext } from '@/construction/storeys/context'
import {
  TAG_INFILL_CONSTRUCTION,
  TAG_MODULE,
  TAG_MODULE_HEIGHT,
  TAG_MODULE_WIDTH,
  TAG_WALL_REINFORCEMENT,
  createTag
} from '@/construction/tags'
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
        this.moduleOpeningSubWallArea.bind(this),
        this.config.openingAssemblyId,
        false
      )
    )

    assignDeterministicIdsToResults(allResults, wall.id)

    const baseModel = resultsToModel(allResults)
    const layerModel = constructWallLayers(wall, storeyContext, this.config.layers)

    return mergeModels(baseModel, layerModel)
  }

  protected *moduleWallArea(
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
      }
    }

    if (width < module.minWidth || height < module.minHeight) {
      yield* this.fallback(area)
      return
    }

    if (preferEqualWidths) {
      const isTallWall = height > this.config.tallReinforceThreshold
      const reinforceThickness = isTallWall ? this.config.tallReinforceThickness : 0
      const minCount = Math.ceil(width / (Math.min(module.maxWidth, maxWidth) + reinforceThickness))
      const maxCount = Math.floor(width / (module.minWidth + reinforceThickness))
      const desiredCount = Math.round(width / (targetWidth + reinforceThickness))
      const moduleCount = Math.max(Math.min(Math.max(desiredCount, minCount), maxCount), 1)
      const availableWidth = width - reinforceThickness * (moduleCount - 1)
      const moduleWidth = availableWidth / moduleCount
      const offset = moduleWidth + reinforceThickness
      for (let i = 0; i < moduleCount; i++) {
        const moduleArea = area.withXAdjustment(i * offset, moduleWidth)
        yield* this.yieldModuleColumn(moduleArea, module, i)
        if (reinforceThickness > 0) {
          const reinforceArea = area.withXAdjustment(i * offset + moduleWidth, reinforceThickness)
          yield* yieldElement(
            createElementFromArea(reinforceArea, this.config.tallReinforceMaterial, [TAG_WALL_REINFORCEMENT], {
              type: 'reinforcement'
            })
          )
        }
      }
    } else {
      let remainingArea = area
      const isTallWall = height > this.config.tallReinforceThreshold
      const reinforceThickness = isTallWall ? this.config.tallReinforceThickness : 0
      const needed = targetWidth + reinforceThickness + module.minWidth
      let i = 0
      while (remainingArea.size[0] >= needed) {
        const [a, b] = remainingArea.splitInX(startAtEnd ? remainingArea.size[0] - targetWidth : targetWidth)
        remainingArea = startAtEnd ? a : b
        const moduleArea = startAtEnd ? b : a
        yield* this.yieldModuleColumn(moduleArea, module, i++)
        if (reinforceThickness > 0) {
          const [a, b] = remainingArea.splitInX(
            startAtEnd ? remainingArea.size[0] - reinforceThickness : reinforceThickness
          )
          remainingArea = startAtEnd ? a : b
          const reinforceArea = startAtEnd ? b : a
          yield* yieldElement(
            createElementFromArea(reinforceArea, this.config.tallReinforceMaterial, [TAG_WALL_REINFORCEMENT], {
              type: 'reinforcement'
            })
          )
        }
      }

      if (remainingArea.size[0] > module.maxWidth) {
        const moduleWidth = (remainingArea.size[0] - reinforceThickness) / 2
        const module1 = remainingArea.withXAdjustment(0, moduleWidth)
        yield* this.yieldModuleColumn(module1, module, i++)
        const module2 = remainingArea.withXAdjustment(moduleWidth + reinforceThickness)
        yield* this.yieldModuleColumn(module2, module, i++)
        if (reinforceThickness > 0) {
          const reinforceArea = remainingArea.withXAdjustment(moduleWidth, reinforceThickness)
          yield* yieldElement(
            createElementFromArea(reinforceArea, this.config.tallReinforceMaterial, [TAG_WALL_REINFORCEMENT], {
              type: 'reinforcement'
            })
          )
        }
      } else if (remainingArea.size[0] >= module.minWidth) {
        yield* this.yieldModuleColumn(remainingArea, module, i++)
      } else if (remainingArea.size[0] > 0) {
        yield* this.fallback(remainingArea)
      }
    }
  }

  protected *moduleOpeningSubWallArea(
    area: WallConstructionArea,
    type: 'lintel' | 'sill'
  ): Generator<ConstructionResult> {
    const { sillMaterial, lintelMaterial } = this.config
    const width = area.size[0]
    const height = area.size[2]

    if (type === 'sill' && sillMaterial) {
      const sillModule = this.getModuleMaterial(sillMaterial)
      if (
        width <= sillModule.maxWidth &&
        width >= sillModule.minWidth &&
        height <= sillModule.maxHeight &&
        height >= sillModule.minHeight
      ) {
        yield* this.yieldModule(area, sillModule)
        return
      }
    }

    if (type === 'lintel' && lintelMaterial) {
      const lintelModule = this.getModuleMaterial(lintelMaterial)
      const fallbackModule = this.getModuleMaterial(this.config.fallbackMaterial)

      if (width < lintelModule.minWidth) {
        yield* this.moduleWallArea(area)
        return
      }

      let module = lintelModule

      if (width > lintelModule.maxWidth) {
        module = fallbackModule
      }

      // Sloped lintel area -> Single lintel element and delegate for inclined modules
      if (!area.isFlat) {
        const inclinedModule = this.getModuleMaterial(this.config.inclinedMaterial)
        const minHeight = area.minHeight - inclinedModule.minHeight

        if (minHeight < lintelModule.minHeight) {
          module = fallbackModule
        }

        const lintelHeight = Math.min(minHeight, module.maxHeight)
        const [lintelArea, inclinedArea] = area.splitInZ(lintelHeight)
        yield* this.yieldModule(lintelArea, module)
        yield* this.moduleWallArea(inclinedArea)
        return
      }

      if (height < lintelModule.minHeight) {
        module = fallbackModule
      }

      // One module
      if (height <= module.maxHeight) {
        yield* this.yieldModule(area, module)
        return
      }

      // Two modules
      if (height <= 2 * module.maxHeight) {
        const moduleHeight = height / 2
        const [bottom, top] = area.splitInZ(moduleHeight)
        yield* this.yieldModule(bottom, module)
        yield* this.yieldModule(top, module)
        return
      }

      // Delegate rest above to fill with standard modules
      const standardModule = this.getModuleMaterial(this.config.defaultMaterial)
      const availableHeight = height - standardModule.minHeight

      // Single support lintel module + rest
      if (availableHeight <= module.maxHeight) {
        const [moduleArea, rest] = area.splitInZ(availableHeight)
        yield* this.yieldModule(moduleArea, module)
        yield* this.moduleWallArea(rest)
        return
      }

      // Two support lintel module + rest
      const moduleHeight = Math.min(availableHeight / 2, module.maxHeight)
      const [module1, top] = area.splitInZ(moduleHeight)
      yield* this.yieldModule(module1, module)
      const [module2, rest] = top.splitInZ(moduleHeight)
      yield* this.yieldModule(module2, module)
      yield* this.moduleWallArea(rest)
      return
    }

    yield* this.moduleWallArea(area)
  }

  private *fallback(area: WallConstructionArea) {
    const { fallbackMaterial } = this.config
    const fallbackModule = this.getModuleMaterial(fallbackMaterial)
    const shouldFlip = this.shouldFlip(area.size[0], area.size[2], fallbackModule)
    if (shouldFlip && area.minHeight === area.size[2]) {
      yield* this.yieldFlippedModule(area, fallbackModule)
    } else if (fallbackModule.isFlipped) {
      yield* this.yieldFlippedModule(area, fallbackModule, false)
    } else {
      yield* this.yieldModule(area, fallbackModule)
    }
  }

  private getModuleMaterial(materialId: MaterialId) {
    const moduleMaterial = getMaterialsActions().getMaterialById(materialId)
    if (moduleMaterial?.type !== 'prefab') {
      throw new Error(`Invalid module material for prefab module: ${materialId}`)
    }
    return moduleMaterial
  }

  private *yieldFlippedModule(area: WallConstructionArea, material: PrefabMaterial, validateFlipped = true) {
    const flippedSize = newVec3(area.size[2], area.size[1], area.size[0])
    const shape = createCuboid(flippedSize)
    const rot = fromRot(Math.PI / 2, newVec3(0, -1, 0))
    const trans = fromTrans(addVec3(area.position, newVec3(area.size[0], 0, 0)))
    const transform = composeTransform(trans, rot)
    const nameKey = material.nameKey
    const typeTag = createTag(
      'module-type',
      material.id,
      nameKey ? t => t($ => $.materials.defaults[nameKey], { ns: 'config' }) : material.name
    )
    const element = createConstructionElement(material.id, shape, transform, [TAG_MODULE, typeTag], {
      type: 'module',
      subtype: material.id
    })
    yield* yieldMeasurementFromArea(area, 'width', [TAG_MODULE_WIDTH])
    yield* yieldMeasurementFromArea(area, 'height', [TAG_MODULE_HEIGHT])
    yield* this.yieldWithValidation(element, material, validateFlipped ? flippedSize : area.size)
  }

  private *yieldModuleColumn(area: WallConstructionArea, material: PrefabMaterial, index: number) {
    const { tallReinforceStagger, tallReinforceThreshold, defaultMaterial } = this.config
    if (area.size[2] <= tallReinforceThreshold) {
      yield* this.yieldModule(area, material)
      return
    }

    const defaultModule = this.getModuleMaterial(defaultMaterial)

    let remainingArea = area
    const shouldStagger = index % 2 === 1
    if (shouldStagger) {
      const [bottom, top] = area.splitInZ(tallReinforceStagger)
      remainingArea = top
      yield* this.yieldModule(bottom, defaultModule)
    }

    while (remainingArea.size[2] > material.maxHeight) {
      const maxSplitHeight = remainingArea.isFlat ? remainingArea.size[2] : remainingArea.minHeight - material.minHeight
      const splitHeight = Math.min(maxSplitHeight, defaultModule.maxHeight)
      const [bottom, top] = remainingArea.splitInZ(splitHeight)
      remainingArea = top
      yield* this.yieldModule(bottom, defaultModule)
    }

    yield* this.yieldModule(remainingArea, material)
  }

  private *yieldModule(area: WallConstructionArea, material: PrefabMaterial) {
    if (material.isFlipped && area.isFlat) {
      yield* this.yieldFlippedModule(area, material, false)
      return
    }

    const nameKey = material.nameKey
    const typeTag = createTag(
      'module-type',
      material.id,
      nameKey ? t => t($ => $.materials.defaults[nameKey], { ns: 'config' }) : material.name
    )
    const element = createElementFromArea(area, material.id, [TAG_MODULE, typeTag], {
      type: 'module',
      subtype: material.id
    })

    if (element) {
      yield* yieldMeasurementFromArea(area, 'width', [TAG_MODULE_WIDTH])
      yield* yieldMeasurementFromArea(area, 'height', [TAG_MODULE_HEIGHT])
      yield* this.yieldWithValidation(element, material, area.size)
    }
  }

  private shouldFlip(width: Length, height: Length, module: PrefabMaterial) {
    const widthValid = width >= module.minWidth && width <= module.maxWidth
    const heightValid = height >= module.minHeight && height <= module.maxHeight
    const flippedWidthValid = width >= module.minHeight && width <= module.maxHeight
    const flippedHeightValid = height >= module.minWidth && height <= module.maxWidth
    return (widthValid ? 1 : 0) + (heightValid ? 1 : 0) < (flippedWidthValid ? 1 : 0) + (flippedHeightValid ? 1 : 0)
  }

  private *yieldWithValidation(element: ConstructionElement, module: PrefabMaterial, size: Vec3) {
    yield* yieldElement(element)
    const width = size[0]
    const thickness = size[1]
    const height = size[2]
    if (width < module.minWidth || height < module.minHeight) {
      yield yieldError($ => $.construction.prefabModules.tooSmall, undefined, [element])
    }
    if (width > module.maxWidth || height > module.maxHeight) {
      yield yieldError($ => $.construction.prefabModules.tooBig, undefined, [element])
    }
    if (thickness < module.minThickness) {
      yield yieldError($ => $.construction.prefabModules.tooThin, undefined, [element], 'prefab-too-thin')
    }
    if (thickness > module.maxThickness) {
      yield yieldError($ => $.construction.prefabModules.tooThick, undefined, [element], 'prefab-too-thick')
    }
  }

  get thicknessRange(): ThicknessRange {
    const { defaultMaterial } = this.config
    const moduleMaterial = this.getModuleMaterial(defaultMaterial)
    const layerThickness = this.config.layers.insideThickness + this.config.layers.outsideThickness

    const min = moduleMaterial.minThickness + layerThickness
    const max = moduleMaterial.maxThickness + layerThickness

    return { min, max }
  }

  readonly tag = TAG_INFILL_CONSTRUCTION
}
