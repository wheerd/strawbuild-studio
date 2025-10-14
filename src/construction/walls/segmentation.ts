import type { Opening, Perimeter, PerimeterWall, Storey } from '@/building/model/model'
import { getConfigActions } from '@/construction/config'
import type { SlabConstructionConfig, WallLayersConfig } from '@/construction/config/types'
import { IDENTITY } from '@/construction/geometry'
import { type ConstructionResult, yieldArea, yieldMeasurement } from '@/construction/results'
import { SLAB_CONSTRUCTION_METHODS } from '@/construction/slabs'
import { TAG_OPENING_SPACING, TAG_WALL_LENGTH } from '@/construction/tags'
import type { Length, Vec3 } from '@/shared/geometry'

import type { WallCornerInfo } from './construction'
import { calculateWallCornerInfo, getWallContext } from './corners/corners'

export interface WallSegment3D {
  type: 'wall' | 'opening'
  position: Vec3 // [offsetFromStart, 0, 0]
  size: Vec3 // [width, wallThickness, wallHeight]

  // For opening segments - array supports merged adjacent openings
  openings?: Opening[]
  zOffset?: Length
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

type WallSegmentConstruction = (
  position: Vec3,
  size: Vec3,
  startsWithStand: boolean,
  endsWithStand: boolean,
  startAtEnd: boolean
) => Generator<ConstructionResult>

type OpeningSegmentConstruction = (
  position: Vec3,
  size: Vec3,
  zOffset: Length,
  openings: Opening[]
) => Generator<ConstructionResult>

function* createCornerAreas(
  cornerInfo: WallCornerInfo,
  wallLength: Length,
  wallHeight: Length,
  wallThickness: Length
): Generator<ConstructionResult> {
  if (cornerInfo.startCorner) {
    yield yieldArea({
      type: 'cuboid',
      areaType: 'corner',
      renderPosition: 'top',
      label: 'Corner',
      bounds: {
        min: [-cornerInfo.startCorner.extensionDistance, 0, 0],
        max: [0, wallThickness, wallHeight]
      },
      transform: IDENTITY
    })
  }
  if (cornerInfo.endCorner) {
    yield yieldArea({
      type: 'cuboid',
      areaType: 'corner',
      renderPosition: 'top',
      label: 'Corner',
      bounds: {
        min: [wallLength, 0, 0],
        max: [wallLength + cornerInfo.endCorner.extensionDistance, wallThickness, wallHeight]
      },
      transform: IDENTITY
    })
  }
}

function* createPlateAreas(
  totalConstructionHeight: Length,
  bottomPlateHeight: Length,
  topPlateHeight: Length,
  start: number,
  constructionLength: Length
): Generator<ConstructionResult> {
  if (bottomPlateHeight > 0) {
    yield yieldArea({
      type: 'polygon',
      areaType: 'bottom-plate',
      renderPosition: 'bottom',
      label: 'Bottom Ring Beam',
      plane: 'xz',
      polygon: {
        points: [
          [start, 0],
          [start + constructionLength, 0],
          [start + constructionLength, bottomPlateHeight],
          [start, bottomPlateHeight]
        ]
      }
    })
  }
  if (topPlateHeight > 0) {
    yield yieldArea({
      type: 'polygon',
      areaType: 'top-plate',
      renderPosition: 'bottom',
      label: 'Top Ring Beam',
      plane: 'xz',
      polygon: {
        points: [
          [start, totalConstructionHeight - topPlateHeight],
          [start + constructionLength, totalConstructionHeight - topPlateHeight],
          [start + constructionLength, totalConstructionHeight],
          [start, totalConstructionHeight]
        ]
      }
    })
  }
}

export interface WallStoreyContext {
  ceilingBottomOffset: Length
  storeyHeight: Length
  floorTopOffset: Length
}

export function createWallStoreyContext(
  currentStorey: Storey,
  currentSlabConfig: SlabConstructionConfig,
  nextSlabConfig: SlabConstructionConfig | null
): WallStoreyContext {
  const currentFloorSlabMethod = SLAB_CONSTRUCTION_METHODS[currentSlabConfig.type]
  const nextFloorSlabMethod = nextSlabConfig ? SLAB_CONSTRUCTION_METHODS[nextSlabConfig.type] : null

  return {
    storeyHeight: currentStorey.height,
    floorTopOffset: (currentSlabConfig.layers.topThickness +
      currentFloorSlabMethod.getTopOffset(currentSlabConfig)) as Length,
    ceilingBottomOffset: ((nextSlabConfig?.layers.bottomThickness ?? 0) +
      (nextFloorSlabMethod?.getBottomOffset(nextSlabConfig) ?? 0)) as Length
  }
}

export function* segmentedWallConstruction(
  wall: PerimeterWall,
  perimeter: Perimeter,
  storeyContext: WallStoreyContext,
  layers: WallLayersConfig,
  wallConstruction: WallSegmentConstruction,
  openingConstruction: OpeningSegmentConstruction
): Generator<ConstructionResult> {
  const wallContext = getWallContext(wall, perimeter)
  const cornerInfo = calculateWallCornerInfo(wall, wallContext)
  const { constructionLength, extensionStart, extensionEnd } = cornerInfo

  const { getRingBeamConstructionMethodById } = getConfigActions()
  const bottomPlateMethod = perimeter.baseRingBeamMethodId
    ? getRingBeamConstructionMethodById(perimeter.baseRingBeamMethodId)
    : null
  const bottomPlateHeight = bottomPlateMethod?.config?.height ?? (0 as Length)
  const topPlateMethod = perimeter.topRingBeamMethodId
    ? getRingBeamConstructionMethodById(perimeter.topRingBeamMethodId)
    : null
  const topPlateHeight = topPlateMethod?.config?.height ?? (0 as Length)

  const totalConstructionHeight = (storeyContext.storeyHeight +
    storeyContext.floorTopOffset +
    storeyContext.ceilingBottomOffset) as Length

  yield* createCornerAreas(cornerInfo, wall.wallLength, totalConstructionHeight, wall.thickness)

  const y = layers.insideThickness
  const sizeY = wall.thickness - layers.insideThickness - layers.outsideThickness
  const z = bottomPlateHeight
  const sizeZ = (totalConstructionHeight - bottomPlateHeight - topPlateHeight) as Length

  yield* createPlateAreas(
    totalConstructionHeight,
    bottomPlateHeight,
    topPlateHeight,
    -extensionStart,
    constructionLength
  )

  const finishedFloorZLevel = storeyContext.floorTopOffset

  const standAtWallStart = wallContext.startCorner.exteriorAngle !== 180 || cornerInfo.startCorner.constructedByThisWall
  const standAtWallEnd = wallContext.endCorner.exteriorAngle !== 180 || cornerInfo.endCorner.constructedByThisWall

  yield yieldArea({
    type: 'cut',
    areaType: 'floor-level',
    renderPosition: 'top',
    label: 'Finished Floor Level',
    axis: 'z',
    position: finishedFloorZLevel
  })

  yield yieldMeasurement({
    startPoint: [-extensionStart, y, z],
    endPoint: [-extensionStart + constructionLength, y, z],
    size: [constructionLength, sizeY, sizeZ],
    tags: [TAG_WALL_LENGTH]
  })

  if (wall.openings.length === 0) {
    // No openings - just one wall segment for the entire length
    yield* wallConstruction(
      [-extensionStart, y, z],
      [constructionLength, sizeY, sizeZ],
      standAtWallStart,
      standAtWallEnd,
      extensionEnd > 0
    )
    return
  }

  // Sort openings by position along the wall
  const sortedOpenings = [...wall.openings].sort((a, b) => a.offsetFromStart - b.offsetFromStart)

  // Group adjacent compatible openings
  const openingGroups = mergeAdjacentOpenings(sortedOpenings)

  let currentPosition = -extensionStart as Length

  for (const openingGroup of openingGroups) {
    // Adjust opening positions by start extension to account for corner extension
    const groupStart = openingGroup[0].offsetFromStart as Length
    const groupEnd = (openingGroup[openingGroup.length - 1].offsetFromStart +
      openingGroup[openingGroup.length - 1].width) as Length

    // Create wall segment before opening group if there's space
    if (groupStart > currentPosition) {
      const wallSegmentWidth = (groupStart - currentPosition) as Length
      yield* wallConstruction(
        [currentPosition, y, z],
        [wallSegmentWidth, sizeY, sizeZ],
        currentPosition !== -extensionStart || standAtWallStart,
        true,
        currentPosition > 0
      )

      yield yieldMeasurement({
        startPoint: [currentPosition, y, z],
        endPoint: [currentPosition + wallSegmentWidth, y, z],
        size: [wallSegmentWidth, sizeY, sizeZ],
        tags: [TAG_OPENING_SPACING]
      })
    }

    // Create opening segment for the group
    const groupWidth = (groupEnd - groupStart) as Length
    yield* openingConstruction([groupStart, y, z], [groupWidth, sizeY, sizeZ], finishedFloorZLevel, openingGroup)

    currentPosition = groupEnd
  }

  // Create final wall segment if there's remaining space
  if (currentPosition < constructionLength - extensionStart) {
    const remainingWidth = (constructionLength - currentPosition - extensionStart) as Length
    yield* wallConstruction(
      [currentPosition, y, z],
      [remainingWidth, sizeY, sizeZ],
      true,
      standAtWallEnd,
      currentPosition > 0
    )

    yield yieldMeasurement({
      startPoint: [currentPosition, y, z],
      endPoint: [currentPosition + remainingWidth, y, z],
      size: [remainingWidth, sizeY, sizeZ],
      tags: [TAG_OPENING_SPACING]
    })
  }
}
