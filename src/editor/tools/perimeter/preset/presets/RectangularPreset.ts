import { RectIcon } from '@/editor/tools/perimeter/preset/presets/Icons'
import { RectangularPresetDialog } from '@/editor/tools/perimeter/preset/presets/RectangularPresetDialog'
import { type Vec2, newVec2 } from '@/shared/geometry'

import type { PerimeterPreset, RectangularPresetConfig } from './types'

/**
 * Rectangular perimeter preset implementation
 * Creates a rectangular perimeter with specified width and length
 */
export class RectangularPreset implements PerimeterPreset<RectangularPresetConfig> {
  readonly type = 'rectangular'
  readonly icon = RectIcon
  readonly dialog = RectangularPresetDialog

  /**
   * Generate polygon points for a rectangle centered at origin.
   * The polygon represents the configured reference side (inside or outside).
   * Returns points in clockwise order for perimeter creation.
   */
  getPolygonPoints(config: RectangularPresetConfig): Vec2[] {
    const halfWidth = config.width / 2
    const halfLength = config.length / 2

    // Create rectangle centered at origin using inside dimensions, clockwise order
    return [
      newVec2(-halfWidth, -halfLength), // Bottom-left
      newVec2(halfWidth, -halfLength), // Bottom-right
      newVec2(halfWidth, halfLength), // Top-right
      newVec2(-halfWidth, halfLength) // Top-left
    ]
  }

  /**
   * Get the bounds of the rectangle
   */
  getBounds(config: RectangularPresetConfig): { width: number; height: number } {
    return {
      width: config.width,
      height: config.length
    }
  }

  /**
   * Validate rectangular preset configuration
   */
  validateConfig(config: RectangularPresetConfig): boolean {
    const interiorWidth = config.referenceSide === 'inside' ? config.width : config.width - 2 * config.thickness
    const interiorLength = config.referenceSide === 'inside' ? config.length : config.length - 2 * config.thickness

    return interiorWidth > 0 && interiorLength > 0 && config.thickness > 0 && config.wallAssemblyId.length > 0
  }
}
