import type { Roof } from '@/building/model'
import { getConfigActions } from '@/construction/config'
import { type ConstructionModel, createUnsupportedModel } from '@/construction/model'
import { ROOF_ASSEMBLIES } from '@/construction/roofs'

/**
 * Construct a roof based on its assembly configuration
 */
export function constructRoof(roof: Roof): ConstructionModel {
  const { getRoofAssemblyById } = getConfigActions()
  const assemblyConfig = getRoofAssemblyById(roof.assemblyId)

  if (!assemblyConfig) {
    return createUnsupportedModel('Invalid roof assembly', 'invalid-roof-assembly')
  }

  // Type-narrowed construction based on assembly type
  switch (assemblyConfig.type) {
    case 'monolithic':
      return ROOF_ASSEMBLIES.monolithic.construct(roof, assemblyConfig)
    case 'purlin':
      return ROOF_ASSEMBLIES.purlin.construct(roof, assemblyConfig)
  }
}
