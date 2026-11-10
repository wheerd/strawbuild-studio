import { WallConstructionArea } from '@/construction/assemblies/utils/WallConstructionArea'
import { type ConstructionResult, yieldElement, yieldMeasurement } from '@/construction/model/results'
import { TAG_INFILL, TAG_POST, TAG_POST_SPACING, TAG_WALL_REINFORCEMENT } from '@/construction/model/tags'
import type { MaterialId } from '@/materials/types'
import type { Length } from '@/shared/geometry'
import { newVec3 } from '@/shared/geometry'

export interface StudLayoutConfig {
  minStudSpacing: Length
  desiredStudSpacing: Length
  maxStudSpacing: Length
  studWidth: Length
  studMaterial: MaterialId
  equidistantStuds: boolean
  fillMaterial?: MaterialId
  nogginMaterial?: MaterialId
  nogginThickness: Length
  nogginSpacing: Length
  equidistantNoggins: boolean
  staggerNoggins: boolean
}

export interface NogginBand {
  start: Length
  thickness: Length
}

export function getStudPositions(
  width: Length,
  studWidth: Length,
  desiredSpacing: Length,
  minSpacing: Length,
  maxSpacing: Length,
  startsWithStand: boolean,
  endsWithStand: boolean,
  equidistant: boolean
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
  if (equidistant) {
    return Array.from({ length: intervals + 1 }, (_, index) => firstStart + (span * index) / intervals)
  }

  const positions = [firstStart]
  while (positions[positions.length - 1] + desiredSpacing < finalStart) {
    positions.push(positions[positions.length - 1] + desiredSpacing)
  }
  if (endsWithStand && positions[positions.length - 1] !== finalStart) positions.push(finalStart)
  return positions
}

export function getNogginBands(
  height: Length,
  thickness: Length,
  spacing: Length,
  equidistant: boolean,
  stagger: boolean,
  columnIndex: number
): NogginBand[] {
  if (height <= thickness || thickness <= 0 || spacing <= 0) return []

  let starts: Length[]
  if (equidistant) {
    const count = Math.max(0, Math.ceil(height / spacing) - 1)
    const clearGap = (height - count * thickness) / (count + 1)
    starts = Array.from({ length: count }, (_, index) => clearGap + index * (clearGap + thickness))
  } else {
    starts = []
    for (let start = spacing; start + thickness <= height; start += spacing) starts.push(start)
  }

  const offset = stagger && columnIndex % 2 === 1 ? thickness : 0
  return starts
    .map(start => ({ start: start + offset, thickness }))
    .filter(band => band.start >= 0 && band.start + band.thickness <= height)
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
    endsWithStand,
    config.equidistantStuds
  )

  const studAreas = positions.map(position => area.withXAdjustment(position, config.studWidth))
  for (const studArea of studAreas) {
    const element = studArea.extrude(config.studMaterial, [TAG_POST], {
      type: 'post',
      requiresSinglePiece: true
    })
    if (element) yield* yieldElement(element)
  }

  for (let index = 0; index <= positions.length; index++) {
    const next = positions[index]
    const gapStart = index === 0 ? 0 : positions[index - 1] + config.studWidth
    const gapEnd = index < positions.length ? next : area.size[0]
    const gapWidth = gapEnd - gapStart
    if (gapWidth <= 0) continue

    const gapArea = area.withXAdjustment(gapStart, gapWidth)
    const bands =
      index > 0 && index < positions.length && config.nogginMaterial
        ? getNogginBands(
            gapArea.minTopHeight,
            config.nogginThickness,
            config.nogginSpacing,
            config.equidistantNoggins,
            config.staggerNoggins,
            index - 1
          )
        : []

    if (config.fillMaterial) {
      let fillStart = 0
      for (const band of bands) {
        if (band.start > fillStart) {
          const fill = gapArea
            .withZAdjustment(fillStart, band.start - fillStart)
            .extrude(config.fillMaterial, [TAG_INFILL])
          if (fill) yield* yieldElement(fill)
        }
        fillStart = band.start + band.thickness
      }
      if (fillStart < gapArea.minTopHeight) {
        const fill = gapArea.withZAdjustment(fillStart).extrude(config.fillMaterial, [TAG_INFILL])
        if (fill) yield* yieldElement(fill)
      }
    }

    if (config.nogginMaterial) {
      for (const band of bands) {
        const noggin = gapArea
          .withZAdjustment(band.start, band.thickness)
          .extrude(config.nogginMaterial, [TAG_WALL_REINFORCEMENT], {
            type: 'noggin',
            requiresSinglePiece: true
          })
        if (noggin) yield* yieldElement(noggin)
      }
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
