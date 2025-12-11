import { mat4, vec2, vec3 } from 'gl-matrix'

import type { OpeningAssemblyId, StoreyId } from '@/building/model/ids'
import type { Opening, Perimeter, PerimeterWall, Storey } from '@/building/model/model'
import { getModelActions } from '@/building/store'
import { getConfigActions } from '@/construction/config'
import type { FloorAssemblyConfig } from '@/construction/config/types'
import { FLOOR_ASSEMBLIES } from '@/construction/floors'
import { WallConstructionArea } from '@/construction/geometry'
import { resolveOpeningAssembly, resolveOpeningConfig } from '@/construction/openings/resolver'
import { type ConstructionResult, yieldArea, yieldMeasurement } from '@/construction/results'
import { ROOF_ASSEMBLIES } from '@/construction/roofs'
import type { HeightLine } from '@/construction/roofs/types'
import { getStoreyCeilingHeight } from '@/construction/storeyHeight'
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
  convertHeightLineToWallOffsets,
  fillNullRegions,
  mergeInsideOutsideHeightLines
} from '@/construction/walls/roofIntegration'
import type { Length } from '@/shared/geometry'

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
    extend1: vec3.fromValues(-extensionStart, y + sizeY, z),
    extend2: vec3.fromValues(-extensionStart, y, z + sizeZ),
    tags: [TAG_WALL_LENGTH]
  })

  yield yieldMeasurement({
    startPoint: vec3.fromValues(-extensionStart, y, 0),
    endPoint: vec3.fromValues(-extensionStart, y, totalConstructionHeight),
    extend1: vec3.fromValues(-extensionStart + constructionLength, y, 0),
    extend2: vec3.fromValues(-extensionStart, y + sizeY, 0),
    tags: [TAG_WALL_HEIGHT]
  })

  yield yieldMeasurement({
    startPoint: vec3.fromValues(-extensionStart, y, z),
    endPoint: vec3.fromValues(-extensionStart, y, sizeZ),
    extend1: vec3.fromValues(-extensionStart + constructionLength, y, z),
    extend2: vec3.fromValues(-extensionStart, y + sizeY, z),
    tags: [TAG_WALL_CONSTRUCTION_HEIGHT]
  })

  if (basePlateHeight > 0) {
    yield yieldMeasurement({
      startPoint: vec3.fromValues(-extensionStart, y, 0),
      endPoint: vec3.fromValues(-extensionStart, y, basePlateHeight),
      extend1: vec3.fromValues(-extensionStart + constructionLength, y, 0),
      extend2: vec3.fromValues(-extensionStart, y + sizeY, 0),
      tags: [TAG_RING_BEAM_HEIGHT]
    })
  }

  if (topPlateHeight > 0) {
    yield yieldMeasurement({
      startPoint: vec3.fromValues(-extensionStart, y, totalConstructionHeight - topPlateHeight),
      endPoint: vec3.fromValues(-extensionStart, y, totalConstructionHeight),
      extend1: vec3.fromValues(-extensionStart + constructionLength, y, totalConstructionHeight - topPlateHeight),
      extend2: vec3.fromValues(-extensionStart, y + sizeY, totalConstructionHeight - topPlateHeight),
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
      config.padding -
      assembly.segmentationPadding
    const groupEnd =
      extensionStart +
      openingGroup[openingGroup.length - 1].centerOffsetFromWallStart +
      openingGroup[openingGroup.length - 1].width / 2 +
      config.padding +
      assembly.segmentationPadding

    // Wall segment before opening (if any)
    if (groupStart > currentX) {
      const wallSegmentWidth = groupStart - currentX
      const wallSegmentArea = overallWallArea.withXAdjustment(currentX, wallSegmentWidth)

      yield* wallConstruction(wallSegmentArea, startWithStand, assembly.needsWallStands, currentX > 0)

      const x = overallWallArea.position[0] + currentX
      yield yieldMeasurement({
        startPoint: vec3.fromValues(x, y, z),
        endPoint: vec3.fromValues(x + wallSegmentWidth, y, z),
        extend1: vec3.fromValues(x, y, z + sizeZ),
        extend2: vec3.fromValues(x, y + sizeY, z),
        tags: [TAG_OPENING_SPACING]
      })
    }

    startWithStand = assembly.needsWallStands

    // Opening segment
    const groupWidth = groupEnd - groupStart
    const openingArea = overallWallArea.withXAdjustment(groupStart, groupWidth)

    const sillHeight = openingGroup[0].sillHeight ?? 0
    const adjustedSill = Math.max(sillHeight - config.padding, 0) + zAdjustment
    const adjustedHeader = adjustedSill + openingGroup[0].height + 2 * config.padding
    yield* assembly.construct(openingArea, adjustedHeader, adjustedSill, infillMethod)

    for (const opening of openingGroup) {
      const openingArea = overallWallArea
        .withXAdjustment(extensionStart + opening.centerOffsetFromWallStart - opening.width / 2, opening.width)
        .withZAdjustment(adjustedSill + config.padding, opening.height)

      const tags = opening.type === 'door' ? [TAG_OPENING_DOOR] : opening.type === 'window' ? [TAG_OPENING_WINDOW] : []
      const label = opening.type === 'door' ? 'Door' : opening.type === 'window' ? 'Window' : 'Passage'

      yield yieldArea({
        type: 'cuboid',
        areaType: opening.type,
        label,
        size: openingArea.size,
        bounds: openingArea.bounds,
        transform: mat4.fromTranslation(mat4.create(), openingArea.position),
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
      startPoint: vec3.fromValues(x, y, z),
      endPoint: vec3.fromValues(overallWallArea.position[0] + constructionLength, y, z),
      extend1: vec3.fromValues(x, y, z + sizeZ),
      extend2: vec3.fromValues(x, y + sizeY, z),
      tags: [TAG_OPENING_SPACING]
    })
  }
}
