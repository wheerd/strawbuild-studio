// UI Scale calculation constants
export const UI_SCALE_MIN_ZOOM = 0.02
export const UI_SCALE_MAX_ZOOM = 0.4
export const UI_SCALE_FACTOR = 0.2

// Default styling
export const DIMENSION_DEFAULT_FONT_SIZE = 50
export const DIMENSION_DEFAULT_STROKE_WIDTH = 5
export const DIMENSION_SMALL_FONT_SIZE = 40

/**
 * Wall dimension layer offsets.
 *
 * Used for layering measurement indicators at different offsets from walls.
 * Layers are spaced by 60 world units.
 *
 * Outside:
 * - 1 (60): Entity spacing, entity width
 * - 2 (120): Entity wall position (distance from corners)
 * - 3 (180): Wall length
 * - 4 (240): HV badge
 * - 5 (300): Misc constraints
 *
 * Inside:
 * - 1 (-60): Entity spacing, opening dimensions
 * - 2 (-120): Entity wall position (distance from corners)
 * - 3 (-180): Wall length
 */
export type WallDimLayer = 1 | 2 | 3 | 4 | 5
export const WALL_DIM_LAYER_OFFSET = 60
