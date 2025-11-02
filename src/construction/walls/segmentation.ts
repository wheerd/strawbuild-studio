import { vec2, vec3 } from 'gl-matrix'

import type { Opening, Perimeter, PerimeterWall, Storey } from '@/building/model/model'
import { getConfigActions } from '@/construction/config'
import type { FloorAssemblyConfig } from '@/construction/config/types'
import { FLOOR_ASSEMBLIES } from '@/construction/floors'
import { type ConstructionResult, yieldArea, yieldMeasurement } from '@/construction/results'
import { TAG_OPENING_SPACING, TAG_WALL_LENGTH } from '@/construction/tags'
import type { WallLayersConfig } from '@/construction/walls'
import type { Length } from '@/shared/geometry'

import type { WallCornerInfo } from './construction'
import { calculateWallCornerInfo, getWallContext } from './corners/corners'

export interface WallSegment3D {
  type: 'wall' | 'opening'
  position: vec3 // [offsetFromStart, 0, 0]
  size: vec3 // [width, wallThickness, wallHeight]

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

export type WallSegmentConstruction = (
  position: vec3,
  size: vec3,
  startsWithStand: boolean,
  endsWithStand: boolean,
  startAtEnd: boolean
) => Generator<ConstructionResult>

export type OpeningSegmentConstruction = (
  position: vec3,
  size: vec3,
  zOffset: Length,
  openings: Opening[]
) => Generator<ConstructionResult>

function* createCornerAreas(
  cornerInfo: WallCornerInfo,
  wallLength: Length,
  wallHeight: Length
): Generator<ConstructionResult> {
  if (cornerInfo.startCorner) {
    yield yieldArea({
      type: 'polygon',
      areaType: 'corner',
      renderPosition: 'top',
      label: 'Corner',
      plane: 'xz',
      polygon: {
        points: [
          vec2.fromValues(-cornerInfo.startCorner.extensionDistance, 0),
          vec2.fromValues(-cornerInfo.startCorner.extensionDistance, wallHeight),
          vec2.fromValues(0, wallHeight),
          vec2.fromValues(0, 0)
        ]
      },
      cancelKey: `corner-${cornerInfo.startCorner.id}`
    })
  }
  if (cornerInfo.endCorner) {
    yield yieldArea({
      type: 'polygon',
      areaType: 'corner',
      renderPosition: 'top',
      label: 'Corner',
      plane: 'xz',
      polygon: {
        points: [
          vec2.fromValues(wallLength, 0),
          vec2.fromValues(wallLength, wallHeight),
          vec2.fromValues(wallLength + cornerInfo.endCorner.extensionDistance, wallHeight),
          vec2.fromValues(wallLength + cornerInfo.endCorner.extensionDistance, 0)
        ]
      },
      cancelKey: `corner-${cornerInfo.endCorner.id}`
    })
  }
}

function* createPlateAreas(
  totalConstructionHeight: Length,
  basePlateHeight: Length,
  topPlateHeight: Length,
  start: Length,
  constructionLength: Length,
  perimeterId: string
): Generator<ConstructionResult> {
  if (basePlateHeight > 0) {
    yield yieldArea({
      type: 'polygon',
      areaType: 'bottom-plate',
      renderPosition: 'bottom',
      label: 'Bottom Ring Beam',
      plane: 'xz',
      polygon: {
        points: [
          vec2.fromValues(start, 0),
          vec2.fromValues(start + constructionLength, 0),
          vec2.fromValues(start + constructionLength, basePlateHeight),
          vec2.fromValues(start, basePlateHeight)
        ]
      },
      mergeKey: `bottom-plate-${perimeterId}`
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
          vec2.fromValues(start, totalConstructionHeight - topPlateHeight),
          vec2.fromValues(start + constructionLength, totalConstructionHeight - topPlateHeight),
          vec2.fromValues(start + constructionLength, totalConstructionHeight),
          vec2.fromValues(start, totalConstructionHeight)
        ]
      },
      mergeKey: `top-plate-${perimeterId}`
    })
  }
}

export interface WallStoreyContext {
  floorConstructionThickness: Length
  ceilingBottomOffset: Length
  storeyHeight: Length
  floorTopOffset: Length
}

export function createWallStoreyContext(
  currentStorey: Storey,
  currentFloorAssembly: FloorAssemblyConfig,
  nextFloorAssembly: FloorAssemblyConfig | null
): WallStoreyContext {
  const currentFloorFloorAssembly = FLOOR_ASSEMBLIES[currentFloorAssembly.type]
  const nextFloorFloorAssembly = nextFloorAssembly ? FLOOR_ASSEMBLIES[nextFloorAssembly.type] : null

  return {
    floorConstructionThickness: currentFloorFloorAssembly.getConstructionThickness(currentFloorAssembly),
    storeyHeight: currentStorey.height,
    floorTopOffset:
      currentFloorAssembly.layers.topThickness + currentFloorFloorAssembly.getTopOffset(currentFloorAssembly),
    ceilingBottomOffset:
      (nextFloorAssembly?.layers.bottomThickness ?? 0) +
      (nextFloorFloorAssembly?.getBottomOffset(nextFloorAssembly) ?? 0)
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

  const { getRingBeamAssemblyById } = getConfigActions()
  const basePlateAssembly = perimeter.baseRingBeamAssemblyId
    ? getRingBeamAssemblyById(perimeter.baseRingBeamAssemblyId)
    : null
  const basePlateHeight = basePlateAssembly?.height ?? 0
  const topPlateAssembly = perimeter.topRingBeamAssemblyId
    ? getRingBeamAssemblyById(perimeter.topRingBeamAssemblyId)
    : null
  const topPlateHeight = topPlateAssembly?.height ?? 0

  const totalConstructionHeight =
    storeyContext.storeyHeight + storeyContext.floorTopOffset + storeyContext.ceilingBottomOffset

  yield* createCornerAreas(cornerInfo, wall.wallLength, totalConstructionHeight)

  const y = layers.insideThickness
  const sizeY = wall.thickness - layers.insideThickness - layers.outsideThickness
  const z = basePlateHeight
  const sizeZ = totalConstructionHeight - basePlateHeight - topPlateHeight

  yield* createPlateAreas(
    totalConstructionHeight,
    basePlateHeight,
    topPlateHeight,
    -extensionStart,
    constructionLength,
    perimeter.id
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
    position: finishedFloorZLevel,
    mergeKey: `floor-level-${perimeter.storeyId}`
  })

  yield yieldMeasurement({
    startPoint: vec3.fromValues(-extensionStart, y, z),
    endPoint: vec3.fromValues(-extensionStart + constructionLength, y, z),
    size: vec3.fromValues(constructionLength, sizeY, sizeZ),
    tags: [TAG_WALL_LENGTH]
  })

  if (wall.openings.length === 0) {
    // No openings - just one wall segment for the entire length
    yield* wallConstruction(
      vec3.fromValues(-extensionStart, y, z),
      vec3.fromValues(constructionLength, sizeY, sizeZ),
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

  let currentPosition = -extensionStart

  for (const openingGroup of openingGroups) {
    // Adjust opening positions by start extension to account for corner extension
    const groupStart = openingGroup[0].offsetFromStart
    const groupEnd = openingGroup[openingGroup.length - 1].offsetFromStart + openingGroup[openingGroup.length - 1].width

    // Create wall segment before opening group if there's space
    if (groupStart > currentPosition) {
      const wallSegmentWidth = groupStart - currentPosition
      yield* wallConstruction(
        vec3.fromValues(currentPosition, y, z),
        vec3.fromValues(wallSegmentWidth, sizeY, sizeZ),
        currentPosition !== -extensionStart || standAtWallStart,
        true,
        currentPosition > 0
      )

      yield yieldMeasurement({
        startPoint: vec3.fromValues(currentPosition, y, z),
        endPoint: vec3.fromValues(currentPosition + wallSegmentWidth, y, z),
        size: vec3.fromValues(wallSegmentWidth, sizeY, sizeZ),
        tags: [TAG_OPENING_SPACING]
      })
    }

    // Create opening segment for the group
    const groupWidth = groupEnd - groupStart
    yield* openingConstruction(
      vec3.fromValues(groupStart, y, z),
      vec3.fromValues(groupWidth, sizeY, sizeZ),
      finishedFloorZLevel,
      openingGroup
    )

    currentPosition = groupEnd
  }

  // Create final wall segment if there's remaining space
  if (currentPosition < constructionLength - extensionStart) {
    const remainingWidth = constructionLength - currentPosition - extensionStart
    yield* wallConstruction(
      vec3.fromValues(currentPosition, y, z),
      vec3.fromValues(remainingWidth, sizeY, sizeZ),
      true,
      standAtWallEnd,
      currentPosition > 0
    )

    yield yieldMeasurement({
      startPoint: vec3.fromValues(currentPosition, y, z),
      endPoint: vec3.fromValues(currentPosition + remainingWidth, y, z),
      size: vec3.fromValues(remainingWidth, sizeY, sizeZ),
      tags: [TAG_OPENING_SPACING]
    })
  }
}
