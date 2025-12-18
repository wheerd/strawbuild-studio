import { LShape0Icon } from '@/editor/tools/perimeter/preset/presets/Icons'
import { LShapedPresetDialog } from '@/editor/tools/perimeter/preset/presets/LShapedPresetDialog'
import { type Vec2, newVec2 } from '@/shared/geometry'
import { offsetPolygon } from '@/shared/geometry'

import type { LShapedPresetConfig, PerimeterPreset } from './types'

/**
 * L-shaped perimeter preset implementation
 * Creates an L-shaped perimeter with specified dimensions and rotation
 */
export class LShapedPreset implements PerimeterPreset<LShapedPresetConfig> {
  readonly type = 'l-shaped'
  readonly name = 'L-Shaped'
  readonly icon = LShape0Icon
  readonly dialog = LShapedPresetDialog

  /**
   * Generate polygon points for an L-shape centered at origin
   * Uses inside dimensions - the polygon represents the interior space
   * Returns points in clockwise order for perimeter creation
   */
  getPolygonPoints(config: LShapedPresetConfig): Vec2[] {
    const { width1, length1, width2, length2, rotation } = config

    // Validate that extension fits within main rectangle
    if (width2 > width1 || length2 > length1) {
      throw new Error('Extension dimensions must be smaller than main rectangle dimensions')
    }

    // Create L-shape points at 0° rotation (extension at bottom-right)
    // Starting from bottom-left, going clockwise
    const points: Vec2[] = [
      newVec2(-width1 / 2, -length1 / 2), // Bottom-left of main rectangle
      newVec2(width1 / 2, -length1 / 2), // Bottom-right of main rectangle
      newVec2(width1 / 2, -length1 / 2 + length2), // Inner corner (right side)
      newVec2(-width1 / 2 + width2, -length1 / 2 + length2), // Inner corner (top side)
      newVec2(-width1 / 2 + width2, length1 / 2), // Top-right of extension
      newVec2(-width1 / 2, length1 / 2) // Top-left of main rectangle
    ]

    // Apply rotation if needed
    if (rotation !== 0) {
      const radians = (rotation * Math.PI) / 180
      const cos = Math.cos(radians)
      const sin = Math.sin(radians)

      return points.map(point => newVec2(point[0] * cos - point[1] * sin, point[0] * sin + point[1] * cos))
    }

    return points
  }

  /**
   * Get the bounds of the L-shape
   */
  getBounds(config: LShapedPresetConfig): { width: number; height: number } {
    // For bounds calculation, we need the maximum extents
    // The L-shape always fits within the main rectangle dimensions
    return {
      width: config.width1,
      height: config.length1
    }
  }

  /**
   * Validate L-shaped preset configuration
   */
  validateConfig(config: LShapedPresetConfig): boolean {
    const basicChecks =
      config.width1 > 0 &&
      config.length1 > 0 &&
      config.width2 > 0 &&
      config.length2 > 0 &&
      config.width2 <= config.width1 &&
      config.length2 <= config.length1 &&
      config.thickness > 0 &&
      config.wallAssemblyId.length > 0 &&
      [0, 90, 180, 270].includes(config.rotation)

    if (!basicChecks) {
      return false
    }

    try {
      const referencePolygon = { points: this.getPolygonPoints(config) }
      const offset = offsetPolygon(
        referencePolygon,
        config.referenceSide === 'inside' ? config.thickness : -config.thickness
      )
      return offset.points.length >= 3
    } catch (e) {
      console.error(e)
      return false
    }
  }

  /**
   * Get the 6 side lengths for the L-shape perimeter
   * Returns lengths in the order they appear when traversing clockwise
   */
  getSideLengths(config: LShapedPresetConfig): number[] {
    const { width1, length1, width2, length2 } = config

    // The 6 sides in clockwise order (at 0° rotation):
    return [
      width1, // Bottom side (full width)
      length2, // Right side (extension height)
      width1 - width2, // Inner horizontal side
      length1 - length2, // Inner vertical side
      width2, // Top side (extension width)
      length1 // Left side (full height)
    ]
  }
}
