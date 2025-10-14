import type { MaterialId } from '@/construction/materials/material'
import type { Bounds3D } from '@/shared/geometry'
import { createId } from '@/shared/utils/ids'

import { IDENTITY, type Transform, transformBounds } from './geometry'
import { type Shape, createCuboidShape, createCutCuboidShape } from './shapes'
import type { Tag } from './tags'

// Re-export shape creation functions for backward compatibility
export { createCuboidShape, createCutCuboidShape }

const CONSTRUCTION_ELEMENT_ID_PREFIX = 'ce_'

export type ConstructionElementId = `${typeof CONSTRUCTION_ELEMENT_ID_PREFIX}${string}`
export const createConstructionElementId = (): ConstructionElementId => createId(CONSTRUCTION_ELEMENT_ID_PREFIX)

export const createConstructionElement = (
  material: MaterialId,
  shape: Shape,
  transform: Transform = IDENTITY,
  tags?: Tag[],
  partId?: PartId
): ConstructionElement => ({
  id: createConstructionElementId(),
  material,
  shape,
  transform,
  tags,
  partId,
  bounds: transformBounds(shape.bounds, transform)
})

// Used in the future for cut list etc.
export type PartId = string & { readonly brand: unique symbol }

export type GroupOrElement = ConstructionGroup | ConstructionElement

export interface ConstructionGroup {
  id: ConstructionElementId

  transform: Transform
  bounds: Bounds3D
  children: GroupOrElement[]

  tags?: Tag[]
  partId?: PartId
}

export interface ConstructionElement {
  id: ConstructionElementId
  material: MaterialId

  transform: Transform
  bounds: Bounds3D
  shape: Shape

  tags?: Tag[]
  partId?: PartId
}
