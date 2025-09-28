import type { Vec3 } from '@/shared/geometry'

export interface Transform {
  readonly position: Vec3
  readonly rotation: Vec3 // Euler angles
}

export const IDENTITY: Transform = {
  position: [0, 0, 0],
  rotation: [0, 0, 0]
}

export type Shape = Cuboid | CutCuboid

export interface Cuboid {
  type: 'cuboid'
  offset: Vec3 // Local coordinate system
  size: Vec3 // Non-negative with axis same as offset
}

/**
 * The cut is made by tilting a cutting plane within the specified plane
 * around the specified axis by the given angle.
 */
export interface Cut {
  /** The plane in which the cut is made ('xy', 'xz', or 'yz') */
  plane: 'xy' | 'xz' | 'yz'

  /** The axis within the plane around which the cut is tilted */
  axis: 'x' | 'y' | 'z'

  /**
   * The tilt angle of the cut in degrees
   * - Range: -90° < angle < 90°
   * - 0° = no cut (rectangular end)
   * - Positive = cut slopes towards the end
   * - Negative = cut slopes towards the middle
   */
  angle: number
}

/**
 * CutCuboid Geometric Properties:
 *
 * This is the result by making an angled cut at one or both ends of the cuboid.
 * The result is a quadrilateral irregular right prism (hexahedron) with 6 faces:
 *
 * 1. Two faces parallel to the cut: Rectangular, parallel, same width
 *    - May have different lengths if startCut ≠ endCut
 *
 * 2. Two faces perpendicular to the cut: Trapezoidal, parallel (base faces of the prism)
 *    - Shape determined by the cut angles
 *    - Always have the same width as the original cuboid
 *
 * 3. Start & end faces: Rectangular cut faces, same width
 *    - Non-parallel if startCut ≠ endCut
 *    - Different lengths if cut angles differ
 *
 * Cut angles range from -90° to 90°:
 * - 0° = no cut (rectangular end)
 * - Positive angles = cut slopes towards the ends
 * - Negative angles = cut slopes towards the middle
 *
 * Example:
 * {
 *   type: 'cut-cuboid',
 *   offset: [0, 0, 0],
 *   size: [5000, 360, 60],
 *   startCut: {
 *     plane: 'xy',
 *     axis: 'y',
 *     angle: 45
 *   },
 *   endCut: {
 *     plane: 'xy',
 *     axis: 'y',
 *     angle: 45
 *   }
 * }
 *
 * This creates a 5m long plate with two 45° cuts:
 *    /‾‾‾‾‾‾‾‾‾‾4.64m‾‾‾‾‾‾‾‾‾\  「 36cm
 *   /________5m________________\  L
 * This is the view from the XY plane
 */
export interface CutCuboid {
  type: 'cut-cuboid'
  offset: Vec3 // Local coordinate system
  size: Vec3 // Non-negative size of the base cuboid with axis same as offset

  startCut?: Cut //  At a face at position
  endCut?: Cut //  At a face at position + size
}

export const createCuboidShape = (offset: Vec3, size: Vec3): Cuboid => ({
  type: 'cuboid',
  offset,
  size
})

export const createCutCuboidShape = (offset: Vec3, size: Vec3, startCut?: Cut, endCut?: Cut): CutCuboid => ({
  type: 'cut-cuboid',
  offset,
  size,
  startCut,
  endCut
})
