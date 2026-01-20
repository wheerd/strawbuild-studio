import type { Resources, TFunction } from 'i18next'

// Predefined tag IDs must match translation keys
export type PredefinedTagId = keyof Resources['construction']['tags']

// Tag category IDs from translations
export type TagCategoryId = keyof Resources['construction']['tagCategories']

// Custom tag IDs follow the template pattern
export type CustomTagId = `${TagCategoryId}_${string}`

// Type for layer name keys (layers are in config namespace)
export type CustomTagTranslation = (t: TFunction) => string

// TagId is a union of predefined and custom IDs
export type TagId = PredefinedTagId | CustomTagId

// TagOrCategory type
export type TagOrCategory = TagId | TagCategoryId

// Predefined tags (built-in, uses translations)
export interface PredefinedTag {
  readonly id: PredefinedTagId
  readonly category: TagCategoryId
}

// Custom tags (user-created, has label)
export interface CustomTag {
  readonly id: CustomTagId
  readonly category: TagCategoryId
  readonly label: string
  readonly translation?: CustomTagTranslation
}

// Union type
export type Tag = PredefinedTag | CustomTag

// Type guards
export function isCustomTag(tag: Tag): tag is CustomTag {
  return 'label' in tag
}

export function isPredefinedTag(tag: Tag): tag is PredefinedTag {
  return !('label' in tag)
}

export const ALL_CATEGORIES = {
  straw: { id: 'straw' as const },
  'wall-part': { id: 'wall-part' as const },
  'wall-measurement': { id: 'wall-measurement' as const },
  'wall-assembly': { id: 'wall-assembly' as const },
  'wall-layer': { id: 'wall-layer' as const },
  opening: { id: 'opening' as const },
  'opening-measurement': { id: 'opening-measurement' as const },
  'module-part': { id: 'module-part' as const },
  'floor-layer': { id: 'floor-layer' as const },
  'floor-part': { id: 'floor-part' as const },
  'floor-assembly': { id: 'floor-assembly' as const },
  'floor-measurement': { id: 'floor-measurement' as const },
  'roof-part': { id: 'roof-part' as const },
  'roof-layer': { id: 'roof-layer' as const },
  'roof-side': { id: 'roof-side' as const },
  'roof-assembly': { id: 'roof-assembly' as const },
  'roof-measurement': { id: 'roof-measurement' as const },
  'ring-beam-part': { id: 'ring-beam-part' as const },
  'ring-beam-measurement': { id: 'ring-beam-measurement' as const },
  'ring-beam-assembly': { id: 'ring-beam-assembly' as const },
  'finished-measurement': { id: 'finished-measurement' as const },
  area: { id: 'area' as const },
  construction: { id: 'construction' as const },
  'storey-name': { id: 'storey-name' as const }
} as const satisfies Record<TagCategoryId, TagCategory>

export const CATEGORIES: Record<TagCategoryId, TagCategory> = ALL_CATEGORIES

export interface TagCategory {
  readonly id: TagCategoryId
}

export const createTagId = (category: TagCategoryId, name: string): CustomTagId =>
  `${category}_${name
    .trim()
    .toLowerCase()
    .replace(/[\W_]+/g, '-')}`

export const createTag = (category: TagCategoryId, name: string, translation?: CustomTagTranslation): CustomTag => ({
  category,
  id: createTagId(category, name),
  label: name,
  translation
})

// Straw tags
export const TAG_FULL_BALE: PredefinedTag = {
  id: 'straw_full-bale',
  category: 'straw'
}

export const TAG_PARTIAL_BALE: PredefinedTag = {
  id: 'straw_partial-bale',
  category: 'straw'
}

export const TAG_STRAW_FLAKES: PredefinedTag = {
  id: 'straw_flakes',
  category: 'straw'
}

export const TAG_STRAW_INFILL: PredefinedTag = {
  id: 'straw_infill',
  category: 'straw'
}

export const TAG_STRAW_STUFFED: PredefinedTag = {
  id: 'straw_stuffed',
  category: 'straw'
}

// Wall part tags
export const TAG_POST: PredefinedTag = {
  id: 'wall-part_post',
  category: 'wall-part'
}

export const TAG_HEADER: PredefinedTag = {
  id: 'wall-part_header',
  category: 'wall-part'
}

export const TAG_SILL: PredefinedTag = {
  id: 'wall-part_sill',
  category: 'wall-part'
}

export const TAG_INFILL: PredefinedTag = {
  id: 'wall-part_infill',
  category: 'wall-part'
}

export const TAG_TRIANGLE_BATTON: PredefinedTag = {
  id: 'wall-part_triangular-batten',
  category: 'wall-part'
}

export const TAG_OPENING_SIDE_PLANK: PredefinedTag = {
  id: 'wall-part_opening-side-plank',
  category: 'wall-part'
}

// Wall assembly type tags
export const TAG_INFILL_CONSTRUCTION: PredefinedTag = {
  id: 'wall-assembly_infill',
  category: 'wall-assembly'
}

export const TAG_MODULE_CONSTRUCTION: PredefinedTag = {
  id: 'wall-assembly_strawhenge',
  category: 'wall-assembly'
}

export const TAG_STRAWHENGE_CONSTRUCTION: PredefinedTag = {
  id: 'wall-assembly_modules',
  category: 'wall-assembly'
}

export const TAG_NON_STRAWBALE_CONSTRUCTION: PredefinedTag = {
  id: 'wall-assembly_non-strawbale',
  category: 'wall-assembly'
}

export const TAG_PREFAB_MODULE_CONSTRUCTION: PredefinedTag = {
  id: 'wall-assembly_prefab-modules',
  category: 'wall-assembly'
}

// Wall layer
export const TAG_WALL_LAYER_INSIDE: PredefinedTag = {
  id: 'wall-layer_inside',
  category: 'wall-layer'
}

export const TAG_WALL_LAYER_OUTSIDE: PredefinedTag = {
  id: 'wall-layer_outside',
  category: 'wall-layer'
}

// Floor layer
export const TAG_FLOOR_LAYER_TOP: PredefinedTag = {
  id: 'floor-layer_top',
  category: 'floor-layer'
}

export const TAG_FLOOR_LAYER_BOTTOM: PredefinedTag = {
  id: 'floor-layer_bottom',
  category: 'floor-layer'
}

// Roof layer
export const TAG_ROOF_LAYER_TOP: PredefinedTag = {
  id: 'roof-layer_top',
  category: 'roof-layer'
}

export const TAG_ROOF_LAYER_INSIDE: PredefinedTag = {
  id: 'roof-layer_inside',
  category: 'roof-layer'
}

export const TAG_ROOF_LAYER_OVERHANG: PredefinedTag = {
  id: 'roof-layer_overhang',
  category: 'roof-layer'
}

// Roof side tags
export const TAG_ROOF_SIDE_LEFT: PredefinedTag = {
  id: 'roof-side_left',
  category: 'roof-side'
}

export const TAG_ROOF_SIDE_RIGHT: PredefinedTag = {
  id: 'roof-side_right',
  category: 'roof-side'
}

// Opening tags
export const TAG_OPENING_WINDOW: PredefinedTag = {
  id: 'opening_window',
  category: 'opening'
}

export const TAG_OPENING_DOOR: PredefinedTag = {
  id: 'opening_door',
  category: 'opening'
}

// Measurement tags
export const TAG_POST_SPACING: PredefinedTag = {
  id: 'wall-measurement_post-spacing',
  category: 'wall-measurement'
}

export const TAG_OPENING_SPACING: PredefinedTag = {
  id: 'wall-measurement_opening-spacing',
  category: 'wall-measurement'
}

export const TAG_OPENING_WIDTH: PredefinedTag = {
  id: 'opening-measurement_opening-width',
  category: 'opening-measurement'
}

export const TAG_SILL_HEIGHT: PredefinedTag = {
  id: 'opening-measurement_sill-height',
  category: 'opening-measurement'
}

export const TAG_HEADER_FROM_TOP: PredefinedTag = {
  id: 'opening-measurement_header-from-top',
  category: 'opening-measurement'
}

export const TAG_HEADER_HEIGHT: PredefinedTag = {
  id: 'opening-measurement_header-height',
  category: 'opening-measurement'
}

export const TAG_OPENING_HEIGHT: PredefinedTag = {
  id: 'opening-measurement_opening-height',
  category: 'opening-measurement'
}

// Ring beam measurements

export const TAG_RING_BEAM_OUTER: PredefinedTag = {
  id: 'ring-beam-measurement_ring-beam-outer',
  category: 'ring-beam-measurement'
}

export const TAG_RING_BEAM_INNER: PredefinedTag = {
  id: 'ring-beam-measurement_ring-beam-inner',
  category: 'ring-beam-measurement'
}

// Ring beam parts

export const TAG_PLATE: PredefinedTag = {
  id: 'ring-beam-part_plate',
  category: 'ring-beam-part'
}

export const TAG_STUD_WALL: PredefinedTag = {
  id: 'ring-beam-part_stud-wall',
  category: 'ring-beam-part'
}

export const TAG_WATERPROOFING: PredefinedTag = {
  id: 'ring-beam-part_waterproofing',
  category: 'ring-beam-part'
}

export const TAG_RB_INSULATION: PredefinedTag = {
  id: 'ring-beam-part_insulation',
  category: 'ring-beam-part'
}

export const TAG_RB_INFILL: PredefinedTag = {
  id: 'ring-beam-part_infill',
  category: 'ring-beam-part'
}

// Wall measurements

export const TAG_WALL_LENGTH: PredefinedTag = {
  id: 'wall-measurement_wall-length',
  category: 'wall-measurement'
}

export const TAG_WALL_HEIGHT: PredefinedTag = {
  id: 'wall-measurement_wall-height',
  category: 'wall-measurement'
}

export const TAG_WALL_CONSTRUCTION_HEIGHT: PredefinedTag = {
  id: 'wall-measurement_wall-construction-height',
  category: 'wall-measurement'
}

export const TAG_RING_BEAM_HEIGHT: PredefinedTag = {
  id: 'ring-beam-measurement_ring-beam-height',
  category: 'ring-beam-measurement'
}

export const TAG_MODULE_WIDTH: PredefinedTag = {
  id: 'wall-measurement_module-width',
  category: 'wall-measurement'
}

export const TAG_WALL_LENGTH_OUTSIDE: PredefinedTag = {
  id: 'finished-measurement_wall-length-outside',
  category: 'finished-measurement'
}

export const TAG_WALL_LENGTH_INSIDE: PredefinedTag = {
  id: 'finished-measurement_wall-length-inside',
  category: 'finished-measurement'
}

export const TAG_WALL_CONSTRUCTION_LENGTH_OUTSIDE: PredefinedTag = {
  id: 'wall-measurement_wall-construction-length-outside',
  category: 'wall-measurement'
}

export const TAG_WALL_CONSTRUCTION_LENGTH_INSIDE: PredefinedTag = {
  id: 'wall-measurement_wall-construction-length-inside',
  category: 'wall-measurement'
}

// Area tags
export const TAG_PERIMETER_INSIDE: PredefinedTag = {
  id: 'area_perimeter-inside',
  category: 'area'
}

export const TAG_PERIMETER_OUTSIDE: PredefinedTag = {
  id: 'area_perimeter-outside',
  category: 'area'
}

// Construction parts
export const TAG_BASE_PLATE: PredefinedTag = {
  id: 'construction_base-plate',
  category: 'construction'
}

export const TAG_TOP_PLATE: PredefinedTag = {
  id: 'construction_top-plate',
  category: 'construction'
}

export const TAG_WALLS: PredefinedTag = {
  id: 'construction_walls',
  category: 'construction'
}

export const TAG_MODULE: PredefinedTag = {
  id: 'construction_module',
  category: 'construction'
}

export const TAG_FLOOR: PredefinedTag = {
  id: 'construction_floor',
  category: 'construction'
}

export const TAG_ROOF: PredefinedTag = {
  id: 'construction_roof',
  category: 'construction'
}

export const TAG_STOREY: PredefinedTag = {
  id: 'construction_storey',
  category: 'construction'
}

export const TAG_LAYERS: PredefinedTag = {
  id: 'construction_layers',
  category: 'construction'
}

// Floor wood
export const TAG_JOIST: PredefinedTag = {
  id: 'floor-part_joist',
  category: 'floor-part'
}

export const TAG_FLOOR_WALL_BEAM: PredefinedTag = {
  id: 'floor-part_wall-beam',
  category: 'floor-part'
}

export const TAG_FLOOR_INFILL: PredefinedTag = {
  id: 'floor-part_infill',
  category: 'floor-part'
}

export const TAG_FLOOR_FRAME: PredefinedTag = {
  id: 'floor-part_frame',
  category: 'floor-part'
}

export const TAG_FLOOR_OPENING_FRAME: PredefinedTag = {
  id: 'floor-part_opening-frame',
  category: 'floor-part'
}

export const TAG_SUBFLOOR: PredefinedTag = {
  id: 'floor-part_subfloor',
  category: 'floor-part'
}

export const TAG_FLOOR_CEILING_SHEATHING: PredefinedTag = {
  id: 'floor-part_ceiling-sheathing',
  category: 'floor-part'
}

// Floor Measurement tags
export const TAG_JOIST_SPACING: PredefinedTag = {
  id: 'floor-measurement_joist-spacing',
  category: 'floor-measurement'
}

export const TAG_JOIST_LENGTH: PredefinedTag = {
  id: 'floor-measurement_joist-length',
  category: 'floor-measurement'
}

// Floor assembly type tags
export const TAG_MONOLITHIC_FLOOR: PredefinedTag = {
  id: 'floor-assembly_monolithic',
  category: 'floor-assembly'
}

export const TAG_JOIST_FLOOR: PredefinedTag = {
  id: 'floor-assembly_joist',
  category: 'floor-assembly'
}

export const TAG_FILLED_FLOOR: PredefinedTag = {
  id: 'floor-assembly_filled',
  category: 'floor-assembly'
}

export const TAG_HANGING_JOIST_FLOOR: PredefinedTag = {
  id: 'floor-assembly_hanging-joist',
  category: 'floor-assembly'
}

// Roof parts
export const TAG_PURLIN: PredefinedTag = {
  id: 'roof-part_purlin',
  category: 'roof-part'
}

export const TAG_RAFTER: PredefinedTag = {
  id: 'roof-part_rafter',
  category: 'roof-part'
}

export const TAG_DECKING: PredefinedTag = {
  id: 'roof-part_decking',
  category: 'roof-part'
}

export const TAG_INSIDE_SHEATHING: PredefinedTag = {
  id: 'roof-part_inside-sheathing',
  category: 'roof-part'
}

export const TAG_RIDGE_BEAM: PredefinedTag = {
  id: 'roof-part_ridge-beam',
  category: 'roof-part'
}

export const TAG_ROOF_INFILL: PredefinedTag = {
  id: 'roof-part_infill',
  category: 'roof-part'
}

// Roof assembly type tags
export const TAG_MONOLITHIC_ROOF: PredefinedTag = {
  id: 'roof-assembly_monolithic',
  category: 'roof-assembly'
}

export const TAG_PURLIN_ROOF: PredefinedTag = {
  id: 'roof-assembly_purlin',
  category: 'roof-assembly'
}

// Roof Measurement tags
export const TAG_RAFTER_SPACING: PredefinedTag = {
  id: 'roof-measurement_rafter-spacing',
  category: 'roof-measurement'
}

export const TAG_RAFTER_LENGTH: PredefinedTag = {
  id: 'roof-measurement_rafter-length',
  category: 'roof-measurement'
}

export const TAG_PURLIN_LENGTH: PredefinedTag = {
  id: 'roof-measurement_purlin-length',
  category: 'roof-measurement'
}

export const TAG_PURLIN_RISE: PredefinedTag = {
  id: 'roof-measurement_purlin-rise',
  category: 'roof-measurement'
}

export const TAG_PURLIN_SPACING: PredefinedTag = {
  id: 'roof-measurement_purlin-spacing',
  category: 'roof-measurement'
}

// Module parts
export const TAG_MODULE_FRAME: PredefinedTag = {
  id: 'module-part_frame',
  category: 'module-part'
}

export const TAG_MODULE_SPACER: PredefinedTag = {
  id: 'module-part_spacer',
  category: 'module-part'
}

export const TAG_MODULE_INFILL: PredefinedTag = {
  id: 'module-part_infill',
  category: 'module-part'
}
