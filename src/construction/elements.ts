import type { MaterialId } from '@/construction/materials/material'
import type { Bounds3D } from '@/shared/geometry'

import { IDENTITY, type Transform, transformBounds } from './geometry'
import { type Shape, createCuboidShape, createCutCuboidShape } from './shapes'
import type { Tag } from './tags'

// Re-export shape creation functions for backward compatibility
export { createCuboidShape, createCutCuboidShape }

export type ConstructionElementId = string & { readonly brand: unique symbol }
export const createConstructionElementId = (): ConstructionElementId =>
  (Date.now().toString(36) + Math.random().toString(36).slice(2)) as ConstructionElementId

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
