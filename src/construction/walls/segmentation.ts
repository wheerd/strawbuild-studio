import type { Opening, PerimeterWallWithGeometry, WallPost } from '@/building/model'
import {
  type OpeningAssemblyId,
  type PerimeterId,
  type StoreyId,
  isOpeningId,
  isWallPostId
} from '@/building/model/ids'
import { getModelActions } from '@/building/store'
import { getConfigActions } from '@/construction/config'
import { WallConstructionArea } from '@/construction/geometry'
import { constructWallPost } from '@/construction/materials/posts'
import { resolveOpeningAssembly, resolveOpeningConfig } from '@/construction/openings/resolver'
import { type ConstructionResult, yieldArea, yieldMeasurement } from '@/construction/results'
import { resolveRingBeamAssembly } from '@/construction/ringBeams'
import type { StoreyContext } from '@/construction/storeys/context'
import {
  TAG_OPENING_DOOR,
  TAG_OPENING_SPACING,
  TAG_OPENING_WINDOW,
  TAG_RING_BEAM_HEIGHT,
  TAG_WALL_CONSTRUCTION_HEIGHT,
  TAG_WALL_HEIGHT,
  TAG_WALL_LENGTH
} from '@/construction/tags'
import type { SegmentInfillMethod, WallLayersConfig } from '@/construction/walls'
import {
  type WallTopOffsets,
  convertHeightLineToWallOffsets,
  getRoofHeightLineForLines,
  splitAtHeightJumps
} from '@/construction/walls/roofIntegration'
import { type Length, ZERO_VEC2, fromTrans, newVec2, newVec3 } from '@/shared/geometry'

import type { WallCornerInfo } from './construction'
import { calculateWallCornerInfo, getWallContext } from './corners/corners'

export function* segmentedWallConstruction(
  wall: PerimeterWallWithGeometry,
  storeyContext: StoreyContext,
  layers: WallLayersConfig,
  wallConstruction: WallSegmentConstruction,
  infillMethod: SegmentInfillMethod,
  wallOpeningAssemblyId?: OpeningAssemblyId,
  splitAtHeightJumps = true
): Generator<ConstructionResult> {
  const wallContext = getWallContext(wall)
  const cornerInfo = calculateWallCornerInfo(wall, wallContext)

  // Calculate ring beam heights
  const { basePlateHeight, topPlateHeight } = getRingBeamHeights(wall)

  // Calculate all wall dimensions
  const dimensions = calculateWallDimensions(wall, layers, storeyContext, basePlateHeight, topPlateHeight)

  // Determine if stands are needed at wall start/end
  const standAtWallStart = wallContext.startCorner.exteriorAngle !== 180 || cornerInfo.startCorner.constructedByThisWall
  const standAtWallEnd = wallContext.endCorner.exteriorAngle !== 180 || cornerInfo.endCorner.constructedByThisWall

  // Calculate roof offsets
  const roofOffsets = calculateRoofOffsets(cornerInfo, dimensions.ceilingOffset, storeyContext)

  // Create overall wall construction area with roof offsets
  const overallWallArea = new WallConstructionArea(
    newVec3(-cornerInfo.extensionStart, dimensions.y, dimensions.z),
    newVec3(cornerInfo.constructionLength, dimensions.sizeY, dimensions.sizeZ),
    roofOffsets
  )

  // Generate corner areas, plate areas, and measurements
  yield* generateAreasAndMeasurements(
    dimensions.finishedFloorZLevel,
    overallWallArea,
    basePlateHeight,
    topPlateHeight,
    cornerInfo,
    wall.wallLength,
    wall.perimeterId,
    storeyContext.storeyId
  )

  // Create combined list of openings and posts
  const wallItems = createSortedWallItems(wall, cornerInfo.extensionStart, wallOpeningAssemblyId)

  // Construct all wall segments, openings, and posts
  yield* constructWallSegments(
    wallItems,
    overallWallArea,
    standAtWallStart,
    standAtWallEnd,
    cornerInfo,
    dimensions,
    wallConstruction,
    infillMethod,
    wallOpeningAssemblyId,
    splitAtHeightJumps
  )
}

function canMergeOpenings(opening1: Opening, opening2: Opening): boolean {
  if (opening1.openingAssemblyId !== opening2.openingAssemblyId) return false

  // Check if openings are adjacent
  const opening1End = opening1.centerOffsetFromWallStart + opening1.width / 2
  const opening2Start = opening2.centerOffsetFromWallStart - opening2.width / 2

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
  area: WallConstructionArea,
  startsWithStand: boolean,
  endsWithStand: boolean,
  startAtEnd: boolean
) => Generator<ConstructionResult>

/**
 * Wall dimension calculations result
 */
interface WallDimensions {
  y: Length
  sizeY: Length
  z: Length
  sizeZ: Length
  finishedFloorZLevel: Length
  totalConstructionHeight: Length
  ceilingOffset: Length
}

/**
 * Calculate ring beam heights for wall construction
 */
function getRingBeamHeights(wall: PerimeterWallWithGeometry): {
  basePlateHeight: Length
  topPlateHeight: Length
} {
  const { getRingBeamAssemblyById } = getConfigActions()

  const basePlateAssembly = wall.baseRingBeamAssemblyId ? getRingBeamAssemblyById(wall.baseRingBeamAssemblyId) : null
  const basePlateHeight = basePlateAssembly ? resolveRingBeamAssembly(basePlateAssembly).height : 0

  const topPlateAssembly = wall.topRingBeamAssemblyId ? getRingBeamAssemblyById(wall.topRingBeamAssemblyId) : null
  const topPlateHeight = topPlateAssembly ? resolveRingBeamAssembly(topPlateAssembly).height : 0

  return { basePlateHeight, topPlateHeight }
}

/**
 * Calculate all wall dimension parameters
 */
function calculateWallDimensions(
  wall: PerimeterWallWithGeometry,
  layers: WallLayersConfig,
  storeyContext: StoreyContext,
  basePlateHeight: Length,
  topPlateHeight: Length
): WallDimensions {
  const totalConstructionHeight = storeyContext.wallTop - storeyContext.wallBottom
  const ceilingOffset = storeyContext.roofBottom - storeyContext.wallTop

  const y = layers.insideThickness
  const sizeY = wall.thickness - layers.insideThickness - layers.outsideThickness
  const z = basePlateHeight
  const sizeZ = totalConstructionHeight - basePlateHeight - topPlateHeight

  const finishedFloorZLevel = storeyContext.finishedFloorTop - storeyContext.wallBottom

  return {
    y,
    sizeY,
    z,
    sizeZ,
    finishedFloorZLevel,
    totalConstructionHeight,
    ceilingOffset
  }
}

/**
 * Calculate roof offsets for wall construction
 */
function calculateRoofOffsets(
  cornerInfo: WallCornerInfo,
  ceilingOffset: Length,
  storeyContext: StoreyContext
): WallTopOffsets {
  const roofHeightLine = getRoofHeightLineForLines(
    storeyContext.storeyId,
    [cornerInfo.constructionInsideLine, cornerInfo.constructionOutsideLine],
    -ceilingOffset,
    storeyContext.perimeterContexts
  )

  return convertHeightLineToWallOffsets(roofHeightLine, cornerInfo.constructionLength)
}

/**
 * Construct a wall segment before an item (opening or post)
 */
function* constructWallSegment(
  overallWallArea: WallConstructionArea,
  start: Length,
  end: Length,
  startWithStand: boolean,
  endWithStand: boolean,
  wallConstruction: WallSegmentConstruction,
  doSplitAtHeightJumps: boolean
): Generator<ConstructionResult> {
  if (end <= start) return

  const wallSegmentWidth = end - start
  const wallSegmentArea = overallWallArea.withXAdjustment(start, wallSegmentWidth)

  if (!doSplitAtHeightJumps) {
    yield* wallConstruction(wallSegmentArea, startWithStand, endWithStand, start > 0)
    return
  }

  const parts = splitAtHeightJumps(wallSegmentArea)
  for (let i = 0; i < parts.length; i++) {
    const standAtStart = i === 0 ? startWithStand : parts[i - 1].getTopAtEnd() < parts[i].getTopAtStart()
    const standAtEnd = i === parts.length - 1 ? endWithStand : parts[i + 1].getTopAtStart() < parts[i].getTopAtEnd()
    yield* wallConstruction(parts[i], standAtStart, standAtEnd, start > 0)
  }
}

/**
 * Construct an opening group with its areas and measurements
 */
function* constructOpeningGroup(
  item: WallItem & { type: 'opening-group' },
  overallWallArea: WallConstructionArea,
  start: Length,
  end: Length,
  cornerInfo: WallCornerInfo,
  dimensions: WallDimensions,
  infillMethod: SegmentInfillMethod,
  wallOpeningAssemblyId?: OpeningAssemblyId
): Generator<ConstructionResult> {
  const group = item.openings
  const groupWidth = end - start
  const openingArea = overallWallArea.withXAdjustment(start, groupWidth)

  const zAdjustment = dimensions.finishedFloorZLevel - dimensions.z
  const sillHeight = Math.max(group[0].sillHeight ?? 0)
  const adjustedSill = sillHeight + zAdjustment
  const adjustedHeader = adjustedSill + group[0].height
  yield* item.assembly.construct(openingArea, adjustedHeader, adjustedSill, infillMethod, group)

  // Create opening areas (doors/windows/passages)
  for (const opening of group) {
    const config = resolveOpeningConfig(opening, { openingAssemblyId: wallOpeningAssemblyId })
    const openingArea = overallWallArea
      .withXAdjustment(
        cornerInfo.extensionStart + opening.centerOffsetFromWallStart - opening.width / 2 + config.padding,
        opening.width - 2 * config.padding
      )
      .withZAdjustment(adjustedSill + config.padding, opening.height - 2 * config.padding)

    const tags =
      opening.openingType === 'door' ? [TAG_OPENING_DOOR] : opening.openingType === 'window' ? [TAG_OPENING_WINDOW] : []

    yield yieldArea({
      type: 'cuboid',
      areaType: opening.openingType,
      sourceId: opening.id,
      size: openingArea.size,
      bounds: openingArea.bounds,
      transform: fromTrans(openingArea.position),
      tags,
      renderPosition: 'bottom'
    })
  }
}

/**
 * Iterate through wall items and construct segments, openings, and posts
 */
function* constructWallSegments(
  wallItems: WallItem[],
  overallWallArea: WallConstructionArea,
  standAtWallStart: boolean,
  standAtWallEnd: boolean,
  cornerInfo: WallCornerInfo,
  dimensions: WallDimensions,
  wallConstruction: WallSegmentConstruction,
  infillMethod: SegmentInfillMethod,
  wallOpeningAssemblyId: OpeningAssemblyId | undefined,
  splitAtHeightJumps: boolean
): Generator<ConstructionResult> {
  if (wallItems.length === 0) {
    // No items - use the overall area directly
    yield* wallConstruction(overallWallArea, standAtWallStart, standAtWallEnd, cornerInfo.extensionEnd > 0)
    return
  }

  let startWithStand = standAtWallStart
  let currentX = 0 // Position relative to overallWallArea start
  let lastOpeningEnd = 0

  for (const item of wallItems) {
    yield* constructWallSegment(
      overallWallArea,
      currentX,
      item.start,
      startWithStand,
      item.needsWallStands,
      wallConstruction,
      splitAtHeightJumps
    )
    startWithStand = item.needsWallStands

    if (item.type === 'opening-group' && item.start > currentX) {
      const x = overallWallArea.position[0] + lastOpeningEnd
      yield yieldMeasurement({
        startPoint: newVec3(x, dimensions.y, dimensions.z),
        endPoint: newVec3(overallWallArea.position[0] + item.start, dimensions.y, dimensions.z),
        extend1: newVec3(x, dimensions.y, dimensions.z + dimensions.sizeZ),
        extend2: newVec3(x, dimensions.y + dimensions.sizeY, dimensions.z),
        tags: [TAG_OPENING_SPACING]
      })

      lastOpeningEnd = item.end
    }

    if (item.type === 'opening-group') {
      yield* constructOpeningGroup(
        item,
        overallWallArea,
        item.start,
        item.end,
        cornerInfo,
        dimensions,
        infillMethod,
        wallOpeningAssemblyId
      )
    } else {
      const postWidth = item.end - item.start
      const postArea = overallWallArea.withXAdjustment(item.start, postWidth)
      yield* constructWallPost(postArea, item.post)
    }

    currentX = item.end
  }

  // Final wall segment after last item (if any)
  if (currentX < cornerInfo.constructionLength) {
    yield* constructWallSegment(
      overallWallArea,
      currentX,
      cornerInfo.constructionLength,
      startWithStand,
      standAtWallEnd,
      wallConstruction,
      splitAtHeightJumps
    )

    const x = overallWallArea.position[0] + lastOpeningEnd
    yield yieldMeasurement({
      startPoint: newVec3(x, dimensions.y, dimensions.z),
      endPoint: newVec3(overallWallArea.position[0] + cornerInfo.constructionLength, dimensions.y, dimensions.z),
      extend1: newVec3(x, dimensions.y, dimensions.z + dimensions.sizeZ),
      extend2: newVec3(x, dimensions.y + dimensions.sizeY, dimensions.z),
      tags: [TAG_OPENING_SPACING]
    })
  }
}

type WallItem =
  | {
      type: 'opening-group'
      openings: Opening[]
      assembly: ReturnType<typeof resolveOpeningAssembly>
      start: Length
      end: Length
      needsWallStands: boolean
    }
  | {
      type: 'post'
      post: WallPost
      start: Length
      end: Length
      needsWallStands: boolean
    }

/**
 * Combines openings (as groups) and posts into a single sorted list with computed bounds
 */
function createSortedWallItems(
  wall: PerimeterWallWithGeometry,
  extensionStart: Length,
  wallOpeningAssemblyId?: OpeningAssemblyId
): WallItem[] {
  const { getWallOpeningById, getWallPostById } = getModelActions()
  const items: WallItem[] = []

  // Add opening groups (existing merging logic already works)
  const openings = wall.entityIds.filter(isOpeningId).map(getWallOpeningById)
  const sortedOpenings = openings.sort((a, b) => a.centerOffsetFromWallStart - b.centerOffsetFromWallStart)
  const openingGroups = mergeAdjacentOpenings(sortedOpenings)

  for (const group of openingGroups) {
    const assembly = resolveOpeningAssembly(group[0].openingAssemblyId ?? wallOpeningAssemblyId)
    const segmentationPadding = assembly.getSegmentationPadding(group)
    const start = extensionStart + group[0].centerOffsetFromWallStart - group[0].width / 2 - segmentationPadding
    const end =
      extensionStart +
      group[group.length - 1].centerOffsetFromWallStart +
      group[group.length - 1].width / 2 +
      segmentationPadding

    items.push({
      type: 'opening-group',
      openings: group,
      assembly,
      start,
      end,
      needsWallStands: assembly.needsWallStands(group)
    })
  }

  // Add posts
  const posts = wall.entityIds.filter(isWallPostId).map(getWallPostById)
  for (const post of posts) {
    const postCenter = extensionStart + post.centerOffsetFromWallStart
    // Clamp to valid wall area, might be outside because of outside layers
    const start = Math.max(postCenter - post.width / 2, 0)
    const end = start + post.width

    items.push({
      type: 'post',
      post,
      start,
      end,
      needsWallStands: !post.replacesPosts
    })
  }

  items.sort((a, b) => a.start - b.start)

  return items
}

function* createCornerAreas(
  cornerInfo: WallCornerInfo,
  wallLength: Length,
  wallHeightStart: Length,
  wallHeightEnd: Length
): Generator<ConstructionResult> {
  yield yieldArea({
    type: 'polygon',
    areaType: 'corner',
    renderPosition: 'top',
    plane: 'xz',
    polygon: {
      points: [
        newVec2(-cornerInfo.startCorner.extensionDistance, 0),
        newVec2(-cornerInfo.startCorner.extensionDistance, wallHeightStart),
        newVec2(0, wallHeightStart),
        ZERO_VEC2
      ]
    },
    cancelKey: `corner-${cornerInfo.startCorner.id}`
  })

  yield yieldArea({
    type: 'polygon',
    areaType: 'corner',
    renderPosition: 'top',
    plane: 'xz',
    polygon: {
      points: [
        newVec2(wallLength, 0),
        newVec2(wallLength, wallHeightEnd),
        newVec2(wallLength + cornerInfo.endCorner.extensionDistance, wallHeightEnd),
        newVec2(wallLength + cornerInfo.endCorner.extensionDistance, 0)
      ]
    },
    cancelKey: `corner-${cornerInfo.endCorner.id}`
  })
}

function* createPlateAreas(
  totalConstructionHeight: Length,
  basePlateHeight: Length,
  topPlateHeight: Length,
  start: Length,
  constructionLength: Length,
  perimeterId: string,
  roofOffsets: WallTopOffsets
): Generator<ConstructionResult> {
  if (basePlateHeight > 0) {
    yield yieldArea({
      type: 'polygon',
      areaType: 'bottom-plate',
      renderPosition: 'bottom',
      plane: 'xz',
      polygon: {
        points: [
          newVec2(start, 0),
          newVec2(start + constructionLength, 0),
          newVec2(start + constructionLength, basePlateHeight),
          newVec2(start, basePlateHeight)
        ]
      },
      mergeKey: `bottom-plate-${perimeterId}`
    })
  }
  if (topPlateHeight > 0) {
    const topPoints = roofOffsets?.map(o => newVec2(start + o[0], totalConstructionHeight + o[1] + topPlateHeight)) ?? [
      newVec2(start, totalConstructionHeight + topPlateHeight),
      newVec2(start + constructionLength, totalConstructionHeight + topPlateHeight)
    ]
    const bottomPoints = roofOffsets?.map(o => newVec2(start + o[0], totalConstructionHeight + o[1])) ?? [
      newVec2(start, totalConstructionHeight),
      newVec2(start + constructionLength, totalConstructionHeight)
    ]
    yield yieldArea({
      type: 'polygon',
      areaType: 'top-plate',
      renderPosition: 'bottom',
      plane: 'xz',
      polygon: {
        points: [...topPoints, ...bottomPoints.reverse()]
      },
      mergeKey: `top-plate-${perimeterId}`
    })
  }
}

function* generateAreasAndMeasurements(
  finishedFloorZLevel: Length,
  overallWallArea: WallConstructionArea,
  basePlateHeight: number,
  topPlateHeight: number,
  cornerInfo: WallCornerInfo,
  wallLength: Length,
  perimeterId: PerimeterId,
  storeyId: StoreyId
) {
  const roofOffsets = overallWallArea.topOffsets
  const y = overallWallArea.position[1]
  const z = overallWallArea.position[2]
  const sizeY = overallWallArea.size[1]
  const sizeZ = overallWallArea.size[2]
  const { constructionLength, extensionStart } = cornerInfo

  const wallHeightStart = overallWallArea.getTopAtStart()
  const wallHeightEnd = overallWallArea.getTopAtEnd()

  const constructionHeightStart = basePlateHeight + wallHeightStart + topPlateHeight
  const constructionHeightEnd = basePlateHeight + wallHeightEnd + topPlateHeight

  yield yieldArea({
    type: 'cut',
    areaType: 'floor-level',
    renderPosition: 'top',
    axis: 'z',
    position: finishedFloorZLevel,
    mergeKey: `floor-level-${storeyId}`
  })

  yield* createCornerAreas(cornerInfo, wallLength, constructionHeightStart, constructionHeightEnd)

  yield* createPlateAreas(
    z + sizeZ,
    basePlateHeight,
    topPlateHeight,
    -extensionStart,
    constructionLength,
    perimeterId,
    roofOffsets
  )

  const xStart = -extensionStart
  const xMid = -extensionStart + constructionLength / 2
  const xEnd = -extensionStart + constructionLength

  yield yieldMeasurement({
    startPoint: newVec3(xStart, y, z),
    endPoint: newVec3(xEnd, y, z),
    extend1: newVec3(xStart, y + sizeY, z),
    extend2: newVec3(xStart, y, z + sizeZ),
    tags: [TAG_WALL_LENGTH]
  })

  yield yieldMeasurement({
    startPoint: newVec3(xStart, y, 0),
    endPoint: newVec3(xStart, y, constructionHeightStart),
    extend1: newVec3(xMid, y, 0),
    extend2: newVec3(xStart, y + sizeY, 0),
    tags: [TAG_WALL_HEIGHT]
  })
  yield yieldMeasurement({
    startPoint: newVec3(xMid, y, 0),
    endPoint: newVec3(xMid, y, constructionHeightEnd),
    extend1: newVec3(xEnd, y, 0),
    extend2: newVec3(xMid, y + sizeY, 0),
    tags: [TAG_WALL_HEIGHT]
  })

  yield yieldMeasurement({
    startPoint: newVec3(xStart, y, z),
    endPoint: newVec3(xStart, y, z + wallHeightStart),
    extend1: newVec3(xMid, y, z),
    extend2: newVec3(xStart, y + sizeY, z),
    tags: [TAG_WALL_CONSTRUCTION_HEIGHT]
  })
  yield yieldMeasurement({
    startPoint: newVec3(xMid, y, z),
    endPoint: newVec3(xMid, y, z + wallHeightEnd),
    extend1: newVec3(xEnd, y, z),
    extend2: newVec3(xMid, y + sizeY, z),
    tags: [TAG_WALL_CONSTRUCTION_HEIGHT]
  })

  if (basePlateHeight > 0) {
    yield yieldMeasurement({
      startPoint: newVec3(xStart, y, 0),
      endPoint: newVec3(xStart, y, basePlateHeight),
      extend1: newVec3(xEnd, y, 0),
      extend2: newVec3(xStart, y + sizeY, 0),
      tags: [TAG_RING_BEAM_HEIGHT]
    })
  }

  if (topPlateHeight > 0) {
    yield yieldMeasurement({
      startPoint: newVec3(xStart, y, z + wallHeightStart),
      endPoint: newVec3(xStart, y, constructionHeightStart),
      extend1: newVec3(xMid, y, z + wallHeightStart),
      extend2: newVec3(xStart, y + sizeY, z + wallHeightStart),
      tags: [TAG_RING_BEAM_HEIGHT]
    })

    yield yieldMeasurement({
      startPoint: newVec3(xMid, y, z + wallHeightEnd),
      endPoint: newVec3(xMid, y, constructionHeightEnd),
      extend1: newVec3(xEnd, y, z + wallHeightEnd),
      extend2: newVec3(xMid, y + sizeY, z + wallHeightEnd),
      tags: [TAG_RING_BEAM_HEIGHT]
    })
  }
}
