import type {
  EmptyOpeningAssemblyConfig,
  PostOpeningAssemblyConfig,
  SimpleOpeningAssemblyConfig
} from '@/construction/config/types'
import { wood, woodwool } from '@/construction/materials/material'

export const DEFAULT_SIMPLE_ASSEMBLY: SimpleOpeningAssemblyConfig = {
  id: 'oa_simple_default',
  name: 'Standard Opening',
  type: 'simple',
  padding: 15,
  sillThickness: 60,
  sillMaterial: wood.id,
  headerThickness: 60,
  headerMaterial: wood.id
}

const postAssembly: PostOpeningAssemblyConfig = {
  id: 'oa_post_default',
  name: 'Standard Opening with Posts',
  type: 'post',
  padding: 15,
  sillThickness: 60,
  sillMaterial: wood.id,
  headerThickness: 140,
  headerMaterial: wood.id,
  posts: {
    type: 'double',
    infillMaterial: woodwool.id,
    material: wood.id,
    thickness: 140,
    width: 100
  },
  replacePosts: true
}

export const DEFAULT_EMPTY_ASSEMBLY: EmptyOpeningAssemblyConfig = {
  id: 'oa_empty_default',
  name: 'Empty Opening',
  type: 'empty',
  padding: 15
}

export const DEFAULT_OPENING_ASSEMBLIES = [DEFAULT_SIMPLE_ASSEMBLY, postAssembly, DEFAULT_EMPTY_ASSEMBLY]

export const DEFAULT_OPENING_ASSEMBLY_ID = DEFAULT_SIMPLE_ASSEMBLY.id
