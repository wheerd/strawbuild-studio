import type { Roof } from '@/building/model'
import { getModelActions } from '@/building/store'
import { getConfigActions } from '@/construction/config'
import { type PerimeterConstructionContext, computePerimeterConstructionContext } from '@/construction/context'
import { type ConstructionModel, createUnsupportedModel } from '@/construction/model'
import { ROOF_ASSEMBLIES } from '@/construction/roofs'

/**
 * Construct a roof based on its assembly configuration
 */
export function constructRoof(roof: Roof, contexts?: PerimeterConstructionContext[]): ConstructionModel {
  const { getRoofAssemblyById } = getConfigActions()
  const assemblyConfig = getRoofAssemblyById(roof.assemblyId)

  if (!assemblyConfig) {
    return createUnsupportedModel('Invalid roof assembly', 'invalid-roof-assembly')
  }

  if (!contexts) {
    contexts = getModelActions()
      .getPerimetersByStorey(roof.storeyId)
      .map(p => computePerimeterConstructionContext(p, []))
  }

  // Type-narrowed construction based on assembly type
  switch (assemblyConfig.type) {
    case 'monolithic':
      return ROOF_ASSEMBLIES.monolithic.construct(roof, assemblyConfig, contexts)
    case 'purlin':
      return ROOF_ASSEMBLIES.purlin.construct(roof, assemblyConfig, contexts)
  }
}
