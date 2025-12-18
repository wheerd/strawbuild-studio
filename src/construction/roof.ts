import type { Roof } from '@/building/model'
import { getModelActions } from '@/building/store'
import { getConfigActions } from '@/construction/config'
import { type PerimeterConstructionContext, computePerimeterConstructionContext } from '@/construction/context'
import { type ConstructionModel, createUnsupportedModel } from '@/construction/model'
import { resolveRoofAssembly } from '@/construction/roofs'

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

  const roofAssembly = resolveRoofAssembly(assemblyConfig)
  return roofAssembly.construct(roof, contexts)
}
