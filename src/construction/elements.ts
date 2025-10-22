import type { MaterialId } from '@/construction/materials/material'
import type { PartInfo } from '@/construction/parts'
import type { Bounds3D } from '@/shared/geometry'
import { createId } from '@/shared/utils/ids'

import { IDENTITY, type Transform, transformBounds } from './geometry'
import { type Shape } from './shapes'
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
