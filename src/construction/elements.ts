import type { MaterialId } from '@/construction/materials/material'

import { IDENTITY, type Shape, type Transform } from './shapes'
import type { Tag } from './tags'

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
  partId
})

// Used in the future for cut list etc.
export type PartId = string & { readonly brand: unique symbol }

export type GroupOrElement = ConstructionGroup | ConstructionElement

export interface ConstructionGroup {
  transform: Transform
  children: GroupOrElement[]

  tags?: Tag[]
  partId?: PartId
}

export interface ConstructionElement {
  id: ConstructionElementId
  material: MaterialId

  transform: Transform
  shape: Shape

  tags?: Tag[]
  partId?: PartId
}
