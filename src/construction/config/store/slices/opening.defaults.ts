import type {
  EmptyOpeningAssemblyConfig,
  PlankedOpeningAssemblyConfig,
  PostOpeningAssemblyConfig,
  SimpleOpeningAssemblyConfig
} from '@/construction/config/types'
import { dhf, roughWood, woodwool } from '@/construction/materials/material'

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

const postAssembly: PostOpeningAssemblyConfig = {
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

const plankedAssembly: PlankedOpeningAssemblyConfig = {
  id: 'oa_planked_default',
  name: 'Standard Opening with Posts',
  nameKey: $ => $.openings.defaults.standardOpeningWithPlanking,
  type: 'planked',
  padding: 15,
  sillThickness: 60,
  sillMaterial: roughWood.id,
  headerThickness: 140,
  headerMaterial: roughWood.id,
  plankMaterial: dhf.id,
  plankThickness: 25
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
  DEFAULT_EMPTY_ASSEMBLY
]

export const DEFAULT_OPENING_ASSEMBLY_ID = DEFAULT_SIMPLE_ASSEMBLY.id
