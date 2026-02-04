import type { Roof } from '@/building/model'
import { getModelActions } from '@/building/store'
import { getConfigActions } from '@/construction/config'
import { getPerimeterContextCached } from '@/construction/derived/perimeterContextCache'
import { type ConstructionModel, createUnsupportedModel } from '@/construction/model'
import { type PerimeterConstructionContext } from '@/construction/perimeters/context'
import { PurlinRoofAssembly } from '@/construction/roofs/purlin'

import { MonolithicRoofAssembly } from './monolithic'
import type { RoofAssembly, RoofConfig } from './types'

export function resolveRoofAssembly(config: RoofConfig): RoofAssembly {
  switch (config.type) {
    case 'monolithic':
      return new MonolithicRoofAssembly(config)
    case 'purlin':
      return new PurlinRoofAssembly(config)
    default:
      throw new Error(`Unknown roof assembly type: ${(config as RoofConfig).type}`)
  }
}

export * from './types'

export function constructRoof(roof: Roof, contexts?: PerimeterConstructionContext[]): ConstructionModel {
  const { getRoofAssemblyById } = getConfigActions()
  const assemblyConfig = getRoofAssemblyById(roof.assemblyId)

  if (!assemblyConfig) {
    return createUnsupportedModel($ => $.construction.roof.invalidAssembly, undefined, 'invalid-roof-assembly')
  }

  contexts ??= getModelActions()
    .getPerimetersByStorey(roof.storeyId)
    .map(p => getPerimeterContextCached(p.id))

  const roofAssembly = resolveRoofAssembly(assemblyConfig)
  return roofAssembly.construct(roof, contexts)
}
