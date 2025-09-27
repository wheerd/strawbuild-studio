import type { Vec3 } from '@/shared/geometry'

import type { MaterialId } from './materials/material'

export type ConstructionElementId = string & { readonly brand: unique symbol }

export type Shape = Cuboid | CutCuboid

export interface Cuboid {
  type: 'cuboid'
  offset: Vec3
  size: Vec3
}

export interface Cut {
  plane: 'xy' | 'xz' | 'yz'
  axis: 'x' | 'y' | 'z'
  angle: number
}

export interface CutCuboid {
  type: 'cut-cuboid'
  offset: Vec3
  size: Vec3
  startCut?: Cut
  endCut?: Cut
}

export interface Tag {
  id: TagId
  label: string
  category: TagCategoryId
}

type TagId = `${TagCategoryId}_${string}` // lower case, numbers and hyphen only

export const ALL_CATEGORIES = {
  straw: { label: 'Straw' },
  'wall-wood': { label: 'Wall Wood' }, // TODO: Better name
  'wall-construction-type': { label: 'Wall Construction Type' }
} as const

export type TagCategoryId = keyof typeof ALL_CATEGORIES // lower case, numbers and hyphen only

export const CATEGORIES: Record<TagCategoryId, TagCategory> = ALL_CATEGORIES

export interface TagCategory {
  label: string
}

export type PartId = string & { readonly brand: unique symbol }

export type GroupOrElement = ConstructionGroup | ConstructionElement

export interface Transform {
  position: Vec3
  rotation: Vec3
}

export interface ConstructionGroup {
  transform: Transform
  children: GroupOrElement

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

export interface ConstructionModel {
  elements: GroupOrElement[]
  measurements: Measurement[]
  areas: HighlightedArea[]
  errors: Issue[]
  warnings: Issue[]
}

export interface Issue {
  description: string
  elements: ConstructionElementId[]
  groupKey?: string
}

export interface Measurement {
  startPoint: Vec3
  endPoint: Vec3
  label: string
  groupKey?: string
  tags?: Tag[]
}

export interface HighlightedArea {
  label: string
  transform: Transform
  size: Vec3
  tags?: Tag[]
}

export interface ConstructionPlanView {
  model: ConstructionModel
  view: 'top' | 'left' | 'right' | 'front' | 'back'
}
