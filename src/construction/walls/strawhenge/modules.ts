import { vec3 } from 'gl-matrix'

import { type ConstructionElement, createCuboidElement } from '@/construction/elements'
import type { MaterialId } from '@/construction/materials/material'
import { constructStraw } from '@/construction/materials/straw'
import { type PartId, type PartInfo, dimensionalPartInfo } from '@/construction/parts'
import { type ConstructionResult, yieldAsGroup, yieldElement, yieldMeasurement } from '@/construction/results'
import { TAG_MODULE, TAG_MODULE_WIDTH, TAG_STRAW_INFILL } from '@/construction/tags'
import type { Length } from '@/shared/geometry'

export interface BaseModuleConfig {
  type: 'single' | 'double'
  width: Length // Default: 920mm
  frameThickness: Length // Default: 60mm
  frameMaterial: MaterialId
  strawMaterial?: MaterialId
}

export interface SingleFrameModuleConfig extends BaseModuleConfig {
  type: 'single'
}

export interface DoubleFrameModuleConfig extends BaseModuleConfig {
  type: 'double'
  frameWidth: Length // Default: 120mm
  spacerSize: Length // Default: 120mm
  spacerCount: number // Default: 3
  spacerMaterial: MaterialId // Default: wood
  infillMaterial: MaterialId // Default: woodwool
}

export type ModuleConfig = SingleFrameModuleConfig | DoubleFrameModuleConfig

function* constructSingleFrameModule(
  position: vec3,
  size: vec3,
  config: SingleFrameModuleConfig
): Generator<ConstructionResult> {
  const { frameThickness, frameMaterial } = config
  const horizontalFrameSize = vec3.fromValues(size[0], size[1], frameThickness)
  const horizontalFramePartId = dimensionalPartInfo('module-frame', horizontalFrameSize)
  const verticalFrameLength = size[2] - 2 * frameThickness
  const verticalFrameSize = vec3.fromValues(frameThickness, size[1], verticalFrameLength)
  const verticalFramePartId = dimensionalPartInfo('module-frame', verticalFrameSize)

  // Calculate straw area (inset by frameThickness on all sides)
  const strawPosition = vec3.fromValues(position[0] + frameThickness, position[1], position[2] + frameThickness)
  const strawSize = vec3.fromValues(size[0] - 2 * frameThickness, size[1], size[2] - 2 * frameThickness)

  // Top frame
  const topFrame: ConstructionElement = createCuboidElement(
    frameMaterial,

    [position[0], position[1], position[2] + size[2] - frameThickness],
    [size[0], size[1], frameThickness],
    undefined,
    horizontalFramePartId
  )
  yield yieldElement(topFrame)

  // Bottom frame
  const bottomFrame: ConstructionElement = createCuboidElement(
    frameMaterial,
    position,
    [size[0], size[1], frameThickness],
    undefined,
    horizontalFramePartId
  )
  yield yieldElement(bottomFrame)

  // Start frame (left side)
  const startFrame: ConstructionElement = createCuboidElement(
    frameMaterial,

    [position[0], position[1], position[2] + frameThickness],
    [frameThickness, size[1], verticalFrameLength],
    undefined,
    verticalFramePartId
  )
  yield yieldElement(startFrame)

  // End frame (right side)
  const endFrame: ConstructionElement = createCuboidElement(
    frameMaterial,

    [position[0] + size[0] - frameThickness, position[1], position[2] + frameThickness],
    [frameThickness, size[1], verticalFrameLength],
    undefined,
    verticalFramePartId
  )
  yield yieldElement(endFrame)

  // Straw filling
  yield* constructStraw(strawPosition, strawSize, config.strawMaterial)

  yield yieldMeasurement({
    startPoint: position,
    endPoint: [position[0] + size[0], position[1], position[2]],
    size,
    tags: [TAG_MODULE_WIDTH]
  })
}

function* constructDoubleFrameModule(
  position: vec3,
  size: vec3,
  config: DoubleFrameModuleConfig
): Generator<ConstructionResult> {
  const {
    frameThickness,
    frameWidth,
    frameMaterial,
    spacerSize: spacerHeight,
    spacerCount,
    spacerMaterial,
    infillMaterial
  } = config

  // Calculate straw area (inset by frameThickness on all sides)
  const strawPosition = vec3.fromValues(position[0] + frameThickness, position[1], position[2] + frameThickness)
  const strawSize = vec3.fromValues(size[0] - 2 * frameThickness, size[1], size[2] - 2 * frameThickness)
  const horizontalFrameSize = vec3.fromValues(size[0], frameWidth, frameThickness)
  const horizontalFramePartId = dimensionalPartInfo('module-frame', horizontalFrameSize)
  const verticalFrameLength = size[2] - 2 * frameThickness
  const verticalFrameSize = vec3.fromValues(frameThickness, frameWidth, verticalFrameLength)
  const verticalFramePartId = dimensionalPartInfo('module-frame', verticalFrameSize)

  // Top frame - 2 beams
  const topFrame1: ConstructionElement = createCuboidElement(
    frameMaterial,

    [position[0], position[1], position[2] + size[2] - frameThickness],
    [size[0], frameWidth, frameThickness],
    undefined,
    horizontalFramePartId
  )
  yield yieldElement(topFrame1)

  const topFrame2: ConstructionElement = createCuboidElement(
    frameMaterial,

    [position[0], position[1] + size[1] - frameWidth, position[2] + size[2] - frameThickness],
    [size[0], frameWidth, frameThickness],
    undefined,
    horizontalFramePartId
  )
  yield yieldElement(topFrame2)

  // Bottom frame - 2 beams
  const bottomFrame1: ConstructionElement = createCuboidElement(
    frameMaterial,
    position,
    [size[0], frameWidth, frameThickness],

    undefined,
    horizontalFramePartId
  )
  yield yieldElement(bottomFrame1)

  const bottomFrame2: ConstructionElement = createCuboidElement(
    frameMaterial,

    [position[0], position[1] + size[1] - frameWidth, position[2]],
    [size[0], frameWidth, frameThickness],
    undefined,
    horizontalFramePartId
  )
  yield yieldElement(bottomFrame2)

  // Start frame (left side) - 2 beams
  const startFrame1: ConstructionElement = createCuboidElement(
    frameMaterial,

    [position[0], position[1], position[2] + frameThickness],
    [frameThickness, frameWidth, verticalFrameLength],
    undefined,
    verticalFramePartId
  )
  yield yieldElement(startFrame1)

  const startFrame2: ConstructionElement = createCuboidElement(
    frameMaterial,

    [position[0], position[1] + size[1] - frameWidth, position[2] + frameThickness],
    [frameThickness, frameWidth, verticalFrameLength],
    undefined,
    verticalFramePartId
  )
  yield yieldElement(startFrame2)

  // End frame (right side) - 2 beams
  const endFrame1: ConstructionElement = createCuboidElement(
    frameMaterial,

    [position[0] + size[0] - frameThickness, position[1], position[2] + frameThickness],
    [frameThickness, frameWidth, verticalFrameLength],
    undefined,
    verticalFramePartId
  )
  yield yieldElement(endFrame1)

  const endFrame2: ConstructionElement = createCuboidElement(
    frameMaterial,

    [position[0] + size[0] - frameThickness, position[1] + size[1] - frameWidth, position[2] + frameThickness],
    [frameThickness, frameWidth, verticalFrameLength],
    undefined,
    verticalFramePartId
  )
  yield yieldElement(endFrame2)

  // Straw filling
  if (config.strawMaterial) {
    yield yieldElement(createCuboidElement(config.strawMaterial, strawPosition, strawSize, [TAG_STRAW_INFILL]))
  } else {
    yield* constructStraw(strawPosition, strawSize)
  }

  const gapWidth = size[1] - 2 * frameWidth
  if (gapWidth > 0) {
    // Top infill
    yield yieldElement(
      createCuboidElement(
        infillMaterial,
        vec3.fromValues(position[0], position[1] + frameWidth, position[2] + size[2] - frameThickness),
        vec3.fromValues(size[0], gapWidth, frameThickness)
      )
    )

    // Bottom infill
    yield yieldElement(
      createCuboidElement(
        infillMaterial,
        vec3.fromValues(position[0], position[1] + frameWidth, position[2]),
        vec3.fromValues(size[0], gapWidth, frameThickness)
      )
    )

    const verticalStart = position[2] + frameThickness
    const verticalEnd = position[2] + size[2] - frameThickness

    const availableHeight = verticalEnd - verticalStart
    const spacing = (availableHeight - spacerHeight) / (spacerCount - 1)
    const infillHeight = (availableHeight - spacerCount * spacerHeight) / (spacerCount - 1)
    const y = position[1] + frameWidth
    const rightX = position[0] + size[0] - frameThickness

    const spacerSize = vec3.fromValues(frameThickness, gapWidth, spacerHeight)
    const infillSize = vec3.fromValues(frameThickness, gapWidth, infillHeight)
    const spacerPartId = dimensionalPartInfo('module-spacer', spacerSize)

    let z = verticalStart
    for (let i = spacerCount; i > 0; i--) {
      // Left spacer
      yield yieldElement(
        createCuboidElement(spacerMaterial, vec3.fromValues(position[0], y, z), spacerSize, undefined, spacerPartId)
      )

      if (i > 1) {
        // Left infill
        yield yieldElement(
          createCuboidElement(infillMaterial, vec3.fromValues(position[0], y, z + spacerHeight), infillSize)
        )
      }

      // Right spacer
      yield yieldElement(
        createCuboidElement(
          spacerMaterial,
          vec3.fromValues(rightX, y, z),
          spacerSize,

          undefined,
          spacerPartId
        )
      )

      if (i > 1) {
        // Right infill
        yield yieldElement(
          createCuboidElement(infillMaterial, vec3.fromValues(rightX, y, z + spacerHeight), infillSize)
        )
      }

      z += spacing
    }
  }

  yield yieldMeasurement({
    startPoint: position,
    endPoint: [position[0] + size[0], position[1], position[2]],
    size,
    tags: [TAG_MODULE_WIDTH]
  })
}

export function* constructModule(position: vec3, size: vec3, config: ModuleConfig): Generator<ConstructionResult> {
  const configStr = JSON.stringify(config, Object.keys(config).sort())
  const sizeStr = Array.from(size).map(Math.round).join('x')
  const partInfo: PartInfo = {
    partId: `module_${configStr}_${sizeStr}` as PartId,
    type: `module-${config.type}`,
    size
  }
  if (config.type === 'single') {
    yield* yieldAsGroup(constructSingleFrameModule(position, size, config), [TAG_MODULE], undefined, partInfo)
  } else if (config.type === 'double') {
    yield* yieldAsGroup(constructDoubleFrameModule(position, size, config), [TAG_MODULE], undefined, partInfo)
  } else {
    throw new Error('Invalid module type')
  }
}
