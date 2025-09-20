import type { ConstructionType, PerimeterWallConstructionMethod } from './base'
import { constructInfillWall } from './infill'
import { constructStrawhengeWall } from './strawhenge'

export * from './base'
export * from './corners'
export * from './infill'
export * from './material'
export * from './openings'
export * from './posts'
export * from './ringBeams'
export * from './straw'
export * from './strawhenge'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const PERIMETER_WALL_CONSTRUCTION_METHODS: Record<ConstructionType, PerimeterWallConstructionMethod<any>> = {
  infill: constructInfillWall,
  strawhenge: constructStrawhengeWall
  // ...
}
