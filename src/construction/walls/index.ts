import type { NonStrawbaleConfig } from '@/construction/config/types'
import { createConstructionElement, createCuboidShape } from '@/construction/elements'
import type { MaterialId } from '@/construction/materials/material'
import { type ConstructionResult, aggregateResults, yieldElement } from '@/construction/results'
import { constructModuleWall } from '@/construction/walls/strawhenge/all-modules'
import { type Vec3, mergeBounds } from '@/shared/geometry'

import type { ConstructionType, PerimeterWallConstructionMethod } from './construction'
import { constructInfillWall } from './infill/infill'
import { segmentedWallConstruction } from './segmentation'
import { constructStrawhengeWall } from './strawhenge/strawhenge'

export * from './construction'
export * from './segmentation'
export * from './corners/corners'
export * from './infill/infill'
export * from './strawhenge/strawhenge'

function* infillNonStrawbaleWallArea(
  position: Vec3,
  size: Vec3,
  config: NonStrawbaleConfig
): Generator<ConstructionResult> {
  yield yieldElement(createConstructionElement(config.material, createCuboidShape(position, size)))
}

function* constructNonStrawbaleOpeningFrame(
  material: MaterialId,
  position: Vec3,
  size: Vec3
): Generator<ConstructionResult> {
  yield yieldElement(createConstructionElement(material, createCuboidShape(position, size)))
}

export const constructNonStrawbaleWall: PerimeterWallConstructionMethod<NonStrawbaleConfig> = (
  wall,
  perimeter,
  storeyContext,
  config,
  layers
) => {
  const allResults = Array.from(
    segmentedWallConstruction(
      wall,
      perimeter,
      storeyContext,
      layers,
      (position, size) => infillNonStrawbaleWallArea(position, size, config),
      (position: Vec3, size: Vec3) => constructNonStrawbaleOpeningFrame(config.material, position, size)
    )
  )
  const aggRes = aggregateResults(allResults)

  return {
    bounds: mergeBounds(...aggRes.elements.map(e => e.bounds)),
    elements: aggRes.elements,
    measurements: aggRes.measurements,
    areas: aggRes.areas,
    errors: aggRes.errors,
    warnings: aggRes.warnings
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const PERIMETER_WALL_CONSTRUCTION_METHODS: Record<ConstructionType, PerimeterWallConstructionMethod<any>> = {
  infill: constructInfillWall,
  strawhenge: constructStrawhengeWall,
  modules: constructModuleWall,
  'non-strawbale': constructNonStrawbaleWall
}
