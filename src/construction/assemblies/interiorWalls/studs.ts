import { WallConstructionArea } from '@/construction/assemblies/utils/WallConstructionArea'
import { type ConstructionResult, yieldElement, yieldMeasurement } from '@/construction/model/results'
import { TAG_INFILL, TAG_POST, TAG_POST_SPACING } from '@/construction/model/tags'
import type { MaterialId } from '@/materials/types'
import type { Length } from '@/shared/geometry'
import { newVec3 } from '@/shared/geometry'

export interface StudLayoutConfig {
  minStudSpacing: Length
  desiredStudSpacing: Length
  maxStudSpacing: Length
  studWidth: Length
  studMaterial: MaterialId
  fillMaterial?: MaterialId
}

function getStudPositions(
  width: Length,
  studWidth: Length,
  desiredSpacing: Length,
  minSpacing: Length,
  maxSpacing: Length,
  startsWithStand: boolean,
  endsWithStand: boolean
): Length[] {
  if (width <= 0 || studWidth > width) return []

  const lastStart = width - studWidth
  const firstStart = startsWithStand ? 0 : Math.min(desiredSpacing, lastStart)
  const finalStart = endsWithStand ? lastStart : Math.max(firstStart, lastStart - desiredSpacing)
  if (finalStart <= firstStart) return [firstStart]

  const span = finalStart - firstStart
  const minimumIntervals = Math.max(1, Math.ceil(span / maxSpacing))
  const maximumIntervals = Math.max(minimumIntervals, Math.floor(span / minSpacing))
  const intervals = Math.min(maximumIntervals, Math.max(minimumIntervals, Math.round(span / desiredSpacing)))
  return Array.from({ length: intervals + 1 }, (_, index) => firstStart + (span * index) / intervals)
}

export function* constructStudSegment(
  area: WallConstructionArea,
  config: StudLayoutConfig,
  startsWithStand: boolean,
  endsWithStand: boolean
): Generator<ConstructionResult> {
  const positions = getStudPositions(
    area.size[0],
    config.studWidth,
    config.desiredStudSpacing,
    config.minStudSpacing,
    config.maxStudSpacing,
    startsWithStand,
    endsWithStand
  )

  const studAreas = positions.map(position => area.withXAdjustment(position, config.studWidth))
  for (const studArea of studAreas) {
    const element = studArea.extrude(config.studMaterial, [TAG_POST], {
      type: 'post',
      requiresSinglePiece: true
    })
    if (element) yield* yieldElement(element)
  }

  if (config.fillMaterial) {
    let current = 0
    for (const position of positions) {
      if (position > current) {
        const fill = area.withXAdjustment(current, position - current).extrude(config.fillMaterial, [TAG_INFILL])
        if (fill) yield* yieldElement(fill)
      }
      current = position + config.studWidth
    }
    if (current < area.size[0]) {
      area.withXAdjustment(current).createMeasurement('width', [TAG_POST_SPACING])
      const fill = area.withXAdjustment(current).extrude(config.fillMaterial, [TAG_INFILL])
      if (fill) yield* yieldElement(fill)
    }
  }

  for (let index = 1; index < positions.length; index++) {
    const start = newVec3(
      area.position[0] + positions[index - 1] + config.studWidth,
      area.position[1],
      area.position[2]
    )
    const end = newVec3(area.position[0] + positions[index], area.position[1], area.position[2])
    yield yieldMeasurement({
      startPoint: start,
      endPoint: end,
      length: end[0] - start[0],
      offset: 0,
      tags: [TAG_POST_SPACING]
    })
  }
}
