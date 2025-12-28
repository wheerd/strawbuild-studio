export interface Tag {
  readonly id: TagId
  readonly label: string
  readonly category: TagCategoryId
  readonly custom?: boolean
}

export type TagId = `${TagCategoryId}_${string}`

export type TagCategoryId = keyof typeof ALL_CATEGORIES

export type TagOrCategory = TagId | TagCategoryId

export const ALL_CATEGORIES = {
  straw: { label: 'Straw' },

  'wall-part': { label: 'Wall Wood' },
  'wall-measurement': { label: 'Wall Measurement' },
  'wall-assembly': { label: 'Wall Assembly' },
  'wall-layer': { label: 'Wall Layers' },

  opening: { label: 'Opening' },
  'opening-measurement': { label: 'Opening Measurement' },

  'module-part': { label: 'Module Parts' },

  'floor-layer': { label: 'Floor Layers' },
  'floor-part': { label: 'Floor Part' },
  'floor-assembly': { label: 'Floor Assembly' },
  'floor-measurement': { label: 'Floor Measurement' },

  'roof-part': { label: 'Roof Parts' },
  'roof-layer': { label: 'Roof Layers' },
  'roof-side': { label: 'Roof Side' },
  'roof-assembly': { label: 'Roof Assembly' },
  'roof-measurement': { label: 'Roof Measurement' },

  'ring-beam-part': { label: 'Ring Beam Part' },
  'ring-beam-measurement': { label: 'Ring Beam Measurement' },
  'ring-beam-assembly': { label: 'Ring Beam Assembly' },

  'finished-measurement': { label: 'Finished Measurement' },

  area: { label: 'Area' },
  construction: { label: 'Construction' },

  'storey-name': { label: 'Storey Name' }
} as const

export const CATEGORIES: Record<TagCategoryId, TagCategory> = ALL_CATEGORIES

export interface TagCategory {
  label: string
}

export const createTagId = (category: TagCategoryId, name: string): TagId =>
  `${category}_${name
    .trim()
    .toLowerCase()
    .replace(/[\W_]+/g, '-')}`

export const createTag = (category: TagCategoryId, name: string): Tag => ({
  category,
  id: createTagId(category, name),
  label: name,
  custom: true
})

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
  id: 'wall-part_post',
  label: 'Post',
  category: 'wall-part'
}

export const TAG_HEADER: Tag = {
  id: 'wall-part_header',
  label: 'Header',
  category: 'wall-part'
}

export const TAG_SILL: Tag = {
  id: 'wall-part_sill',
  label: 'Sill',
  category: 'wall-part'
}

export const TAG_INFILL: Tag = {
  id: 'wall-part_infill',
  label: 'Infill',
  category: 'wall-part'
}

// Wall assembly type tags
export const TAG_INFILL_CONSTRUCTION: Tag = {
  id: 'wall-assembly_infill',
  label: 'Type: Infill',
  category: 'wall-assembly'
}

export const TAG_MODULE_CONSTRUCTION: Tag = {
  id: 'wall-assembly_strawhenge',
  label: 'Type: Modules',
  category: 'wall-assembly'
}

export const TAG_STRAWHENGE_CONSTRUCTION: Tag = {
  id: 'wall-assembly_strawhenge',
  label: 'Type: Strawhenge',
  category: 'wall-assembly'
}

export const TAG_NON_STRAWBALE_CONSTRUCTION: Tag = {
  id: 'wall-assembly_non-strawbale',
  label: 'Type: Non-Strawbale',
  category: 'wall-assembly'
}

// Wall layer
export const TAG_WALL_LAYER_INSIDE: Tag = {
  id: 'wall-layer_inside',
  label: 'Inside Wall Layers',
  category: 'wall-layer'
}

export const TAG_WALL_LAYER_OUTSIDE: Tag = {
  id: 'wall-layer_outside',
  label: 'Outside Wall Layers',
  category: 'wall-layer'
}

// Floor layer
export const TAG_FLOOR_LAYER_TOP: Tag = {
  id: 'floor-layer_top',
  label: 'Floor Finish Layers',
  category: 'floor-layer'
}

export const TAG_FLOOR_LAYER_BOTTOM: Tag = {
  id: 'floor-layer_bottom',
  label: 'Ceiling Finish Layers',
  category: 'floor-layer'
}

// Roof layer
export const TAG_ROOF_LAYER_TOP: Tag = {
  id: 'roof-layer_top',
  label: 'Roof Top Layers',
  category: 'roof-layer'
}

export const TAG_ROOF_LAYER_INSIDE: Tag = {
  id: 'roof-layer_inside',
  label: 'Ceiling Layers',
  category: 'roof-layer'
}

export const TAG_ROOF_LAYER_OVERHANG: Tag = {
  id: 'roof-layer_overhang',
  label: 'Overhang Layers',
  category: 'roof-layer'
}

// Roof side tags
export const TAG_ROOF_SIDE_LEFT: Tag = {
  id: 'roof-side_left',
  label: 'Left Roof Side',
  category: 'roof-side'
}

export const TAG_ROOF_SIDE_RIGHT: Tag = {
  id: 'roof-side_right',
  label: 'Right Roof Side',
  category: 'roof-side'
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
  id: 'wall-measurement_post-spacing',
  label: 'Post Spacing',
  category: 'wall-measurement'
}

export const TAG_OPENING_SPACING: Tag = {
  id: 'wall-measurement_opening-spacing',
  label: 'Opening Spacing',
  category: 'wall-measurement'
}

export const TAG_OPENING_WIDTH: Tag = {
  id: 'opening-measurement_opening-width',
  label: 'Opening Width',
  category: 'opening-measurement'
}

export const TAG_SILL_HEIGHT: Tag = {
  id: 'opening-measurement_sill-height',
  label: 'Sill Height',
  category: 'opening-measurement'
}

export const TAG_HEADER_FROM_TOP: Tag = {
  id: 'opening-measurement_header-from-top',
  label: 'Header From Top',
  category: 'opening-measurement'
}

export const TAG_HEADER_HEIGHT: Tag = {
  id: 'opening-measurement_header-height',
  label: 'Header Height',
  category: 'opening-measurement'
}

export const TAG_OPENING_HEIGHT: Tag = {
  id: 'opening-measurement_opening-height',
  label: 'Opening Height',
  category: 'opening-measurement'
}

// Ring beam measurements

export const TAG_RING_BEAM_OUTER: Tag = {
  id: 'ring-beam-measurement_ring-beam-outer',
  label: 'Ring Beam Outer',
  category: 'ring-beam-measurement'
}

export const TAG_RING_BEAM_INNER: Tag = {
  id: 'ring-beam-measurement_ring-beam-inner',
  label: 'Ring Beam Inner',
  category: 'ring-beam-measurement'
}

// Ring beam parts

export const TAG_PLATE: Tag = {
  id: 'ring-beam-part_plate',
  label: 'Plate',
  category: 'ring-beam-part'
}

export const TAG_STUD_WALL: Tag = {
  id: 'ring-beam-part_stud-wall',
  label: 'Stud Wall',
  category: 'ring-beam-part'
}

export const TAG_WATERPROOFING: Tag = {
  id: 'ring-beam-part_waterproofing',
  label: 'Waterproofing Layer',
  category: 'ring-beam-part'
}

export const TAG_RB_INSULATION: Tag = {
  id: 'ring-beam-part_insulation',
  label: 'Insulation',
  category: 'ring-beam-part'
}

// Wall measurements

export const TAG_WALL_LENGTH: Tag = {
  id: 'wall-measurement_wall-length',
  label: 'Wall Length',
  category: 'wall-measurement'
}

export const TAG_WALL_HEIGHT: Tag = {
  id: 'wall-measurement_wall-height',
  label: 'Wall Height',
  category: 'wall-measurement'
}

export const TAG_WALL_CONSTRUCTION_HEIGHT: Tag = {
  id: 'wall-measurement_wall-construction-height',
  label: 'Wall Construction Height',
  category: 'wall-measurement'
}

export const TAG_RING_BEAM_HEIGHT: Tag = {
  id: 'ring-beam-measurement_ring-beam-height',
  label: 'Ring Beam Height',
  category: 'ring-beam-measurement'
}

export const TAG_MODULE_WIDTH: Tag = {
  id: 'wall-measurement_module-width',
  label: 'Module Width',
  category: 'wall-measurement'
}

export const TAG_WALL_LENGTH_OUTSIDE: Tag = {
  id: 'finished-measurement_wall-length-outside',
  label: 'Wall Length Outside',
  category: 'finished-measurement'
}

export const TAG_WALL_LENGTH_INSIDE: Tag = {
  id: 'finished-measurement_wall-length-inside',
  label: 'Wall Length Inside',
  category: 'finished-measurement'
}

export const TAG_WALL_CONSTRUCTION_LENGTH_OUTSIDE: Tag = {
  id: 'wall-measurement_wall-construction-length-outside',
  label: 'Wall Construction Length Outside',
  category: 'wall-measurement'
}

export const TAG_WALL_CONSTRUCTION_LENGTH_INSIDE: Tag = {
  id: 'wall-measurement_wall-construction-length-inside',
  label: 'Wall Construction Length Inside',
  category: 'wall-measurement'
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

export const TAG_ROOF: Tag = {
  id: 'construction_roof',
  label: 'Roof',
  category: 'construction'
}

export const TAG_STOREY: Tag = {
  id: 'construction_storey',
  label: 'Storey',
  category: 'construction'
}

export const TAG_LAYERS: Tag = {
  id: 'construction_layers',
  label: 'Layers',
  category: 'construction'
}

// Floor wood
export const TAG_JOIST: Tag = {
  id: 'floor-part_joist',
  label: 'Joist',
  category: 'floor-part'
}

export const TAG_FLOOR_WALL_BEAM: Tag = {
  id: 'floor-part_wall-beam',
  label: 'Wall Beam',
  category: 'floor-part'
}

export const TAG_FLOOR_INFILL: Tag = {
  id: 'floor-part_infill',
  label: 'Wall Infill',
  category: 'floor-part'
}

export const TAG_FLOOR_FRAME: Tag = {
  id: 'floor-part_frame',
  label: 'Frame',
  category: 'floor-part'
}

export const TAG_FLOOR_OPENING_FRAME: Tag = {
  id: 'floor-part_opening-frame',
  label: 'Opening Frame',
  category: 'floor-part'
}

export const TAG_SUBFLOOR: Tag = {
  id: 'floor-part_subfloor',
  label: 'Subfloor',
  category: 'floor-part'
}

export const TAG_FLOOR_CEILING_SHEATHING: Tag = {
  id: 'floor-part_ceiling-sheathing',
  label: 'Ceiling Sheathing',
  category: 'floor-part'
}

// Floor Measurement tags
export const TAG_JOIST_SPACING: Tag = {
  id: 'floor-measurement_joist-spacing',
  label: 'Joist Spacing',
  category: 'floor-measurement'
}

export const TAG_JOIST_LENGTH: Tag = {
  id: 'floor-measurement_joist-length',
  label: 'Joist Length',
  category: 'floor-measurement'
}

// Floor assembly type tags
export const TAG_MONOLITHIC_FLOOR: Tag = {
  id: 'floor-assembly_monolithic',
  label: 'Type: Monolithic',
  category: 'floor-assembly'
}

export const TAG_JOIST_FLOOR: Tag = {
  id: 'floor-assembly_joist',
  label: 'Type: Joist',
  category: 'floor-assembly'
}

export const TAG_FILLED_FLOOR: Tag = {
  id: 'floor-assembly_filled',
  label: 'Type: Filled',
  category: 'floor-assembly'
}

// Roof parts
export const TAG_PURLIN: Tag = {
  id: 'roof-part_purlin',
  label: 'Purlin',
  category: 'roof-part'
}

export const TAG_RAFTER: Tag = {
  id: 'roof-part_rafter',
  label: 'Rafter',
  category: 'roof-part'
}

export const TAG_DECKING: Tag = {
  id: 'roof-part_decking',
  label: 'Decking',
  category: 'roof-part'
}

export const TAG_INSIDE_SHEATHING: Tag = {
  id: 'roof-part_inside-sheathing',
  label: 'Inside Sheathing',
  category: 'roof-part'
}

export const TAG_RIDGE_BEAM: Tag = {
  id: 'roof-part_ridge-beam',
  label: 'Ridge Beam',
  category: 'roof-part'
}

export const TAG_ROOF_INFILL: Tag = {
  id: 'roof-part_infill',
  label: 'Infill',
  category: 'roof-part'
}

// Roof assembly type tags
export const TAG_MONOLITHIC_ROOF: Tag = {
  id: 'roof-assembly_monolithic',
  label: 'Type: Monolithic',
  category: 'roof-assembly'
}

export const TAG_PURLIN_ROOF: Tag = {
  id: 'roof-assembly_purlin',
  label: 'Type: Purlin',
  category: 'roof-assembly'
}

// Roof Measurement tags
export const TAG_RAFTER_SPACING: Tag = {
  id: 'roof-measurement_rafter-spacing',
  label: 'Rafter Spacing',
  category: 'roof-measurement'
}

export const TAG_RAFTER_LENGTH: Tag = {
  id: 'roof-measurement_rafter-length',
  label: 'Rafter Length',
  category: 'roof-measurement'
}

export const TAG_PURLIN_LENGTH: Tag = {
  id: 'roof-measurement_purlin-length',
  label: 'Purlin Length',
  category: 'roof-measurement'
}

export const TAG_PURLIN_RISE: Tag = {
  id: 'roof-measurement_purlin-rise',
  label: 'Purlin Rise',
  category: 'roof-measurement'
}

export const TAG_PURLIN_SPACING: Tag = {
  id: 'roof-measurement_purlin-spacing',
  label: 'Purlin Spacing',
  category: 'roof-measurement'
}

// Module parts
export const TAG_MODULE_FRAME: Tag = {
  id: 'module-part_frame',
  label: 'Frame',
  category: 'module-part'
}

export const TAG_MODULE_SPACER: Tag = {
  id: 'module-part_spacer',
  label: 'Spacer',
  category: 'module-part'
}

export const TAG_MODULE_INFILL: Tag = {
  id: 'module-part_infill',
  label: 'Infill',
  category: 'module-part'
}
