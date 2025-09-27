import type { MaterialId } from '@/construction/materials/material'
import type { Vec3 } from '@/shared/geometry'

import type { TagId } from './tags'

export type ConstructionElementType =
  | 'post'
  | 'plate'
  | 'full-strawbale'
  | 'partial-strawbale'
  | 'straw'
  | 'frame'
  | 'header'
  | 'sill'
  | 'opening'
  | 'infill'

export type ConstructionElementId = string & { readonly brand: unique symbol }
export const createConstructionElementId = (): ConstructionElementId =>
  (Date.now().toString(36) + Math.random().toString(36).slice(2)) as ConstructionElementId

export type Shape = Cuboid | CutCuboid

export interface Cuboid {
  type: 'cuboid'
  // [0] along wall wall direction (insideLine) (0 = start of the insideLine, > 0 towards the end of insideLine)
  // [1] along wall outside direction (0 = inside edge of wall, > 0 towards outside edge)
  // [2] elevation in the wall (0 = bottom, > 0 towards the top of the wall)
  position: Vec3
  // Non-negative size vector forming a cuboid geometry with axis same as position
  size: Vec3
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
 *   position: [0, 0, 0],
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
  // Position of one corner (origin for rotation)
  position: Vec3
  // Size of base cuboid [length, width, height]
  size: Vec3

  startCut?: Cut //  At a face at position
  endCut?: Cut //  At a face at position + size
}

// Helper functions for creating shapes
export const createCuboidShape = (position: Vec3, size: Vec3): Cuboid => ({
  type: 'cuboid',
  position,
  size
})

export const createCutCuboidShape = (position: Vec3, size: Vec3, startCut?: Cut, endCut?: Cut): CutCuboid => ({
  type: 'cut-cuboid',
  position,
  size,
  startCut,
  endCut
})

// Helper functions for accessing position and size from shapes
export const getElementPosition = (element: ConstructionElement): Vec3 => {
  if (element.shape.type === 'cuboid' || element.shape.type === 'cut-cuboid') {
    return element.shape.position
  }
  throw new Error(`Shape type ${(element.shape as { type: string }).type} does not have a position property`)
}

export const getElementSize = (element: ConstructionElement): Vec3 => {
  if (element.shape.type === 'cuboid' || element.shape.type === 'cut-cuboid') {
    return element.shape.size
  }
  throw new Error(`Shape type ${(element.shape as { type: string }).type} does not have a size property`)
}

// Helper function to create ConstructionElement with computed position/size properties
export const createConstructionElement = (
  type: ConstructionElementType,
  material: MaterialId,
  shape: Shape
): ConstructionElement => {
  const element = {
    id: createConstructionElementId(),
    type,
    material,
    shape
  }
  return element
}

export type PartId = string & { readonly brand: unique symbol }

export interface ConstructionElement {
  id: ConstructionElementId
  type: ConstructionElementType
  material: MaterialId

  // Shape defining the geometry and position of the element
  shape: Shape

  tags?: TagId[]
  partId?: PartId
}
