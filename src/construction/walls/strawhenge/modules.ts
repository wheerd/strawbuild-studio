import { vec3 } from 'gl-matrix'

import {
  type ConstructionElement,
  createConstructionElement,
  createCuboidShape,
  dimensionalPartId
} from '@/construction/elements'
import { IDENTITY } from '@/construction/geometry'
import type { MaterialId } from '@/construction/materials/material'
import { type ConstructionResult, yieldElement, yieldMeasurement } from '@/construction/results'
import { TAG_INFILL, TAG_MODULE_WIDTH } from '@/construction/tags'
import type { Length } from '@/shared/geometry'

export interface BaseModuleConfig {
  type: 'single' | 'double'
  width: Length // Default: 920mm
  frameThickness: Length // Default: 60mm
  frameMaterial: MaterialId
  strawMaterial: MaterialId
}

export interface SingleFrameModuleConfig extends BaseModuleConfig {
  type: 'single'
}

export interface DoubleFrameModuleConfig extends BaseModuleConfig {
  type: 'double'
  frameWidth: Length // Default: 120mm
  spacerSize: Length // Default: 120mm
  spacerCount: number // Default: 3
  spacerMaterial: MaterialId // Default: wood120x60
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
  const horizontalFramePartId = dimensionalPartId(frameMaterial, horizontalFrameSize)
  const verticalFrameLength = size[2] - 2 * frameThickness
  const verticalFrameSize = vec3.fromValues(frameThickness, size[1], verticalFrameLength)
  const verticalFramePartId = dimensionalPartId(frameMaterial, verticalFrameSize)

  // Calculate straw area (inset by frameThickness on all sides)
  const strawPosition = vec3.fromValues(position[0] + frameThickness, position[1], position[2] + frameThickness)
  const strawSize = vec3.fromValues(size[0] - 2 * frameThickness, size[1], size[2] - 2 * frameThickness)

  // Top frame
  const topFrame: ConstructionElement = createConstructionElement(
    frameMaterial,
    createCuboidShape(
      [position[0], position[1], position[2] + size[2] - frameThickness],
      [size[0], size[1], frameThickness]
    ),
    undefined,
    undefined,
    horizontalFramePartId
  )
  yield yieldElement(topFrame)

  // Bottom frame
  const bottomFrame: ConstructionElement = createConstructionElement(
    frameMaterial,
    createCuboidShape(position, [size[0], size[1], frameThickness]),
    undefined,
    undefined,
    horizontalFramePartId
  )
  yield yieldElement(bottomFrame)

  // Start frame (left side)
  const startFrame: ConstructionElement = createConstructionElement(
    frameMaterial,
    createCuboidShape(
      [position[0], position[1], position[2] + frameThickness],
      [frameThickness, size[1], verticalFrameLength]
    ),
    undefined,
    undefined,
    verticalFramePartId
  )
  yield yieldElement(startFrame)

  // End frame (right side)
  const endFrame: ConstructionElement = createConstructionElement(
    frameMaterial,
    createCuboidShape(
      [position[0] + size[0] - frameThickness, position[1], position[2] + frameThickness],
      [frameThickness, size[1], verticalFrameLength]
    ),
    undefined,
    undefined,
    verticalFramePartId
  )
  yield yieldElement(endFrame)

  // Straw filling
  yield yieldElement(
    createConstructionElement(config.strawMaterial, createCuboidShape(strawPosition, strawSize), IDENTITY, [TAG_INFILL])
  )

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
    strawMaterial,
    spacerSize: spacerHeight,
    spacerCount,
    spacerMaterial,
    infillMaterial
  } = config

  // Calculate straw area (inset by frameThickness on all sides)
  const strawPosition = vec3.fromValues(position[0] + frameThickness, position[1], position[2] + frameThickness)
  const strawSize = vec3.fromValues(size[0] - 2 * frameThickness, size[1], size[2] - 2 * frameThickness)
  const horizontalFrameSize = vec3.fromValues(size[0], frameWidth, frameThickness)
  const horizontalFramePartId = dimensionalPartId(frameMaterial, horizontalFrameSize)
  const verticalFrameLength = size[2] - 2 * frameThickness
  const verticalFrameSize = vec3.fromValues(frameThickness, frameWidth, verticalFrameLength)
  const verticalFramePartId = dimensionalPartId(frameMaterial, verticalFrameSize)

  // Top frame - 2 beams
  const topFrame1: ConstructionElement = createConstructionElement(
    frameMaterial,
    createCuboidShape(
      [position[0], position[1], position[2] + size[2] - frameThickness],
      [size[0], frameWidth, frameThickness]
    ),
    undefined,
    undefined,
    horizontalFramePartId
  )
  yield yieldElement(topFrame1)

  const topFrame2: ConstructionElement = createConstructionElement(
    frameMaterial,
    createCuboidShape(
      [position[0], position[1] + size[1] - frameWidth, position[2] + size[2] - frameThickness],
      [size[0], frameWidth, frameThickness]
    ),
    undefined,
    undefined,
    horizontalFramePartId
  )
  yield yieldElement(topFrame2)

  // Bottom frame - 2 beams
  const bottomFrame1: ConstructionElement = createConstructionElement(
    frameMaterial,
    createCuboidShape(position, [size[0], frameWidth, frameThickness]),
    undefined,
    undefined,
    horizontalFramePartId
  )
  yield yieldElement(bottomFrame1)

  const bottomFrame2: ConstructionElement = createConstructionElement(
    frameMaterial,
    createCuboidShape(
      [position[0], position[1] + size[1] - frameWidth, position[2]],
      [size[0], frameWidth, frameThickness]
    ),
    undefined,
    undefined,
    horizontalFramePartId
  )
  yield yieldElement(bottomFrame2)

  // Start frame (left side) - 2 beams
  const startFrame1: ConstructionElement = createConstructionElement(
    frameMaterial,
    createCuboidShape(
      [position[0], position[1], position[2] + frameThickness],
      [frameThickness, frameWidth, verticalFrameLength]
    ),
    undefined,
    undefined,
    verticalFramePartId
  )
  yield yieldElement(startFrame1)

  const startFrame2: ConstructionElement = createConstructionElement(
    frameMaterial,
    createCuboidShape(
      [position[0], position[1] + size[1] - frameWidth, position[2] + frameThickness],
      [frameThickness, frameWidth, verticalFrameLength]
    ),
    undefined,
    undefined,
    verticalFramePartId
  )
  yield yieldElement(startFrame2)

  // End frame (right side) - 2 beams
  const endFrame1: ConstructionElement = createConstructionElement(
    frameMaterial,
    createCuboidShape(
      [position[0] + size[0] - frameThickness, position[1], position[2] + frameThickness],
      [frameThickness, frameWidth, verticalFrameLength]
    ),
    undefined,
    undefined,
    verticalFramePartId
  )
  yield yieldElement(endFrame1)

  const endFrame2: ConstructionElement = createConstructionElement(
    frameMaterial,
    createCuboidShape(
      [position[0] + size[0] - frameThickness, position[1] + size[1] - frameWidth, position[2] + frameThickness],
      [frameThickness, frameWidth, verticalFrameLength]
    ),
    undefined,
    undefined,
    verticalFramePartId
  )
  yield yieldElement(endFrame2)

  // Straw filling
  yield yieldElement(
    createConstructionElement(strawMaterial, createCuboidShape(strawPosition, strawSize), IDENTITY, [TAG_INFILL])
  )

  const gapWidth = size[1] - 2 * frameWidth
  if (gapWidth > 0) {
    // Top infill
    yield yieldElement(
      createConstructionElement(
        infillMaterial,
        createCuboidShape(
          vec3.fromValues(position[0], position[1] + frameWidth, position[2] + size[2] - frameThickness),
          vec3.fromValues(size[0], gapWidth, frameThickness)
        )
      )
    )

    // Bottom infill
    yield yieldElement(
      createConstructionElement(
        infillMaterial,
        createCuboidShape(
          vec3.fromValues(position[0], position[1] + frameWidth, position[2]),
          vec3.fromValues(size[0], gapWidth, frameThickness)
        )
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
    const spacerPartId = dimensionalPartId(spacerMaterial, spacerSize)

    let z = verticalStart
    for (let i = spacerCount; i > 0; i--) {
      // Left spacer
      yield yieldElement(
        createConstructionElement(
          spacerMaterial,
          createCuboidShape(vec3.fromValues(position[0], y, z), spacerSize),
          undefined,
          undefined,
          spacerPartId
        )
      )

      if (i > 1) {
        // Left infill
        yield yieldElement(
          createConstructionElement(
            infillMaterial,
            createCuboidShape(vec3.fromValues(position[0], y, z + spacerHeight), infillSize)
          )
        )
      }

      // Right spacer
      yield yieldElement(
        createConstructionElement(
          spacerMaterial,
          createCuboidShape(vec3.fromValues(rightX, y, z), spacerSize),
          undefined,
          undefined,
          spacerPartId
        )
      )

      if (i > 1) {
        // Right infill
        yield yieldElement(
          createConstructionElement(
            infillMaterial,
            createCuboidShape(vec3.fromValues(rightX, y, z + spacerHeight), infillSize)
          )
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

export function constructModule(position: vec3, size: vec3, config: ModuleConfig): Generator<ConstructionResult> {
  if (config.type === 'single') {
    return constructSingleFrameModule(position, size, config)
  } else if (config.type === 'double') {
    return constructDoubleFrameModule(position, size, config)
  } else {
    throw new Error('Invalid module type')
  }
}
