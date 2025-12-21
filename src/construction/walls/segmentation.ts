import type { OpeningAssemblyId } from '@/building/model/ids'
import type { Opening, Perimeter, PerimeterWall } from '@/building/model/model'
import { getConfigActions } from '@/construction/config'
import { WallConstructionArea } from '@/construction/geometry'
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
import { convertHeightLineToWallOffsets, getRoofHeightLineForLines } from '@/construction/walls/roofIntegration'
import { type Length, ZERO_VEC2, fromTrans, newVec2, newVec3 } from '@/shared/geometry'

import type { WallCornerInfo } from './construction'
import { calculateWallCornerInfo, getWallContext } from './corners/corners'

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
          newVec2(-cornerInfo.startCorner.extensionDistance, 0),
          newVec2(-cornerInfo.startCorner.extensionDistance, wallHeight),
          newVec2(0, wallHeight),
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
          newVec2(wallLength, wallHeight),
          newVec2(wallLength + cornerInfo.endCorner.extensionDistance, wallHeight),
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
    yield yieldArea({
      type: 'polygon',
      areaType: 'top-plate',
      renderPosition: 'bottom',
      label: 'Top Ring Beam',
      plane: 'xz',
      polygon: {
        points: [
          newVec2(start, totalConstructionHeight - topPlateHeight),
          newVec2(start + constructionLength, totalConstructionHeight - topPlateHeight),
          newVec2(start + constructionLength, totalConstructionHeight),
          newVec2(start, totalConstructionHeight)
        ]
      },
      mergeKey: `top-plate-${perimeterId}`
    })
  }
}

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

  const finishedFloorZLevel = storeyContext.finishedFloorTop - storeyContext.wallBottom

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
    startPoint: newVec3(-extensionStart, y, z),
    endPoint: newVec3(-extensionStart + constructionLength, y, z),
    extend1: newVec3(-extensionStart, y + sizeY, z),
    extend2: newVec3(-extensionStart, y, z + sizeZ),
    tags: [TAG_WALL_LENGTH]
  })

  yield yieldMeasurement({
    startPoint: newVec3(-extensionStart, y, 0),
    endPoint: newVec3(-extensionStart, y, totalConstructionHeight),
    extend1: newVec3(-extensionStart + constructionLength, y, 0),
    extend2: newVec3(-extensionStart, y + sizeY, 0),
    tags: [TAG_WALL_HEIGHT]
  })

  yield yieldMeasurement({
    startPoint: newVec3(-extensionStart, y, z),
    endPoint: newVec3(-extensionStart, y, sizeZ),
    extend1: newVec3(-extensionStart + constructionLength, y, z),
    extend2: newVec3(-extensionStart, y + sizeY, z),
    tags: [TAG_WALL_CONSTRUCTION_HEIGHT]
  })

  if (basePlateHeight > 0) {
    yield yieldMeasurement({
      startPoint: newVec3(-extensionStart, y, 0),
      endPoint: newVec3(-extensionStart, y, basePlateHeight),
      extend1: newVec3(-extensionStart + constructionLength, y, 0),
      extend2: newVec3(-extensionStart, y + sizeY, 0),
      tags: [TAG_RING_BEAM_HEIGHT]
    })
  }

  if (topPlateHeight > 0) {
    yield yieldMeasurement({
      startPoint: newVec3(-extensionStart, y, totalConstructionHeight - topPlateHeight),
      endPoint: newVec3(-extensionStart, y, totalConstructionHeight),
      extend1: newVec3(-extensionStart + constructionLength, y, totalConstructionHeight - topPlateHeight),
      extend2: newVec3(-extensionStart, y + sizeY, totalConstructionHeight - topPlateHeight),
      tags: [TAG_RING_BEAM_HEIGHT]
    })
  }

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

  if (wall.openings.length === 0) {
    // No openings - use the overall area directly
    yield* wallConstruction(overallWallArea, standAtWallStart, standAtWallEnd, extensionEnd > 0)
    return
  }

  const sortedOpenings = [...wall.openings].sort((a, b) => a.centerOffsetFromWallStart - b.centerOffsetFromWallStart)
  const openingGroups = mergeAdjacentOpenings(sortedOpenings)

  let startWithStand = standAtWallStart
  let currentX = 0 // Position relative to overallWallArea start

  const zAdjustment = finishedFloorZLevel - z
  for (const openingGroup of openingGroups) {
    const config = resolveOpeningConfig(openingGroup[0], { openingAssemblyId: wallOpeningAssemblyId })
    const assembly = resolveOpeningAssembly(openingGroup[0].openingAssemblyId ?? wallOpeningAssemblyId)

    const groupStart =
      extensionStart +
      openingGroup[0].centerOffsetFromWallStart -
      openingGroup[0].width / 2 -
      assembly.segmentationPadding
    const groupEnd =
      extensionStart +
      openingGroup[openingGroup.length - 1].centerOffsetFromWallStart +
      openingGroup[openingGroup.length - 1].width / 2 +
      assembly.segmentationPadding

    // Wall segment before opening (if any)
    if (groupStart > currentX) {
      const wallSegmentWidth = groupStart - currentX
      const wallSegmentArea = overallWallArea.withXAdjustment(currentX, wallSegmentWidth)

      yield* wallConstruction(wallSegmentArea, startWithStand, assembly.needsWallStands, currentX > 0)

      const x = overallWallArea.position[0] + currentX
      yield yieldMeasurement({
        startPoint: newVec3(x, y, z),
        endPoint: newVec3(x + wallSegmentWidth, y, z),
        extend1: newVec3(x, y, z + sizeZ),
        extend2: newVec3(x, y + sizeY, z),
        tags: [TAG_OPENING_SPACING]
      })
    }

    startWithStand = assembly.needsWallStands

    // Opening segment
    const groupWidth = groupEnd - groupStart
    const openingArea = overallWallArea.withXAdjustment(groupStart, groupWidth)

    const sillHeight = Math.max(openingGroup[0].sillHeight ?? 0)
    const adjustedSill = sillHeight + zAdjustment
    const adjustedHeader = adjustedSill + openingGroup[0].height
    yield* assembly.construct(openingArea, adjustedHeader, adjustedSill, infillMethod)

    for (const opening of openingGroup) {
      const openingArea = overallWallArea
        .withXAdjustment(
          extensionStart + opening.centerOffsetFromWallStart - opening.width / 2 + config.padding,
          opening.width - 2 * config.padding
        )
        .withZAdjustment(adjustedSill + config.padding, opening.height - 2 * config.padding)

      const tags = opening.type === 'door' ? [TAG_OPENING_DOOR] : opening.type === 'window' ? [TAG_OPENING_WINDOW] : []
      const label = opening.type === 'door' ? 'Door' : opening.type === 'window' ? 'Window' : 'Passage'

      yield yieldArea({
        type: 'cuboid',
        areaType: opening.type,
        label,
        size: openingArea.size,
        bounds: openingArea.bounds,
        transform: fromTrans(openingArea.position),
        tags,
        renderPosition: 'bottom'
      })
    }

    currentX = groupEnd
  }

  // Final wall segment after last opening (if any)
  if (currentX < constructionLength) {
    const finalSegmentWidth = constructionLength - currentX
    const finalWallArea = overallWallArea.withXAdjustment(currentX, finalSegmentWidth)

    yield* wallConstruction(finalWallArea, startWithStand, standAtWallEnd, true)

    const x = overallWallArea.position[0] + currentX
    yield yieldMeasurement({
      startPoint: newVec3(x, y, z),
      endPoint: newVec3(overallWallArea.position[0] + constructionLength, y, z),
      extend1: newVec3(x, y, z + sizeZ),
      extend2: newVec3(x, y + sizeY, z),
      tags: [TAG_OPENING_SPACING]
    })
  }
}
