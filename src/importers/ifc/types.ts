import { IFC4 } from 'web-ifc'

import { mat4, vec3 } from 'gl-matrix'

import type { Polygon2D, PolygonWithHoles2D } from '@/shared/geometry'

export interface ImportedStorey {
  readonly expressId: number
  readonly guid: string | null
  readonly name: string | null
  readonly elevation: number
  readonly height: number | null
  readonly placement: mat4
  readonly walls: ImportedWall[]
  readonly slabs: ImportedSlab[]
}

export interface ImportedWall {
  readonly expressId: number
  readonly guid: string | null
  readonly name: string | null
  readonly placement: mat4
  readonly height: number | null
  readonly thickness: number | null
  readonly profile: ExtrudedProfile | null
  readonly path: vec3[] | null
  readonly openings: ImportedOpening[]
}

export interface ImportedOpening {
  readonly expressId: number
  readonly guid: string | null
  readonly type: ImportedOpeningType
  readonly profile: ExtrudedProfile | null
  readonly placement: mat4
}

export type ImportedOpeningType = 'door' | 'window' | 'void'

export interface ImportedSlab {
  readonly expressId: number
  readonly guid: string | null
  readonly name: string | null
  readonly placement: mat4
  readonly profile: ExtrudedProfile | null
  readonly thickness: number | null
}

export interface ExtrudedProfile {
  readonly footprint: PolygonWithHoles2D
  readonly localOutline: Polygon2D
  readonly localToWorld: mat4
  readonly extrusionDirection: vec3
  readonly extrusionDepth: number
}

export interface ParsedIfcModel {
  readonly unitScale: number
  readonly storeys: ImportedStorey[]
}

export interface RawIfcStorey {
  readonly expressId: number
  readonly guid: string | null
  readonly name: string | null
  readonly elevation: number
  readonly placement: mat4
  readonly line: IFC4.IfcBuildingStorey
}

export interface RawIfcElement {
  readonly expressId: number
  readonly type: string
}
