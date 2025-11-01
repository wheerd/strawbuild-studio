export interface Tag {
  readonly id: TagId
  readonly label: string
  readonly category: TagCategoryId
}

export type TagId = `${TagCategoryId}_${string}`

export type TagCategoryId = keyof typeof ALL_CATEGORIES

export const ALL_CATEGORIES = {
  straw: { label: 'Straw' },
  'wall-wood': { label: 'Wall Wood' },
  'wall-construction-type': { label: 'Wall Construction Type' },
  measurement: { label: 'Measurement' },
  opening: { label: 'Opening' },
  area: { label: 'Area' },
  construction: { label: 'Construction' }
} as const

export const CATEGORIES: Record<TagCategoryId, TagCategory> = ALL_CATEGORIES

export interface TagCategory {
  label: string
}

// Straw tags
export const TAG_FULL_BALE: Tag = {
  id: 'straw_full-bale',
  label: 'Full Strawbale',
  category: 'straw'
}

export const TAG_PARTIAL_BALE: Tag = {
  id: 'straw_partial-bale',
  label: 'Partial Strawbale',
  category: 'straw'
}

export const TAG_STRAW_FLAKES: Tag = {
  id: 'straw_flakes',
  label: 'Straw Flakes',
  category: 'straw'
}

export const TAG_STRAW_INFILL: Tag = {
  id: 'straw_infill',
  label: 'Generic Straw Infill',
  category: 'straw'
}

export const TAG_STRAW_STUFFED: Tag = {
  id: 'straw_stuffed',
  label: 'Stuffed Straw',
  category: 'straw'
}

// Wall wood tags
export const TAG_POST: Tag = {
  id: 'wall-wood_post',
  label: 'Post',
  category: 'wall-wood'
}

export const TAG_PLATE: Tag = {
  id: 'wall-wood_plate',
  label: 'Plate',
  category: 'wall-wood'
}

export const TAG_FRAME: Tag = {
  id: 'wall-wood_frame',
  label: 'Frame',
  category: 'wall-wood'
}

export const TAG_HEADER: Tag = {
  id: 'wall-wood_header',
  label: 'Header',
  category: 'wall-wood'
}

export const TAG_SILL: Tag = {
  id: 'wall-wood_sill',
  label: 'Sill',
  category: 'wall-wood'
}

// Construction type tags
export const TAG_INFILL_CONSTRUCTION: Tag = {
  id: 'wall-construction-type_infill',
  label: 'Infill Construction',
  category: 'wall-construction-type'
}

export const TAG_STRAWHENGE_CONSTRUCTION: Tag = {
  id: 'wall-construction-type_strawhenge',
  label: 'Strawhenge Construction',
  category: 'wall-construction-type'
}

export const TAG_NON_STRAWBALE_CONSTRUCTION: Tag = {
  id: 'wall-construction-type_non-strawbale',
  label: 'Non-Strawbale Construction',
  category: 'wall-construction-type'
}

export const TAG_WALL_LAYER_INSIDE: Tag = {
  id: 'construction_wall-layer-inside',
  label: 'Inside Wall Layers',
  category: 'construction'
}

export const TAG_WALL_LAYER_OUTSIDE: Tag = {
  id: 'construction_wall-layer-outside',
  label: 'Outside Wall Layers',
  category: 'construction'
}

// Opening tags
export const TAG_OPENING_WINDOW: Tag = {
  id: 'opening_window',
  label: 'Window',
  category: 'opening'
}

export const TAG_OPENING_DOOR: Tag = {
  id: 'opening_door',
  label: 'Door',
  category: 'opening'
}

// Measurement tags
export const TAG_POST_SPACING: Tag = {
  id: 'measurement_post-spacing',
  label: 'Post Spacing',
  category: 'measurement'
}

export const TAG_OPENING_SPACING: Tag = {
  id: 'measurement_opening-spacing',
  label: 'Opening Spacing',
  category: 'measurement'
}

export const TAG_OPENING_WIDTH: Tag = {
  id: 'measurement_opening-width',
  label: 'Opening Width',
  category: 'measurement'
}

export const TAG_SILL_HEIGHT: Tag = {
  id: 'measurement_sill-height',
  label: 'Sill Height',
  category: 'measurement'
}

export const TAG_HEADER_HEIGHT: Tag = {
  id: 'measurement_header-height',
  label: 'Header Height',
  category: 'measurement'
}

export const TAG_OPENING_HEIGHT: Tag = {
  id: 'measurement_opening-height',
  label: 'Opening Height',
  category: 'measurement'
}

export const TAG_RING_BEAM_OUTER: Tag = {
  id: 'measurement_ring-beam-outer',
  label: 'Ring Beam Outer',
  category: 'measurement'
}

export const TAG_RING_BEAM_INNER: Tag = {
  id: 'measurement_ring-beam-inner',
  label: 'Ring Beam Inner',
  category: 'measurement'
}

export const TAG_WALL_LENGTH: Tag = {
  id: 'measurement_wall-length',
  label: 'Wall Length',
  category: 'measurement'
}

export const TAG_MODULE_WIDTH: Tag = {
  id: 'measurement_module-width',
  label: 'Module Width',
  category: 'measurement'
}

// Area tags
export const TAG_PERIMETER_INSIDE: Tag = {
  id: 'area_perimeter-inside',
  label: 'Perimeter Inside',
  category: 'area'
}

export const TAG_PERIMETER_OUTSIDE: Tag = {
  id: 'area_perimeter-outside',
  label: 'Perimeter Outside',
  category: 'area'
}

// Construction parts
export const TAG_BASE_PLATE: Tag = {
  id: 'construction_base-plate',
  label: 'Base Plate',
  category: 'construction'
}

export const TAG_TOP_PLATE: Tag = {
  id: 'construction_top-plate',
  label: 'Top Plate',
  category: 'construction'
}

export const TAG_WALLS: Tag = {
  id: 'construction_walls',
  label: 'Walls',
  category: 'construction'
}

export const TAG_MODULE: Tag = {
  id: 'construction_module',
  label: 'Module',
  category: 'construction'
}

export const TAG_FLOOR: Tag = {
  id: 'construction_floor',
  label: 'Floor',
  category: 'construction'
}

export const TAG_STOREY: Tag = {
  id: 'construction_storey',
  label: 'Storey',
  category: 'construction'
}

export const TAG_INSIDE_LAYERS: Tag = {
  id: 'construction_inside-layers',
  label: 'Inside Layers',
  category: 'construction'
}

export const TAG_OUTSIDE_LAYERS: Tag = {
  id: 'construction_outside-layers',
  label: 'Outside Layers',
  category: 'construction'
}
