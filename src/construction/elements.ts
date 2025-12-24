import type { MaterialId } from '@/construction/materials/material'
import { type Bounds3D, IDENTITY, type Transform, type Vec3, fromTrans } from '@/shared/geometry'
import { createId } from '@/shared/utils/ids'

import type { InitialPartInfo, PartInfo } from './parts'
import type { ConstructionIssueId } from './results'
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
  partInfo?: InitialPartInfo
): ConstructionElement => ({
  id: createConstructionElementId(),
  material,
  shape,
  transform,
  tags,
  partInfo,
  bounds: shape.bounds
})

/**
 * Convenience helper for creating a cuboid element at a corner position.
 * The cuboid shape has its corner at origin, and the transform positions it.
 */
export const createCuboidElement = (
  material: MaterialId,
  corner: Vec3,
  size: Vec3,
  tags?: Tag[],
  partInfo?: InitialPartInfo
): ConstructionElement => {
  const shape = createCuboid(size)
  const transform = fromTrans(corner)
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
  issueIds?: ConstructionIssueId[]
  sourceId?: string
}

export interface ConstructionElement {
  id: ConstructionElementId
  material: MaterialId

  transform: Transform
  bounds: Bounds3D
  shape: Shape

  tags?: Tag[]
  partInfo?: PartInfo
  issueIds?: ConstructionIssueId[]
  sourceId?: string // Building model ID
}
