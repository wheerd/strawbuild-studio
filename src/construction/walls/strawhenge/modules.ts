import { type ConstructionElement, createCuboidElement } from '@/construction/elements'
import { WallConstructionArea } from '@/construction/geometry'
import type { MaterialId } from '@/construction/materials/material'
import { constructStraw } from '@/construction/materials/straw'
import { type InitialPartInfo } from '@/construction/parts'
import { type ConstructionResult, yieldAsGroup, yieldElement, yieldMeasurement } from '@/construction/results'
import {
  TAG_MODULE,
  TAG_MODULE_FRAME,
  TAG_MODULE_INFILL,
  TAG_MODULE_SPACER,
  TAG_MODULE_WIDTH,
  TAG_STRAW_INFILL
} from '@/construction/tags'
import { type Length, type Vec3, newVec3 } from '@/shared/geometry'

export interface BaseModuleConfig {
  type: 'single' | 'double'
  minWidth: Length // Default: 920mm
  maxWidth: Length // Default: 920mm
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
  position: Vec3,
  size: Vec3,
  config: SingleFrameModuleConfig
): Generator<ConstructionResult> {
  const { frameThickness, frameMaterial } = config
  const verticalFrameLength = size[2] - 2 * frameThickness

  // Calculate straw area (inset by frameThickness on all sides)
  const strawPosition = newVec3(position[0] + frameThickness, position[1], position[2] + frameThickness)
  const strawSize = newVec3(size[0] - 2 * frameThickness, size[1], size[2] - 2 * frameThickness)
  const strawArea = new WallConstructionArea(strawPosition, strawSize)

  // Top frame
  const topFrame: ConstructionElement = createCuboidElement(
    frameMaterial,
    newVec3(position[0], position[1], position[2] + size[2] - frameThickness),
    newVec3(size[0], size[1], frameThickness),
    [TAG_MODULE_FRAME],
    { type: 'module-frame' }
  )
  yield* yieldElement(topFrame)

  // Bottom frame
  const bottomFrame: ConstructionElement = createCuboidElement(
    frameMaterial,
    position,
    newVec3(size[0], size[1], frameThickness),
    [TAG_MODULE_FRAME],
    { type: 'module-frame' }
  )
  yield* yieldElement(bottomFrame)

  // Start frame (left side)
  const startFrame: ConstructionElement = createCuboidElement(
    frameMaterial,
    newVec3(position[0], position[1], position[2] + frameThickness),
    newVec3(frameThickness, size[1], verticalFrameLength),
    [TAG_MODULE_FRAME],
    { type: 'module-frame' }
  )
  yield* yieldElement(startFrame)

  // End frame (right side)
  const endFrame: ConstructionElement = createCuboidElement(
    frameMaterial,
    newVec3(position[0] + size[0] - frameThickness, position[1], position[2] + frameThickness),
    newVec3(frameThickness, size[1], verticalFrameLength),
    [TAG_MODULE_FRAME],
    { type: 'module-frame' }
  )
  yield* yieldElement(endFrame)

  // Straw filling
  yield* constructStraw(strawArea, config.strawMaterial)

  yield yieldMeasurement({
    startPoint: position,
    endPoint: newVec3(position[0] + size[0], position[1], position[2]),
    extend1: newVec3(position[0], position[1] + size[1], position[2]),
    extend2: newVec3(position[0], position[1], position[2] + size[2]),
    tags: [TAG_MODULE_WIDTH]
  })
}

function* constructDoubleFrameModule(
  position: Vec3,
  size: Vec3,
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
  const strawPosition = newVec3(position[0] + frameThickness, position[1], position[2] + frameThickness)
  const strawSize = newVec3(size[0] - 2 * frameThickness, size[1], size[2] - 2 * frameThickness)
  const strawArea = new WallConstructionArea(strawPosition, strawSize)
  const verticalFrameLength = size[2] - 2 * frameThickness

  // Top frame - 2 beams
  const topFrame1: ConstructionElement = createCuboidElement(
    frameMaterial,
    newVec3(position[0], position[1], position[2] + size[2] - frameThickness),
    newVec3(size[0], frameWidth, frameThickness),
    [TAG_MODULE_FRAME],
    { type: 'module-frame' }
  )
  yield* yieldElement(topFrame1)

  const topFrame2: ConstructionElement = createCuboidElement(
    frameMaterial,
    newVec3(position[0], position[1] + size[1] - frameWidth, position[2] + size[2] - frameThickness),
    newVec3(size[0], frameWidth, frameThickness),
    [TAG_MODULE_FRAME],
    { type: 'module-frame' }
  )
  yield* yieldElement(topFrame2)

  // Bottom frame - 2 beams
  const bottomFrame1: ConstructionElement = createCuboidElement(
    frameMaterial,
    position,
    newVec3(size[0], frameWidth, frameThickness),
    [TAG_MODULE_FRAME],
    { type: 'module-frame' }
  )
  yield* yieldElement(bottomFrame1)

  const bottomFrame2: ConstructionElement = createCuboidElement(
    frameMaterial,
    newVec3(position[0], position[1] + size[1] - frameWidth, position[2]),
    newVec3(size[0], frameWidth, frameThickness),
    [TAG_MODULE_FRAME],
    { type: 'module-frame' }
  )
  yield* yieldElement(bottomFrame2)

  // Start frame (left side) - 2 beams
  const startFrame1: ConstructionElement = createCuboidElement(
    frameMaterial,
    newVec3(position[0], position[1], position[2] + frameThickness),
    newVec3(frameThickness, frameWidth, verticalFrameLength),
    [TAG_MODULE_FRAME],
    { type: 'module-frame' }
  )
  yield* yieldElement(startFrame1)

  const startFrame2: ConstructionElement = createCuboidElement(
    frameMaterial,
    newVec3(position[0], position[1] + size[1] - frameWidth, position[2] + frameThickness),
    newVec3(frameThickness, frameWidth, verticalFrameLength),
    [TAG_MODULE_FRAME],
    { type: 'module-frame' }
  )
  yield* yieldElement(startFrame2)

  // End frame (right side) - 2 beams
  const endFrame1: ConstructionElement = createCuboidElement(
    frameMaterial,
    newVec3(position[0] + size[0] - frameThickness, position[1], position[2] + frameThickness),
    newVec3(frameThickness, frameWidth, verticalFrameLength),
    [TAG_MODULE_FRAME],
    { type: 'module-frame' }
  )
  yield* yieldElement(endFrame1)

  const endFrame2: ConstructionElement = createCuboidElement(
    frameMaterial,
    newVec3(position[0] + size[0] - frameThickness, position[1] + size[1] - frameWidth, position[2] + frameThickness),
    newVec3(frameThickness, frameWidth, verticalFrameLength),
    [TAG_MODULE_FRAME],
    { type: 'module-frame' }
  )
  yield* yieldElement(endFrame2)

  // Straw filling
  if (config.strawMaterial) {
    yield* yieldElement(createCuboidElement(config.strawMaterial, strawPosition, strawSize, [TAG_STRAW_INFILL]))
  } else {
    yield* constructStraw(strawArea)
  }

  const gapWidth = size[1] - 2 * frameWidth
  if (gapWidth > 0) {
    // Top infill
    yield* yieldElement(
      createCuboidElement(
        infillMaterial,
        newVec3(position[0], position[1] + frameWidth, position[2] + size[2] - frameThickness),
        newVec3(size[0], gapWidth, frameThickness),
        [TAG_MODULE_INFILL]
      )
    )

    // Bottom infill
    yield* yieldElement(
      createCuboidElement(
        infillMaterial,
        newVec3(position[0], position[1] + frameWidth, position[2]),
        newVec3(size[0], gapWidth, frameThickness),
        [TAG_MODULE_INFILL]
      )
    )

    const verticalStart = position[2] + frameThickness
    const verticalEnd = position[2] + size[2] - frameThickness

    const availableHeight = verticalEnd - verticalStart
    const spacing = (availableHeight - spacerHeight) / (spacerCount - 1)
    const infillHeight = (availableHeight - spacerCount * spacerHeight) / (spacerCount - 1)
    const y = position[1] + frameWidth
    const rightX = position[0] + size[0] - frameThickness

    const spacerSize = newVec3(frameThickness, gapWidth, spacerHeight)
    const infillSize = newVec3(frameThickness, gapWidth, infillHeight)

    let z = verticalStart
    for (let i = spacerCount; i > 0; i--) {
      // Left spacer
      yield* yieldElement(
        createCuboidElement(spacerMaterial, newVec3(position[0], y, z), spacerSize, [TAG_MODULE_SPACER], {
          type: 'module-spacer'
        })
      )

      if (i > 1) {
        // Left infill
        yield* yieldElement(
          createCuboidElement(infillMaterial, newVec3(position[0], y, z + spacerHeight), infillSize, [
            TAG_MODULE_INFILL
          ])
        )
      }

      // Right spacer
      yield* yieldElement(
        createCuboidElement(spacerMaterial, newVec3(rightX, y, z), spacerSize, [TAG_MODULE_SPACER], {
          type: 'module-spacer'
        })
      )

      if (i > 1) {
        // Right infill
        yield* yieldElement(
          createCuboidElement(infillMaterial, newVec3(rightX, y, z + spacerHeight), infillSize, [TAG_MODULE_INFILL])
        )
      }

      z += spacing
    }
  }

  yield yieldMeasurement({
    startPoint: position,
    endPoint: newVec3(position[0] + size[0], position[1], position[2]),
    extend1: newVec3(position[0], position[1] + size[1], position[2]),
    extend2: newVec3(position[0], position[1], position[2] + size[2]),
    tags: [TAG_MODULE_WIDTH]
  })
}

export function* constructModule(area: WallConstructionArea, config: ModuleConfig): Generator<ConstructionResult> {
  const size = newVec3(area.size[0], area.size[1], area.minHeight)
  const configStr = JSON.stringify(config, Object.keys(config).sort())
  const partInfo: InitialPartInfo = {
    type: `module-${config.type}`,
    subtype: configStr
  }
  if (config.type === 'single') {
    yield* yieldAsGroup(constructSingleFrameModule(area.position, size, config), [TAG_MODULE], undefined, partInfo)
  } else if (config.type === 'double') {
    yield* yieldAsGroup(constructDoubleFrameModule(area.position, size, config), [TAG_MODULE], undefined, partInfo)
  } else {
    throw new Error('Invalid module type')
  }
}
