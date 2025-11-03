import { vec2 } from 'gl-matrix'

import type { PerimeterPreset, RectangularPresetConfig } from './types'

/**
 * Rectangular perimeter preset implementation
 * Creates a rectangular perimeter with specified width and length
 */
export class RectangularPreset implements PerimeterPreset<RectangularPresetConfig> {
  readonly type = 'rectangular'
  readonly name = 'Rectangular'

  /**
   * Generate polygon points for a rectangle centered at origin.
   * The polygon represents the configured reference side (inside or outside).
   * Returns points in clockwise order for perimeter creation.
   */
  getPolygonPoints(config: RectangularPresetConfig): vec2[] {
    const halfWidth = config.width / 2
    const halfLength = config.length / 2

    // Create rectangle centered at origin using inside dimensions, clockwise order
    return [
      vec2.fromValues(-halfWidth, -halfLength), // Bottom-left
      vec2.fromValues(halfWidth, -halfLength), // Bottom-right
      vec2.fromValues(halfWidth, halfLength), // Top-right
      vec2.fromValues(-halfWidth, halfLength) // Top-left
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
