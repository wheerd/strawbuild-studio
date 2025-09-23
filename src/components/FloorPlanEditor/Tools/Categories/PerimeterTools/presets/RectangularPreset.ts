import type { Vec2 } from '@/types/geometry'
import { createVec2 } from '@/types/geometry'
import type { PerimeterPreset, RectangularPresetConfig } from './types'

/**
 * Rectangular perimeter preset implementation
 * Creates a rectangular perimeter with specified width and length
 */
export class RectangularPreset implements PerimeterPreset<RectangularPresetConfig> {
  readonly type = 'rectangular'
  readonly name = 'Rectangular'

  /**
   * Generate polygon points for a rectangle centered at origin
   * Uses inside dimensions - the polygon represents the interior space
   * Returns points in clockwise order for perimeter creation
   */
  getPolygonPoints(config: RectangularPresetConfig): Vec2[] {
    const halfWidth = config.width / 2
    const halfLength = config.length / 2

    // Create rectangle centered at origin using inside dimensions, clockwise order
    return [
      createVec2(-halfWidth, -halfLength), // Bottom-left
      createVec2(halfWidth, -halfLength), // Bottom-right
      createVec2(halfWidth, halfLength), // Top-right
      createVec2(-halfWidth, halfLength) // Top-left
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
    return config.width > 0 && config.length > 0 && config.thickness > 0 && config.constructionMethodId.length > 0
  }
}
