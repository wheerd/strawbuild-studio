import type { Opening, OpeningAssemblyId, WallEntityId, WallPost } from '@/building/model'
import { isOpeningId, isWallPostId } from '@/building/model/ids'
import { getModelActions } from '@/building/store'
import { resolveOpeningAssembly, resolveOpeningConfig } from '@/construction/assemblies/openings'
import type { OpeningAssembly } from '@/construction/assemblies/openings/types'
import { constructWallPost } from '@/construction/assemblies/perimeterWalls/posts'
import { WallConstructionArea } from '@/construction/assemblies/utils/WallConstructionArea'
import { type ConstructionResult, yieldArea, yieldMeasurement } from '@/construction/model/results'
import { TAG_OPENING_DOOR, TAG_OPENING_SPACING, TAG_OPENING_WINDOW } from '@/construction/model/tags'
import type { Length } from '@/shared/geometry'
import { fromTrans, newVec3 } from '@/shared/geometry'

export type InteriorWallSegmentConstruction = (
  area: WallConstructionArea,
  startsWithStud: boolean,
  endsWithStud: boolean,
  startAtEnd: boolean
) => Generator<ConstructionResult>

type WallItem =
  | {
      type: 'opening-group'
      openings: Opening[]
      start: Length
      end: Length
      assembly: OpeningAssembly
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

function createWallItems(entityIds: readonly WallEntityId[], openingAssemblyId?: OpeningAssemblyId): WallItem[] {
  const { getWallOpeningById, getWallPostById } = getModelActions()
  const openings = entityIds
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
      start: first.centerOffsetFromWallStart - first.width / 2 - padding,
      end: last.centerOffsetFromWallStart + last.width / 2 + padding,
      needsWallStands: assembly.needsWallStands(group)
    })
  }

  for (const post of entityIds.filter(isWallPostId).map(getWallPostById)) {
    const center = post.centerOffsetFromWallStart
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
  area: WallConstructionArea,
  startsWithStud: boolean,
  endsWithStud: boolean,
  segmentConstruction: InteriorWallSegmentConstruction,
  entityIds: readonly WallEntityId[],
  openingAssemblyId?: OpeningAssemblyId
): Generator<ConstructionResult> {
  const items = createWallItems(entityIds, openingAssemblyId)
  if (items.length === 0) {
    yield* segmentConstruction(area, startsWithStud, endsWithStud, true)
    return
  }

  const start = area.position[0]
  const end = area.position[0] + area.size[0]
  let currentX = area.position[0]
  let startsWithCurrentStud = startsWithStud
  let previousOpeningEnd = currentX
  for (const item of items) {
    if (item.start > currentX) {
      yield* segmentConstruction(
        area.withXAdjustment(currentX - start, item.start - currentX),
        startsWithCurrentStud,
        item.needsWallStands,
        currentX === start
      )
      if (item.type === 'opening-group') {
        yield yieldMeasurement({
          startPoint: newVec3(area.position[0] + previousOpeningEnd, area.position[1], area.position[2]),
          endPoint: newVec3(area.position[0] + item.start, area.position[1], area.position[2]),
          extend1: newVec3(area.position[0] + previousOpeningEnd, area.position[1], area.position[2] + area.size[2]),
          tags: [TAG_OPENING_SPACING]
        })
        previousOpeningEnd = item.end
      }
    }

    if (item.type === 'opening-group') {
      const openingArea = area.withXAdjustment(item.start - start, item.end - item.start)
      const first = item.openings[0]
      const sill = Math.max(first.sillHeight ?? 0) - openingArea.position[2]
      yield* item.assembly.construct(
        openingArea,
        sill + first.height,
        sill,
        area => segmentConstruction(area, false, false, false),
        item.openings
      )

      for (const opening of item.openings) {
        const config = resolveOpeningConfig(opening, { openingAssemblyId })
        const openingArea = area
          .withXAdjustment(
            opening.centerOffsetFromWallStart - opening.width / 2 + config.padding - start,
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
          size: openingArea.size,
          bounds: openingArea.bounds,
          transform: fromTrans(openingArea.position),
          tags,
          renderPosition: 'bottom'
        })
      }
    } else {
      yield* constructWallPost(area.withXAdjustment(item.start - start, item.end - item.start), item.post)
    }

    currentX = Math.max(currentX, item.end)
    startsWithCurrentStud = item.needsWallStands
  }

  if (currentX < end) {
    yield* segmentConstruction(
      area.withXAdjustment(currentX - start),
      startsWithCurrentStud,
      endsWithStud,
      currentX === start
    )
    yield yieldMeasurement({
      startPoint: newVec3(area.position[0] + previousOpeningEnd, area.position[1], area.position[2]),
      endPoint: newVec3(area.position[0] + area.size[0], area.position[1], area.position[2]),
      extend1: newVec3(area.position[0] + previousOpeningEnd, area.position[1], area.position[2] + area.size[2]),
      tags: [TAG_OPENING_SPACING]
    })
  }
}
