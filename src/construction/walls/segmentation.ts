import type { OpeningAssemblyId, PerimeterId, StoreyId } from '@/building/model/ids'
import type { Opening, Perimeter, PerimeterWall } from '@/building/model/model'
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
import type { InfillMethod, WallLayersConfig } from '@/construction/walls'
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
  wall: PerimeterWall,
  perimeter: Perimeter,
  storeyContext: StoreyContext,
  layers: WallLayersConfig,
  wallConstruction: WallSegmentConstruction,
  infillMethod: InfillMethod,
  wallOpeningAssemblyId?: OpeningAssemblyId
): Generator<ConstructionResult> {
  const wallContext = getWallContext(wall, perimeter)
  const cornerInfo = calculateWallCornerInfo(wall, wallContext)
  const { constructionLength, extensionStart, extensionEnd } = cornerInfo

  const { getRingBeamAssemblyById } = getConfigActions()
  // Get ring beam assemblies for THIS specific wall
  const basePlateAssembly = wall.baseRingBeamAssemblyId ? getRingBeamAssemblyById(wall.baseRingBeamAssemblyId) : null
  const basePlateHeight = basePlateAssembly ? resolveRingBeamAssembly(basePlateAssembly).height : 0
  const topPlateAssembly = wall.topRingBeamAssemblyId ? getRingBeamAssemblyById(wall.topRingBeamAssemblyId) : null
  const topPlateHeight = topPlateAssembly ? resolveRingBeamAssembly(topPlateAssembly).height : 0

  const totalConstructionHeight = storeyContext.wallTop - storeyContext.wallBottom
  const ceilingOffset = storeyContext.roofBottom - storeyContext.wallTop

  const y = layers.insideThickness
  const sizeY = wall.thickness - layers.insideThickness - layers.outsideThickness
  const z = basePlateHeight
  const sizeZ = totalConstructionHeight - basePlateHeight - topPlateHeight

  const finishedFloorZLevel = storeyContext.finishedFloorTop - storeyContext.wallBottom

  const standAtWallStart = wallContext.startCorner.exteriorAngle !== 180 || cornerInfo.startCorner.constructedByThisWall
  const standAtWallEnd = wallContext.endCorner.exteriorAngle !== 180 || cornerInfo.endCorner.constructedByThisWall

  // Query roofs and get merged height line
  const roofHeightLine = getRoofHeightLineForLines(
    perimeter.storeyId,
    [cornerInfo.constructionInsideLine, cornerInfo.constructionOutsideLine],
    -ceilingOffset,
    storeyContext.perimeterContexts
  )

  // Convert roof height line to wall offsets
  let roofOffsets
  if (roofHeightLine) {
    roofOffsets = convertHeightLineToWallOffsets(roofHeightLine, constructionLength)
  } else {
    roofOffsets = [newVec2(0, -ceilingOffset), newVec2(constructionLength, -ceilingOffset)]
  }

  // Create overall wall construction area ONCE with roof offsets
  const overallWallArea = new WallConstructionArea(
    newVec3(-extensionStart, y, z),
    newVec3(constructionLength, sizeY, sizeZ),
    roofOffsets
  )

  yield* generateAreasAndMeasurements(
    finishedFloorZLevel,
    overallWallArea,
    basePlateHeight,
    topPlateHeight,
    cornerInfo,
    wall.wallLength,
    perimeter.id,
    perimeter.storeyId
  )

  // Create combined list of openings and posts
  const wallItems = createSortedWallItems(wall, wallOpeningAssemblyId)

  if (wallItems.length === 0) {
    // No items - use the overall area directly
    yield* wallConstruction(overallWallArea, standAtWallStart, standAtWallEnd, extensionEnd > 0)
    return
  }

  let startWithStand = standAtWallStart
  let currentX = 0 // Position relative to overallWallArea start
  let lastOpeningEnd = 0

  const zAdjustment = finishedFloorZLevel - z

  for (const item of wallItems) {
    const { start, end } = getItemBounds(item, extensionStart)

    // Wall segment before item (if any)
    if (start > currentX) {
      const wallSegmentWidth = start - currentX
      const wallSegmentArea = overallWallArea.withXAdjustment(currentX, wallSegmentWidth)

      const parts = splitAtHeightJumps(wallSegmentArea)
      for (let i = 0; i < parts.length; i++) {
        const standAtStart = i === 0 ? startWithStand : parts[i - 1].getHeightAtEnd() < parts[i].getHeightAtStart()
        const standAtEnd =
          i === parts.length - 1
            ? itemNeedsWallStands(item)
            : parts[i + 1].getHeightAtStart() < parts[i].getHeightAtEnd()
        yield* wallConstruction(parts[i], standAtStart, standAtEnd, currentX > 0)
      }

      if (item.type === 'opening-group') {
        const x = overallWallArea.position[0] + lastOpeningEnd
        yield yieldMeasurement({
          startPoint: newVec3(x, y, z),
          endPoint: newVec3(overallWallArea.position[0] + start, y, z),
          extend1: newVec3(x, y, z + sizeZ),
          extend2: newVec3(x, y + sizeY, z),
          tags: [TAG_OPENING_SPACING]
        })
        lastOpeningEnd = end
      }
    }

    // Update stand logic for next segment
    startWithStand = itemNeedsWallStands(item)

    // Construct the item itself
    if (item.type === 'opening-group') {
      const group = item.openings
      const groupWidth = end - start
      const openingArea = overallWallArea.withXAdjustment(start, groupWidth)

      const sillHeight = Math.max(group[0].sillHeight ?? 0)
      const adjustedSill = sillHeight + zAdjustment
      const adjustedHeader = adjustedSill + group[0].height
      yield* item.assembly.construct(openingArea, adjustedHeader, adjustedSill, infillMethod)

      // Create opening areas (doors/windows/passages)
      for (const opening of group) {
        const config = resolveOpeningConfig(opening, { openingAssemblyId: wallOpeningAssemblyId })
        const openingArea = overallWallArea
          .withXAdjustment(
            extensionStart + opening.centerOffsetFromWallStart - opening.width / 2 + config.padding,
            opening.width - 2 * config.padding
          )
          .withZAdjustment(adjustedSill + config.padding, opening.height - 2 * config.padding)

        const tags =
          opening.type === 'door' ? [TAG_OPENING_DOOR] : opening.type === 'window' ? [TAG_OPENING_WINDOW] : []
        const label = opening.type === 'door' ? 'Door' : opening.type === 'window' ? 'Window' : 'Passage'

        yield yieldArea({
          type: 'cuboid',
          areaType: opening.type,
          label,
          sourceId: opening.id,
          size: openingArea.size,
          bounds: openingArea.bounds,
          transform: fromTrans(openingArea.position),
          tags,
          renderPosition: 'bottom'
        })
      }
    } else if (item.type === 'post') {
      // Construct post
      const postWidth = end - start
      const postArea = overallWallArea.withXAdjustment(start, postWidth)
      yield* constructWallPost(postArea, item.post)
      // No measurements for posts
    }

    currentX = end
  }

  // Final wall segment after last item (if any)
  if (currentX < constructionLength) {
    const finalSegmentWidth = constructionLength - currentX
    const finalWallArea = overallWallArea.withXAdjustment(currentX, finalSegmentWidth)

    const parts = splitAtHeightJumps(finalWallArea)
    for (let i = 0; i < parts.length; i++) {
      const standAtStart = i === 0 ? startWithStand : parts[i - 1].getHeightAtEnd() < parts[i].getHeightAtStart()
      const standAtEnd =
        i === parts.length - 1 ? standAtWallEnd : parts[i + 1].getHeightAtStart() < parts[i].getHeightAtEnd()
      yield* wallConstruction(parts[i], standAtStart, standAtEnd, true)
    }

    const x = overallWallArea.position[0] + lastOpeningEnd
    yield yieldMeasurement({
      startPoint: newVec3(x, y, z),
      endPoint: newVec3(overallWallArea.position[0] + constructionLength, y, z),
      extend1: newVec3(x, y, z + sizeZ),
      extend2: newVec3(x, y + sizeY, z),
      tags: [TAG_OPENING_SPACING]
    })
  }
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

type WallItem =
  | {
      type: 'opening-group'
      openings: Opening[]
      assembly: ReturnType<typeof resolveOpeningAssembly>
    }
  | { type: 'post'; post: PerimeterWall['posts'][number] }

/**
 * Combines openings (as groups) and posts into a single sorted list
 */
function createSortedWallItems(wall: PerimeterWall, wallOpeningAssemblyId?: OpeningAssemblyId): WallItem[] {
  const items: WallItem[] = []

  // Add opening groups (existing merging logic already works)
  const sortedOpenings = [...wall.openings].sort((a, b) => a.centerOffsetFromWallStart - b.centerOffsetFromWallStart)
  const openingGroups = mergeAdjacentOpenings(sortedOpenings)

  for (const group of openingGroups) {
    const assembly = resolveOpeningAssembly(group[0].openingAssemblyId ?? wallOpeningAssemblyId)
    items.push({
      type: 'opening-group',
      openings: group,
      assembly
    })
  }

  // Add posts
  for (const post of wall.posts) {
    items.push({ type: 'post', post })
  }

  // Sort all items by center position
  items.sort((a, b) => {
    const centerA =
      a.type === 'opening-group' ? a.openings[0].centerOffsetFromWallStart : a.post.centerOffsetFromWallStart
    const centerB =
      b.type === 'opening-group' ? b.openings[0].centerOffsetFromWallStart : b.post.centerOffsetFromWallStart
    return centerA - centerB
  })

  return items
}

/**
 * Returns the construction bounds (start/end positions) for a wall item
 */
function getItemBounds(item: WallItem, extensionStart: Length): { start: Length; end: Length } {
  if (item.type === 'opening-group') {
    const group = item.openings
    const groupStart =
      extensionStart + group[0].centerOffsetFromWallStart - group[0].width / 2 - item.assembly.segmentationPadding
    const groupEnd =
      extensionStart +
      group[group.length - 1].centerOffsetFromWallStart +
      group[group.length - 1].width / 2 +
      item.assembly.segmentationPadding
    return { start: groupStart, end: groupEnd }
  } else {
    const postCenter = extensionStart + item.post.centerOffsetFromWallStart
    // Clamp to valid wall area, might be outside because of outside layers
    const start = Math.max(postCenter - item.post.width / 2, 0)
    return {
      start,
      end: start + item.post.width
    }
  }
}

/**
 * Determines if a wall item requires wall stands before/after it
 */
function itemNeedsWallStands(item: WallItem): boolean {
  if (item.type === 'opening-group') {
    return item.assembly.needsWallStands
  } else {
    // Post replaces structural posts → no stands needed at this position
    // Post doesn't replace posts → stands needed at this position
    return !item.post.replacesPosts
  }
}

function* createCornerAreas(
  cornerInfo: WallCornerInfo,
  wallLength: Length,
  wallHeightStart: Length,
  wallHeightEnd: Length
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
          newVec2(-cornerInfo.startCorner.extensionDistance, 0),
          newVec2(-cornerInfo.startCorner.extensionDistance, wallHeightStart),
          newVec2(0, wallHeightStart),
          ZERO_VEC2
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
          newVec2(wallLength, 0),
          newVec2(wallLength, wallHeightEnd),
          newVec2(wallLength + cornerInfo.endCorner.extensionDistance, wallHeightEnd),
          newVec2(wallLength + cornerInfo.endCorner.extensionDistance, 0)
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
  perimeterId: string,
  roofOffsets: WallTopOffsets
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
      label: 'Top Ring Beam',
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

  const wallHeightStart = overallWallArea.getHeightAtStart()
  const wallHeightEnd = overallWallArea.getHeightAtEnd()

  const constructionHeightStart = basePlateHeight + wallHeightStart + topPlateHeight
  const constructionHeightEnd = basePlateHeight + wallHeightEnd + topPlateHeight

  yield yieldArea({
    type: 'cut',
    areaType: 'floor-level',
    renderPosition: 'top',
    label: 'Finished Floor Level',
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
