import type { Point2D } from '@/types/geometry'
import { SnappingEngine } from './SnappingEngine'
import { type SnapResult, type SnappingContext, type SnapConfig } from './types'

/**
 * Service interface for snapping operations
 * Provides a clean API for components to use
 */
export interface ISnappingService {
  /**
   * Find the snap result for a target point
   * This is the main function that should be used by all components
   */
  findSnapResult: (
    target: Point2D,
    context: SnappingContext
  ) => SnapResult | null

  /**
   * Convenience method to get just the snapped position
   * Returns the target point if no snap is found
   */
  findSnapPosition: (
    target: Point2D,
    context: SnappingContext
  ) => Point2D
}

/**
 * Default implementation of the snapping service
 */
export class SnappingService implements ISnappingService {
  private readonly engine: SnappingEngine

  constructor (config?: Partial<SnapConfig>) {
    this.engine = new SnappingEngine(config)
  }

  findSnapResult (
    target: Point2D,
    context: SnappingContext
  ): SnapResult | null {
    return this.engine.findSnapResult(target, context)
  }

  findSnapPosition (
    target: Point2D,
    context: SnappingContext
  ): Point2D {
    const result = this.findSnapResult(target, context)
    return result?.position ?? target
  }
}

// Create a default singleton instance
export const defaultSnappingService = new SnappingService()
