import type { vec3 } from 'gl-matrix'

import type { Perimeter, PerimeterWall } from '@/building/model'
import type { NonStrawbaleConfig } from '@/construction/config/types'
import { createConstructionElement } from '@/construction/elements'
import type { MaterialId } from '@/construction/materials/material'
import type { ConstructionModel } from '@/construction/model'
import { type ConstructionResult, aggregateResults, yieldElement } from '@/construction/results'
import { createCuboidShape } from '@/construction/shapes'
import type { NonStrawbaleWallAssemblyConfig, WallAssembly } from '@/construction/walls'
import type { WallAssemblyBuilder } from '@/construction/walls/construction'
import { type WallStoreyContext, segmentedWallConstruction } from '@/construction/walls/segmentation'
import { mergeBounds } from '@/shared/geometry'

function* infillNonStrawbaleWallArea(
  position: vec3,
  size: vec3,
  config: NonStrawbaleConfig
): Generator<ConstructionResult> {
  yield yieldElement(createConstructionElement(config.material, createCuboidShape(position, size)))
}

function* constructNonStrawbaleOpeningFrame(
  material: MaterialId,
  position: vec3,
  size: vec3
): Generator<ConstructionResult> {
  yield yieldElement(createConstructionElement(material, createCuboidShape(position, size)))
}

export const constructNonStrawbaleWall: WallAssemblyBuilder<NonStrawbaleConfig> = (
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
      (position: vec3, size: vec3) => constructNonStrawbaleOpeningFrame(config.material, position, size)
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

export class NonStrawbaleWallAssembly implements WallAssembly<NonStrawbaleWallAssemblyConfig> {
  construct(
    wall: PerimeterWall,
    perimeter: Perimeter,
    storeyContext: WallStoreyContext,
    config: NonStrawbaleWallAssemblyConfig
  ): ConstructionModel {
    const constructionConfig: NonStrawbaleConfig = {
      type: 'non-strawbale',
      openings: config.openings,
      straw: config.straw,
      material: config.material,
      thickness: config.thickness
    }
    return constructNonStrawbaleWall(wall, perimeter, storeyContext, constructionConfig, config.layers)
  }
}
