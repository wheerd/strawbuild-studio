import type { MaterialId } from '@/construction/materials/material'
import { type Length, type LineSegment2D, type Polygon2D, type Vec2 } from '@/shared/geometry'

import type { OpeningAssemblyId, OpeningId, PerimeterId, PerimeterWallId, WallEntityId, WallPostId } from './ids'

interface BaseWallEntity {
  id: WallEntityId
  perimeterId: PerimeterId
  wallId: PerimeterWallId
  type: 'opening' | 'post'
  centerOffsetFromWallStart: Length
  width: Length
}

export interface WallEntityGeometry {
  insideLine: LineSegment2D
  outsideLine: LineSegment2D
  polygon: Polygon2D
  center: Vec2
}

export type OpeningType = 'door' | 'window' | 'passage'

export interface Opening extends BaseWallEntity {
  id: OpeningId
  type: 'opening'
  openingType: OpeningType
  height: Length // Fitted height (finished height + 2×padding)
  sillHeight?: Length // Fitted sill height (finished sill - padding) - distance from floor to bottom of rough opening
  openingAssemblyId?: OpeningAssemblyId // Optional override for this specific opening
}

export type OpeningGeometry = WallEntityGeometry

export interface OpeningWithGeometry extends Opening, OpeningGeometry {}

export interface OpeningParams {
  openingType: OpeningType
  centerOffsetFromWallStart: Length
  width: Length
  height: Length // Fitted height (finished height + 2×padding)
  sillHeight?: Length // Fitted sill height (finished sill - padding) - distance from floor to bottom of rough opening
  openingAssemblyId?: OpeningAssemblyId // Optional override for this specific opening
}

export type WallPostType = 'center' | 'inside' | 'outside' | 'double'

export interface WallPost extends BaseWallEntity {
  id: WallPostId
  type: 'post'
  postType: WallPostType
  replacesPosts: boolean
  thickness: Length
  material: MaterialId
  infillMaterial: MaterialId
}

export interface WallPostParams {
  postType: WallPostType
  centerOffsetFromWallStart: Length
  width: Length
  thickness: Length
  replacesPosts: boolean
  material: MaterialId
  infillMaterial: MaterialId
}

export type WallPostGeometry = WallEntityGeometry

export interface WallPostWithGeometry extends WallPost, WallPostGeometry {}

export type WallEntity = Opening | WallPost
