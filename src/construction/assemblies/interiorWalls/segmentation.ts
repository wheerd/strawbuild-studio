import type { IntermediateWallWithGeometry, Opening, OpeningAssemblyId, WallPost } from '@/building/model'
import { isOpeningId, isWallPostId } from '@/building/model/ids'
import { getModelActions } from '@/building/store'
import { resolveOpeningAssembly, resolveOpeningConfig } from '@/construction/assemblies/openings'
import { constructWallPost } from '@/construction/assemblies/perimeterWalls/posts'
import type { SegmentInfillMethod } from '@/construction/assemblies/perimeterWalls/types'
import { WallConstructionArea } from '@/construction/assemblies/utils/WallConstructionArea'
import { type ConstructionResult, yieldArea, yieldMeasurement } from '@/construction/model/results'
import { TAG_OPENING_DOOR, TAG_OPENING_SPACING, TAG_OPENING_WINDOW } from '@/construction/model/tags'
import type { Length } from '@/shared/geometry'
import { fromTrans, newVec3 } from '@/shared/geometry'

export type InteriorWallSegmentConstruction = (
  area: WallConstructionArea,
  startsWithStand: boolean,
  endsWithStand: boolean,
  startAtEnd: boolean
) => Generator<ConstructionResult>

type WallItem =
  | {
      type: 'opening-group'
      openings: Opening[]
      start: Length
      end: Length
      assembly: ReturnType<typeof resolveOpeningAssembly>
      needsWallStands: boolean
    }
  | {
      type: 'post'
      post: WallPost
      start: Length
      end: Length
      needsWallStands: boolean
    }

function canMergeOpenings(first: Opening, second: Opening): boolean {
  if (first.openingAssemblyId !== second.openingAssemblyId) return false
  if (first.centerOffsetFromWallStart + first.width / 2 !== second.centerOffsetFromWallStart - second.width / 2) {
    return false
  }
  const firstSill = first.sillHeight ?? 0
  const secondSill = second.sillHeight ?? 0
  return firstSill === secondSill && firstSill + first.height === secondSill + second.height
}

function mergeAdjacentOpenings(openings: Opening[]): Opening[][] {
  if (openings.length === 0) return []
  const groups: Opening[][] = [[openings[0]]]
  for (const opening of openings.slice(1)) {
    const current = groups[groups.length - 1]
    if (canMergeOpenings(current[current.length - 1], opening)) current.push(opening)
    else groups.push([opening])
  }
  return groups
}

function createWallItems(
  wall: IntermediateWallWithGeometry,
  extensionStart: Length,
  openingAssemblyId?: OpeningAssemblyId
): WallItem[] {
  const { getWallOpeningById, getWallPostById } = getModelActions()
  const openings = wall.entityIds
    .filter(isOpeningId)
    .map(getWallOpeningById)
    .sort((a, b) => a.centerOffsetFromWallStart - b.centerOffsetFromWallStart)
  const items: WallItem[] = []

  for (const group of mergeAdjacentOpenings(openings)) {
    const assembly = resolveOpeningAssembly(group[0].openingAssemblyId ?? openingAssemblyId)
    const padding = assembly.getSegmentationPadding(group)
    const first = group[0]
    const last = group[group.length - 1]
    items.push({
      type: 'opening-group',
      openings: group,
      assembly,
      start: extensionStart + first.centerOffsetFromWallStart - first.width / 2 - padding,
      end: extensionStart + last.centerOffsetFromWallStart + last.width / 2 + padding,
      needsWallStands: assembly.needsWallStands(group)
    })
  }

  for (const post of wall.entityIds.filter(isWallPostId).map(getWallPostById)) {
    const center = extensionStart + post.centerOffsetFromWallStart
    const start = Math.max(0, center - post.width / 2)
    items.push({
      type: 'post',
      post,
      start,
      end: start + post.width,
      needsWallStands: !post.replacesPosts
    })
  }

  return items.sort((a, b) => a.start - b.start)
}

export function* constructInteriorWallSegments(
  wall: IntermediateWallWithGeometry,
  overallArea: WallConstructionArea,
  extensionStart: Length,
  finishedFloorZLevel: Length,
  startsWithStand: boolean,
  endsWithStand: boolean,
  segmentConstruction: InteriorWallSegmentConstruction,
  infillMethod: SegmentInfillMethod,
  openingAssemblyId?: OpeningAssemblyId
): Generator<ConstructionResult> {
  const items = createWallItems(wall, extensionStart, openingAssemblyId)
  if (items.length === 0) {
    yield* segmentConstruction(overallArea, startsWithStand, endsWithStand, extensionStart > 0)
    return
  }

  let currentX = 0
  let startsWithCurrentStand = startsWithStand
  let previousOpeningEnd = 0
  for (const item of items) {
    if (item.start > currentX) {
      yield* segmentConstruction(
        overallArea.withXAdjustment(currentX, item.start - currentX),
        startsWithCurrentStand,
        item.needsWallStands,
        currentX === 0 && extensionStart > 0
      )
      if (item.type === 'opening-group') {
        yield yieldMeasurement({
          startPoint: newVec3(
            overallArea.position[0] + previousOpeningEnd,
            overallArea.position[1],
            overallArea.position[2]
          ),
          endPoint: newVec3(overallArea.position[0] + item.start, overallArea.position[1], overallArea.position[2]),
          extend1: newVec3(
            overallArea.position[0] + previousOpeningEnd,
            overallArea.position[1],
            overallArea.position[2] + overallArea.size[2]
          ),
          tags: [TAG_OPENING_SPACING]
        })
        previousOpeningEnd = item.end
      }
    }

    if (item.type === 'opening-group') {
      const openingArea = overallArea.withXAdjustment(item.start, item.end - item.start)
      const first = item.openings[0]
      const sill = Math.max(first.sillHeight ?? 0) + finishedFloorZLevel
      yield* item.assembly.construct(openingArea, sill + first.height, sill, infillMethod, item.openings)

      for (const opening of item.openings) {
        const config = resolveOpeningConfig(opening, { openingAssemblyId })
        const area = overallArea
          .withXAdjustment(
            extensionStart + opening.centerOffsetFromWallStart - opening.width / 2 + config.padding,
            opening.width - 2 * config.padding
          )
          .withZAdjustment(sill + config.padding, opening.height - 2 * config.padding)
        const tags =
          opening.openingType === 'door'
            ? [TAG_OPENING_DOOR]
            : opening.openingType === 'window'
              ? [TAG_OPENING_WINDOW]
              : []
        yield yieldArea({
          type: 'cuboid',
          areaType: opening.openingType,
          sourceId: opening.id,
          size: area.size,
          bounds: area.bounds,
          transform: fromTrans(area.position),
          tags,
          renderPosition: 'bottom'
        })
      }
    } else {
      yield* constructWallPost(overallArea.withXAdjustment(item.start, item.end - item.start), item.post)
    }

    currentX = Math.max(currentX, item.end)
    startsWithCurrentStand = item.needsWallStands
  }

  if (currentX < overallArea.size[0]) {
    yield* segmentConstruction(
      overallArea.withXAdjustment(currentX),
      startsWithCurrentStand,
      endsWithStand,
      currentX === 0 && extensionStart > 0
    )
    yield yieldMeasurement({
      startPoint: newVec3(
        overallArea.position[0] + previousOpeningEnd,
        overallArea.position[1],
        overallArea.position[2]
      ),
      endPoint: newVec3(
        overallArea.position[0] + overallArea.size[0],
        overallArea.position[1],
        overallArea.position[2]
      ),
      extend1: newVec3(
        overallArea.position[0] + previousOpeningEnd,
        overallArea.position[1],
        overallArea.position[2] + overallArea.size[2]
      ),
      tags: [TAG_OPENING_SPACING]
    })
  }
}
