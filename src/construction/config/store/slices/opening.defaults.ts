import type {
  EmptyOpeningAssemblyConfig,
  PlankedOpeningAssemblyConfig,
  PostOpeningAssemblyConfig,
  SimpleOpeningAssemblyConfig,
  ThresholdOpeningAssemblyConfig
} from '@/construction/config/types'
import { type MaterialId, dhf, lvl, roughWood, woodwool } from '@/construction/materials/material'

export const DEFAULT_SIMPLE_ASSEMBLY: SimpleOpeningAssemblyConfig = {
  id: 'oa_simple_default',
  name: 'Standard Opening',
  nameKey: $ => $.openings.defaults.standardOpening,
  type: 'simple',
  padding: 15,
  sillThickness: 60,
  sillMaterial: roughWood.id,
  headerThickness: 60,
  headerMaterial: roughWood.id
}

const emptyMaterial = '' as MaterialId

export const prefabSimpleAssembly: SimpleOpeningAssemblyConfig = {
  id: 'oa_simple_prefab_default',
  name: 'Prefab Opening without Planking',
  nameKey: $ => $.openings.defaults.prefabSimpleOpening,
  type: 'simple',
  padding: 15,
  sillThickness: 0,
  sillMaterial: emptyMaterial,
  headerThickness: 0,
  headerMaterial: emptyMaterial
}

export const postAssembly: PostOpeningAssemblyConfig = {
  id: 'oa_post_default',
  name: 'Standard Opening with Posts',
  nameKey: $ => $.openings.defaults.standardOpeningWithPosts,
  type: 'post',
  padding: 15,
  sillThickness: 60,
  sillMaterial: roughWood.id,
  headerThickness: 140,
  headerMaterial: roughWood.id,
  posts: {
    type: 'double',
    infillMaterial: woodwool.id,
    material: roughWood.id,
    thickness: 140,
    width: 100
  },
  replacePosts: true
}

export const prefabPostAssembly: PostOpeningAssemblyConfig = {
  id: 'oa_post_prefab_default',
  name: 'Prefab Opening with Posts',
  nameKey: $ => $.openings.defaults.prefabOpeningWithPosts,
  type: 'post',
  padding: 15,
  sillThickness: 0,
  sillMaterial: emptyMaterial,
  headerThickness: 0,
  headerMaterial: emptyMaterial,
  posts: {
    type: 'full',
    material: lvl.id,
    width: 75
  },
  replacePosts: false,
  postsSupportHeader: true
}

export const plankedAssembly: PlankedOpeningAssemblyConfig = {
  id: 'oa_planked_default',
  name: 'Standard Opening with Planking',
  nameKey: $ => $.openings.defaults.standardOpeningWithPlanking,
  type: 'planked',
  padding: 15,
  sillThickness: 60,
  sillMaterial: roughWood.id,
  headerThickness: 60,
  headerMaterial: roughWood.id,
  plankMaterial: dhf.id,
  plankThickness: 25
}

export const prefabPlankedAssembly: PlankedOpeningAssemblyConfig = {
  id: 'oa_planked_prefab_default',
  name: 'Prefab Opening with Planking',
  nameKey: $ => $.openings.defaults.prefabOpeningWithPlanking,
  type: 'planked',
  padding: 15,
  sillThickness: 0,
  sillMaterial: emptyMaterial,
  headerThickness: 0,
  headerMaterial: emptyMaterial,
  plankMaterial: lvl.id,
  plankThickness: 21
}

export const prefabThresholdAssembly: ThresholdOpeningAssemblyConfig = {
  id: 'oa_prefab_threshold_default',
  name: 'Standard Prefab Opening',
  nameKey: $ => $.openings.defaults.prefabDefaultOpening,
  type: 'threshold',
  padding: 15,
  defaultId: prefabPlankedAssembly.id,
  thresholds: [{ widthThreshold: 2000, assemblyId: prefabPostAssembly.id }]
}

export const DEFAULT_EMPTY_ASSEMBLY: EmptyOpeningAssemblyConfig = {
  id: 'oa_empty_default',
  name: 'Empty Opening',
  nameKey: $ => $.openings.defaults.emptyOpening,
  type: 'empty',
  padding: 15
}

export const DEFAULT_OPENING_ASSEMBLIES = [
  DEFAULT_SIMPLE_ASSEMBLY,
  postAssembly,
  plankedAssembly,
  DEFAULT_EMPTY_ASSEMBLY,
  prefabSimpleAssembly,
  prefabPostAssembly,
  prefabPlankedAssembly,
  prefabThresholdAssembly
]

export const DEFAULT_OPENING_ASSEMBLY_ID = DEFAULT_SIMPLE_ASSEMBLY.id
