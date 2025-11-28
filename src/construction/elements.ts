import { vec3 } from 'gl-matrix'

import type { MaterialId } from '@/construction/materials/material'
import type { Bounds3D } from '@/shared/geometry'
import { createId } from '@/shared/utils/ids'

import { IDENTITY, type Transform, transformBounds } from './geometry'
import type { PartInfo } from './parts'
import { type Shape, createCuboid } from './shapes'
import type { Tag } from './tags'

const CONSTRUCTION_ELEMENT_ID_PREFIX = 'ce_'

export type ConstructionElementId = `${typeof CONSTRUCTION_ELEMENT_ID_PREFIX}${string}`
export const createConstructionElementId = (): ConstructionElementId => createId(CONSTRUCTION_ELEMENT_ID_PREFIX)

export const createConstructionElement = (
  material: MaterialId,
  shape: Shape,
  transform: Transform = IDENTITY,
  tags?: Tag[],
  partInfo?: PartInfo
): ConstructionElement => ({
  id: createConstructionElementId(),
  material,
  shape,
  transform,
  tags,
  partInfo,
  bounds: transformBounds(shape.bounds, transform)
})

/**
 * Convenience helper for creating a cuboid element at a corner position.
 * The cuboid shape has its corner at origin, and the transform positions it.
 */
export const createCuboidElement = (
  material: MaterialId,
  corner: vec3,
  size: vec3,
  tags?: Tag[],
  partInfo?: PartInfo
): ConstructionElement => {
  const shape = createCuboid(size)
  const transform: Transform = {
    position: vec3.clone(corner),
    rotation: vec3.fromValues(0, 0, 0)
  }
  return createConstructionElement(material, shape, transform, tags, partInfo)
}

export type GroupOrElement = ConstructionGroup | ConstructionElement

export interface ConstructionGroup {
  id: ConstructionElementId

  transform: Transform
  bounds: Bounds3D
  children: GroupOrElement[]

  tags?: Tag[]
  partInfo?: PartInfo
}

export interface ConstructionElement {
  id: ConstructionElementId
  material: MaterialId

  transform: Transform
  bounds: Bounds3D
  shape: Shape

  tags?: Tag[]
  partInfo?: PartInfo
}
