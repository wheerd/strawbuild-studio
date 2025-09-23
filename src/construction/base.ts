import type { Opening, OpeningType, PerimeterWall, PerimeterWallId, PerimeterCornerId, Perimeter } from '@/model'
import type { Length, Vec3, Vec2 } from '@/types/geometry'
import type { MaterialId } from './material'
import { formatLength } from '@/utils/formatLength'
import type { StrawConfig } from './straw'
import type { OpeningConstruction, OpeningConstructionConfig } from './openings'
import type { LayersConfig } from '@/types/config'

export type ConstructionType = 'infill' | 'strawhenge' | 'non-strawbale'

export interface BaseConstructionConfig {
  type: ConstructionType
  openings: Record<OpeningType, OpeningConstructionConfig>
  straw: StrawConfig
}

export type PerimeterWallConstructionMethod<TConfig> = (
  wall: PerimeterWall,
  perimeter: Perimeter,
  floorHeight: Length,
  config: TConfig,
  layers: LayersConfig
) => WallConstructionPlan

export interface ConstructionIssue {
  description: string
  elements: ConstructionElementId[]
}

export interface Measurement {
  type:
    | 'post-spacing'
    | 'opening-spacing'
    | 'opening-width'
    | 'sill-height'
    | 'header-height'
    | 'opening-height'
    | 'ring-beam-outer'
    | 'ring-beam-inner'
  startPoint: Vec2 // Construction coordinates [x, z]
  endPoint: Vec2 // Construction coordinates [x, z]
  label: string // e.g., "800mm", "1200mm"
  offset?: number // Distance from wall (negative for below, positive for above)
}

export interface WallCornerInfo {
  startCorner: {
    id: PerimeterCornerId
    constructedByThisWall: boolean
    extensionDistance: Length
  } | null

  endCorner: {
    id: PerimeterCornerId
    constructedByThisWall: boolean
    extensionDistance: Length
  } | null
}

export interface WallConstructionPlan {
  wallId: PerimeterWallId
  constructionType: ConstructionType
  wallDimensions: {
    length: Length // The ACTUAL construction length (includes assigned corners)
    boundaryLength: Length // The original wall boundary length
    thickness: Length
    height: Length
  }

  segments: ConstructionSegment[]
  measurements: Measurement[]
  cornerInfo: WallCornerInfo

  errors: ConstructionIssue[]
  warnings: ConstructionIssue[]
}

export type ConstructionSegment = WallConstructionSegment | OpeningConstruction

export interface BaseConstructionSegment {
  id: string
  type: 'wall' | 'opening'
  position: Length
  width: Length
  elements: ConstructionElement[]
}

export interface WallConstructionSegment extends BaseConstructionSegment {
  type: 'wall'
  constructionType: ConstructionType
}

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

export interface ConstructionElement {
  id: ConstructionElementId
  type: ConstructionElementType
  material: MaterialId

  // Shape defining the geometry and position of the element
  shape: Shape
}

export type ConstructionResult =
  | { type: 'element'; element: ConstructionElement }
  | { type: 'measurement'; measurement: Measurement }
  | { type: 'error'; error: ConstructionIssue }
  | { type: 'warning'; warning: ConstructionIssue }

export const aggregateResults = (results: ConstructionResult[]) => ({
  elements: results.filter(r => r.type === 'element').map(r => r.element),
  measurements: results.filter(r => r.type === 'measurement').map(r => r.measurement),
  errors: results.filter(r => r.type === 'error').map(r => r.error),
  warnings: results.filter(r => r.type === 'warning').map(r => r.warning)
})

// Helper functions for creating ConstructionResults
export const yieldElement = (element: ConstructionElement): ConstructionResult => ({ type: 'element', element })

export const yieldError = (error: ConstructionIssue): ConstructionResult => ({ type: 'error', error })

export const yieldWarning = (warning: ConstructionIssue): ConstructionResult => ({ type: 'warning', warning })

export const yieldMeasurement = (measurement: Measurement): ConstructionResult => ({ type: 'measurement', measurement })

// Helper to yield all results from a generator while collecting element IDs
export function* yieldAndCollectElementIds(
  generator: Generator<ConstructionResult>,
  elementIds: ConstructionElementId[]
): Generator<ConstructionResult> {
  for (const result of generator) {
    if (result.type === 'element') {
      elementIds.push(result.element.id)
    }
    yield result
  }
}

export interface WithIssues<T> {
  it: T
  errors: ConstructionIssue[]
  warnings: ConstructionIssue[]
}

export interface WallSegment3D {
  type: 'wall' | 'opening'
  position: Vec3 // [offsetFromStart, 0, 0]
  size: Vec3 // [width, wallThickness, wallHeight]

  // For opening segments - array supports merged adjacent openings
  openings?: Opening[]
}

function canMergeOpenings(opening1: Opening, opening2: Opening): boolean {
  // Check if openings are adjacent
  const opening1End = opening1.offsetFromStart + opening1.width
  const opening2Start = opening2.offsetFromStart

  if (opening1End !== opening2Start) return false

  // Check if sill heights match
  const sill1 = opening1.sillHeight ?? 0
  const sill2 = opening2.sillHeight ?? 0
  if (sill1 !== sill2) return false

  // Check if header positions match (sill + height)
  const header1 = sill1 + opening1.height
  const header2 = sill2 + opening2.height
  if (header1 !== header2) return false

  return true
}

function mergeAdjacentOpenings(sortedOpenings: Opening[]): Opening[][] {
  if (sortedOpenings.length === 0) return []

  const groups: Opening[][] = []
  let currentGroup = [sortedOpenings[0]]

  for (let i = 1; i < sortedOpenings.length; i++) {
    const prevOpening = currentGroup[currentGroup.length - 1]
    const currentOpening = sortedOpenings[i]

    if (canMergeOpenings(prevOpening, currentOpening)) {
      currentGroup.push(currentOpening)
    } else {
      groups.push(currentGroup)
      currentGroup = [currentOpening]
    }
  }

  groups.push(currentGroup)
  return groups
}

export function segmentWall(
  wall: PerimeterWall,
  wallHeight: Length,
  constructionLength: Length,
  startExtension: Length = 0 as Length,
  layers: LayersConfig
): WallSegment3D[] {
  const y = layers.insideThickness
  const sizeY = wall.thickness - layers.insideThickness - layers.outsideThickness

  if (wall.openings.length === 0) {
    // No openings - just one wall segment for the entire length
    return [
      {
        type: 'wall',
        position: [0, y, 0],
        size: [constructionLength, sizeY, wallHeight]
      }
    ]
  }

  // Sort openings by position along the wall
  const sortedOpenings = [...wall.openings].sort((a, b) => a.offsetFromStart - b.offsetFromStart)

  // Validate openings don't overlap and fit within wall
  let currentPosition = 0 as Length

  for (const opening of sortedOpenings) {
    const openingStart = opening.offsetFromStart
    const openingEnd = (openingStart + opening.width) as Length

    // Validate opening fits within the original wall boundary (before extensions)
    if (openingEnd > wall.wallLength) {
      throw new Error(
        `Opening extends beyond wall length: opening ends at ${formatLength(openingEnd)} but wall ${wall.id} is only ${formatLength(wall.wallLength)} long`
      )
    }

    // Validate opening doesn't overlap with previous position
    if (openingStart < currentPosition) {
      throw new Error(
        `Opening overlaps with previous segment: opening starts at ${formatLength(openingStart)} but previous segment ends at ${formatLength(currentPosition)}`
      )
    }

    currentPosition = openingEnd
  }

  // Group adjacent compatible openings
  const openingGroups = mergeAdjacentOpenings(sortedOpenings)

  // Create segments with Vec3 positioning
  const segments: WallSegment3D[] = []
  currentPosition = 0 as Length

  for (const openingGroup of openingGroups) {
    // Adjust opening positions by start extension to account for corner extension
    const groupStart = (openingGroup[0].offsetFromStart + startExtension) as Length
    const groupEnd = (openingGroup[openingGroup.length - 1].offsetFromStart +
      openingGroup[openingGroup.length - 1].width +
      startExtension) as Length

    // Create wall segment before opening group if there's space
    if (groupStart > currentPosition) {
      const wallSegmentWidth = (groupStart - currentPosition) as Length
      segments.push({
        type: 'wall',
        position: [currentPosition, y, 0],
        size: [wallSegmentWidth, sizeY, wallHeight]
      })
    }

    // Create opening segment for the group
    const groupWidth = (groupEnd - groupStart) as Length
    segments.push({
      type: 'opening',
      position: [groupStart, y, 0],
      size: [groupWidth, sizeY, wallHeight],
      openings: openingGroup
    })

    currentPosition = groupEnd
  }

  // Create final wall segment if there's remaining space
  if (currentPosition < constructionLength) {
    const remainingWidth = (constructionLength - currentPosition) as Length
    segments.push({
      type: 'wall',
      position: [currentPosition, y, 0],
      size: [remainingWidth, sizeY, wallHeight]
    })
  }

  return segments
}
