import { vec2, vec3 } from 'gl-matrix'

import type { OpeningAssemblyId, StoreyId } from '@/building/model/ids'
import type { Perimeter, PerimeterWall, Storey } from '@/building/model/model'
import { getModelActions } from '@/building/store'
import { getConfigActions } from '@/construction/config'
import type { FloorAssemblyConfig } from '@/construction/config/types'
import { FLOOR_ASSEMBLIES } from '@/construction/floors'
import { WallConstructionArea } from '@/construction/geometry'
import { resolveOpeningAssembly } from '@/construction/openings/resolver'
import { type ConstructionResult, yieldArea, yieldMeasurement } from '@/construction/results'
import { ROOF_ASSEMBLIES } from '@/construction/roofs'
import type { HeightLine } from '@/construction/roofs/types'
import { getStoreyCeilingHeight } from '@/construction/storeyHeight'
import {
  TAG_OPENING_SPACING,
  TAG_RING_BEAM_HEIGHT,
  TAG_WALL_CONSTRUCTION_HEIGHT,
  TAG_WALL_HEIGHT,
  TAG_WALL_LENGTH
} from '@/construction/tags'
import type { InfillMethod, WallLayersConfig } from '@/construction/walls'
import {
  convertHeightLineToWallOffsets,
  fillNullRegions,
  mergeInsideOutsideHeightLines
} from '@/construction/walls/roofIntegration'
import type { Length } from '@/shared/geometry'
import { type OpeningConstructionDimensions, convertOpeningToConstruction } from '@/shared/utils/openingDimensions'

import type { WallCornerInfo } from './construction'
import { calculateWallCornerInfo, getWallContext } from './corners/corners'

function canMergeOpenings(opening1: OpeningConstructionDimensions, opening2: OpeningConstructionDimensions): boolean {
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

function mergeAdjacentOpenings(sortedOpenings: OpeningConstructionDimensions[]): OpeningConstructionDimensions[][] {
  if (sortedOpenings.length === 0) return []

  const groups: OpeningConstructionDimensions[][] = []
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

/**
 * Query all roofs for a storey and merge their height lines
 * Three-step process:
 * 1. Merge all roof height lines for each side
 * 2. Fill null regions with ceiling offset
 * 3. Merge inside/outside using minimum offsets
 */
export function getRoofHeightLineForWall(
  storeyId: StoreyId,
  cornerInfo: WallCornerInfo,
  ceilingBottomOffset: Length
): HeightLine | undefined {
  const { getRoofsByStorey } = getModelActions()
  const { getRoofAssemblyById } = getConfigActions()

  const roofs = getRoofsByStorey(storeyId)
  if (roofs.length === 0) return undefined

  // Get height lines from all roofs for both sides
  const insideHeightLine: HeightLine = []
  const outsideHeightLine: HeightLine = []

  for (const roof of roofs) {
    const roofAssembly = getRoofAssemblyById(roof.assemblyId)
    if (!roofAssembly) continue

    const roofImpl = ROOF_ASSEMBLIES[roofAssembly.type]
    if (!roofImpl) continue

    // Get height lines for construction lines
    // TypeScript can't narrow the roofAssembly type properly, so we use 'as any'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const insideLine = roofImpl.getBottomOffsets(roof, roofAssembly as any, cornerInfo.constructionInsideLine)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const outsideLine = roofImpl.getBottomOffsets(roof, roofAssembly as any, cornerInfo.constructionOutsideLine)

    insideHeightLine.push(...insideLine)
    outsideHeightLine.push(...outsideLine)
  }

  if (insideHeightLine.length === 0 && outsideHeightLine.length === 0) {
    return undefined
  }

  // STEP 1: Merge all roof height lines for each side
  insideHeightLine.sort((a, b) => a.position - b.position)
  outsideHeightLine.sort((a, b) => a.position - b.position)

  // STEP 2: Fill null regions with ceiling offset (makes complete 0-1 coverage)
  const filledInside = fillNullRegions(insideHeightLine, ceilingBottomOffset)
  const filledOutside = fillNullRegions(outsideHeightLine, ceilingBottomOffset)

  // STEP 3: Merge inside/outside using minimum offsets at all positions
  const finalHeightLine = mergeInsideOutsideHeightLines(filledInside, filledOutside)

  return finalHeightLine.length > 0 ? finalHeightLine : undefined
}

export type WallSegmentConstruction = (
  area: WallConstructionArea,
  startsWithStand: boolean,
  endsWithStand: boolean,
  startAtEnd: boolean
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
  ceilingBottomConstructionOffset: Length
  storeyHeight: Length
  ceilingHeight: Length
  floorTopOffset: Length
  floorTopConstructionOffset: Length
}

export function createWallStoreyContext(
  currentStorey: Storey,
  currentFloorAssembly: FloorAssemblyConfig,
  nextFloorAssembly: FloorAssemblyConfig | null
): WallStoreyContext {
  const currentFloorFloorAssembly = FLOOR_ASSEMBLIES[currentFloorAssembly.type]
  const nextFloorFloorAssembly = nextFloorAssembly ? FLOOR_ASSEMBLIES[nextFloorAssembly.type] : null

  const topOffset = currentFloorFloorAssembly.getTopOffset(currentFloorAssembly)
  const bottomOffset = nextFloorFloorAssembly?.getBottomOffset(nextFloorAssembly) ?? 0

  return {
    storeyHeight: currentStorey.floorHeight,
    floorConstructionThickness: currentFloorFloorAssembly.getConstructionThickness(currentFloorAssembly),
    ceilingHeight: getStoreyCeilingHeight(currentStorey, nextFloorAssembly),
    floorTopConstructionOffset: topOffset,
    floorTopOffset: currentFloorAssembly.layers.topThickness + topOffset,
    ceilingBottomConstructionOffset: bottomOffset,
    ceilingBottomOffset: (nextFloorAssembly?.layers.bottomThickness ?? 0) + bottomOffset
  }
}

export function* segmentedWallConstruction(
  wall: PerimeterWall,
  perimeter: Perimeter,
  storeyContext: WallStoreyContext,
  layers: WallLayersConfig,
  wallConstruction: WallSegmentConstruction,
  infillMethod: InfillMethod,
  wallOpeningAssemblyId?: OpeningAssemblyId
): Generator<ConstructionResult> {
  const wallContext = getWallContext(wall, perimeter)
  const cornerInfo = calculateWallCornerInfo(wall, wallContext)
  const { constructionLength, extensionStart, extensionEnd } = cornerInfo
  const openingsWithPadding = wall.openings.map(opening => convertOpeningToConstruction(opening, wallOpeningAssemblyId))

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
    storeyContext.ceilingHeight + storeyContext.floorTopOffset + storeyContext.ceilingBottomOffset
  const ceilingOffset = storeyContext.storeyHeight - totalConstructionHeight

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

  yield yieldMeasurement({
    startPoint: vec3.fromValues(-extensionStart, y, 0),
    endPoint: vec3.fromValues(-extensionStart, y, totalConstructionHeight),
    size: vec3.fromValues(constructionLength, sizeY, totalConstructionHeight),
    tags: [TAG_WALL_HEIGHT]
  })

  yield yieldMeasurement({
    startPoint: vec3.fromValues(-extensionStart, y, z),
    endPoint: vec3.fromValues(-extensionStart, y, sizeZ),
    size: vec3.fromValues(constructionLength, sizeY, sizeZ),
    tags: [TAG_WALL_CONSTRUCTION_HEIGHT]
  })

  if (basePlateHeight > 0) {
    yield yieldMeasurement({
      startPoint: vec3.fromValues(-extensionStart, y, 0),
      endPoint: vec3.fromValues(-extensionStart, y, basePlateHeight),
      size: vec3.fromValues(constructionLength, sizeY, basePlateHeight),
      tags: [TAG_RING_BEAM_HEIGHT]
    })
  }

  if (topPlateHeight > 0) {
    yield yieldMeasurement({
      startPoint: vec3.fromValues(-extensionStart, y, totalConstructionHeight - topPlateHeight),
      endPoint: vec3.fromValues(-extensionStart, y, totalConstructionHeight),
      size: vec3.fromValues(constructionLength, sizeY, topPlateHeight),
      tags: [TAG_RING_BEAM_HEIGHT]
    })
  }

  // Query roofs and get merged height line
  const roofHeightLine = getRoofHeightLineForWall(perimeter.storeyId, cornerInfo, -ceilingOffset)

  // Convert roof height line to wall offsets
  let roofOffsets
  if (roofHeightLine) {
    roofOffsets = convertHeightLineToWallOffsets(roofHeightLine, constructionLength)
  } else {
    roofOffsets = [vec2.fromValues(0, -ceilingOffset), vec2.fromValues(constructionLength, -ceilingOffset)]
  }

  // Create overall wall construction area ONCE with roof offsets
  const overallWallArea = new WallConstructionArea(
    vec3.fromValues(-extensionStart, y, z),
    vec3.fromValues(constructionLength, sizeY, storeyContext.storeyHeight - z - topPlateHeight),
    roofOffsets
  )

  if (openingsWithPadding.length === 0) {
    // No openings - use the overall area directly
    yield* wallConstruction(overallWallArea, standAtWallStart, standAtWallEnd, extensionEnd > 0)
    return
  }

  // Sort openings by position along the wall
  const sortedOpenings = [...openingsWithPadding].sort((a, b) => a.offsetFromStart - b.offsetFromStart)

  // Group adjacent compatible openings
  const openingGroups = mergeAdjacentOpenings(sortedOpenings)

  let currentX = 0 // Position relative to overallWallArea start

  for (const openingGroup of openingGroups) {
    const groupStart = openingGroup[0].offsetFromStart + extensionStart
    const groupEnd =
      openingGroup[openingGroup.length - 1].offsetFromStart +
      openingGroup[openingGroup.length - 1].width +
      extensionStart

    // Wall segment before opening (if any)
    if (groupStart > currentX) {
      const wallSegmentWidth = groupStart - currentX
      const wallSegmentArea = overallWallArea.withXAdjustment(currentX, wallSegmentWidth)

      yield* wallConstruction(wallSegmentArea, currentX === 0 ? standAtWallStart : true, true, currentX > 0)

      yield yieldMeasurement({
        startPoint: vec3.fromValues(overallWallArea.position[0] + currentX, y, z),
        endPoint: vec3.fromValues(overallWallArea.position[0] + currentX + wallSegmentWidth, y, z),
        size: vec3.fromValues(wallSegmentWidth, sizeY, sizeZ),
        tags: [TAG_OPENING_SPACING]
      })
    }

    // Opening segment
    const groupWidth = groupEnd - groupStart
    const openingArea = overallWallArea.withXAdjustment(groupStart, groupWidth)

    const assembly = resolveOpeningAssembly(openingGroup[0].openingAssemblyId ?? wallOpeningAssemblyId)
    yield* assembly.construct(openingArea, openingGroup, finishedFloorZLevel - openingArea.position[2], infillMethod)

    currentX = groupEnd
  }

  // Final wall segment after last opening (if any)
  if (currentX < constructionLength) {
    const finalSegmentWidth = constructionLength - currentX
    const finalWallArea = overallWallArea.withXAdjustment(currentX, finalSegmentWidth)

    yield* wallConstruction(
      finalWallArea,
      true,
      currentX + finalSegmentWidth >= constructionLength ? standAtWallEnd : true,
      true
    )

    yield yieldMeasurement({
      startPoint: vec3.fromValues(overallWallArea.position[0] + currentX, y, z),
      endPoint: vec3.fromValues(overallWallArea.position[0] + constructionLength, y, z),
      size: vec3.fromValues(finalSegmentWidth, sizeY, sizeZ),
      tags: [TAG_OPENING_SPACING]
    })
  }
}
