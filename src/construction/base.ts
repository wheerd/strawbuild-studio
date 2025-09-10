import type { OpeningType, PerimeterWall, PerimeterWallId } from '@/model'
import type { Length, Vec3 } from '@/types/geometry'
import type { MaterialId } from './material'
import type { StrawConfig } from './straw'
import type { OpeningConstruction, OpeningConstructionConfig } from './openings'

export interface BaseConstructionConfig {
  openings: Record<OpeningType, OpeningConstructionConfig>
  straw: StrawConfig
}

export type PerimeterWallConstructionMethod<TConfig> = (
  wall: PerimeterWall,
  floorHeight: Length,
  config: TConfig
) => WallConstructionPlan

export type ConstructionType = 'infill' | 'strawhenge'

export interface ConstructionIssue {
  description: string
  elements: ConstructionElementId[]
}

export interface WallConstructionPlan {
  wallId: PerimeterWallId
  constructionType: ConstructionType
  wallDimensions: {
    length: Length
    thickness: Length
    height: Length
  }

  segments: ConstructionSegment[]

  errors: ConstructionIssue[]
  warnings: ConstructionIssue[]
}

export type ConstructionSegment = WallConstructionSegment | OpeningConstruction

export interface BaseConstructionSegment {
  id: string
  type: 'wall' | 'opening'
  position: Length
  width: Length
  elements: ConstructionElement[]
}

export interface WallConstructionSegment extends BaseConstructionSegment {
  type: 'wall'
  constructionType: ConstructionType
}

export type ConstructionElementType =
  | 'post'
  | 'plate'
  | 'full-strawbale'
  | 'partial-strawbale'
  | 'straw'
  | 'frame'
  | 'header'
  | 'sill'
  | 'opening'
  | 'infill'

export type ConstructionElementId = string & { readonly brand: unique symbol }
export const createConstructionElementId = (): ConstructionElementId =>
  (Date.now().toString(36) + Math.random().toString(36).slice(2)) as ConstructionElementId

export interface ConstructionElement {
  id: ConstructionElementId
  type: ConstructionElementType
  material: MaterialId

  // [0] along wall wall direction (insideLine) (0 = start of the insideLine, > 0 towards the end of insideLine)
  // [1] along wall outside direction (0 = inside edge of wall, > 0 towards outside edge)
  // [2] elevation in the wall (0 = bottom, > 0 towards the top of the wall)
  position: Vec3

  // Non-negative size vector forming a cuboid geometry with axis same as position
  size: Vec3
}

export interface WithIssues<T> {
  it: T
  errors: ConstructionIssue[]
  warnings: ConstructionIssue[]
}
