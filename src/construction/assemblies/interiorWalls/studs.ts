import type { MonolithicStudWallConfig, PlankedStudWallConfig } from '@/construction/assemblies/interiorWalls/types'
import { WallConstructionArea } from '@/construction/assemblies/utils/WallConstructionArea'
import type { GroupOrElement } from '@/construction/model/elements'
import {
  type ConstructionResult,
  yieldAndCollectElements,
  yieldElement,
  yieldError
} from '@/construction/model/results'
import {
  TAG_INFILL,
  TAG_NOGGIN_SPACING,
  TAG_STUD_SPACING,
  TAG_WALL_NOGGIN,
  TAG_WALL_STUD
} from '@/construction/model/tags'
import type { Length } from '@/shared/geometry'

type StudLayoutConfig = PlankedStudWallConfig | MonolithicStudWallConfig

export function* constructStudWallSegment(
  area: WallConstructionArea,
  config: StudLayoutConfig,
  startsWithStud: boolean,
  endsWithStud: boolean
): Generator<ConstructionResult> {
  const { studWidth, maxStudSpacing } = config

  if (startsWithStud) {
    let firstStud
    ;[firstStud, area] = area.splitInX(studWidth)

    const studElements: GroupOrElement[] = []
    yield* yieldAndCollectElements(constructStud(firstStud, config), studElements)
    if (firstStud.size[0] < studWidth && !firstStud.isEmpty) {
      yield yieldError($ => $.construction.infill.notEnoughSpaceForPost, undefined, studElements)
    }
  }

  if (endsWithStud) {
    let lastStud
    ;[area, lastStud] = area.splitInX(area.size[0] - studWidth)

    const studElements: GroupOrElement[] = []
    yield* yieldAndCollectElements(constructStud(lastStud, config), studElements)
    if (lastStud.size[0] < studWidth && !lastStud.isEmpty) {
      yield yieldError($ => $.construction.infill.notEnoughSpaceForPost, undefined, studElements)
    }
  }

  if (area.size[0] <= maxStudSpacing) {
    yield* constructStudInfill(area, config, false)
    return
  }

  if (config.equidistantStuds) {
    const span = area.size[0] - config.desiredStudSpacing
    const studCount = calculateIntervalCount(
      span,
      config.minStudSpacing,
      config.desiredStudSpacing,
      config.maxStudSpacing
    )
    const totalInfillWidth = area.size[0] - studCount * config.studWidth
    const infillWidth = Math.floor(totalInfillWidth / (studCount + 1))
    for (let i = 0; i < studCount; i++) {
      let stud, infill
      ;[infill, area] = area.splitInX(infillWidth)
      yield* constructStudInfill(infill, config, i % 2 === 1)
      ;[stud, area] = area.splitInX(config.studWidth)
      yield* constructStud(stud, config)
    }
    yield* constructStudInfill(area, config, studCount % 2 === 1)
  } else {
    const fullInfillAndStud = config.desiredStudSpacing + config.studWidth
    let stagger = false
    while (area.size[0] > config.maxStudSpacing) {
      let infillWidth = config.desiredStudSpacing

      // Not enough space for full infill + stud + minimal infill, but more than a single full bale + post
      // -> Shorten the first infill so that a stud and a minimal infill fit after
      if (area.size[0] < fullInfillAndStud + config.minStudSpacing && area.size[0] > fullInfillAndStud) {
        infillWidth = Math.max(area.size[0] - config.minStudSpacing - config.studWidth, 0)
      }

      // More space than a full infill, but not enough for full infill and post
      // -> Shorten bale to fit a post
      if (area.size[0] < fullInfillAndStud) {
        infillWidth = Math.max(area.size[0] - config.studWidth, 0)
      }

      let stud, infill
      ;[infill, area] = area.splitInX(infillWidth)
      yield* constructStudInfill(infill, config, stagger)
      ;[stud, area] = area.splitInX(studWidth)
      yield* constructStud(stud, config)

      stagger = !stagger
    }

    yield* constructStudInfill(area, config, stagger)
  }
}

export function* constructStudInfill(
  area: WallConstructionArea,
  config: StudLayoutConfig,
  stagger: boolean
): Generator<ConstructionResult> {
  if (area.isEmpty) return
  yield* area.yieldMeasurement('width', [TAG_STUD_SPACING])

  if (!config.nogginMaterial) {
    if (config.fillMaterial) {
      yield* yieldElement(area.extrude(config.fillMaterial, [TAG_INFILL]))
    }
    return
  }

  let infillHeight = config.nogginSpacing
  if (config.equidistantNoggins) {
    const nogginCount = Math.ceil(
      (area.size[2] - config.nogginSpacing) / (config.nogginSpacing + config.nogginThickness)
    )
    const totalInfillHeight = area.size[2] - nogginCount * config.nogginThickness
    infillHeight = Math.round(totalInfillHeight / (nogginCount + 1))
  }

  while (area.size[2] > infillHeight) {
    let noggin, infill
    const staggerOffset = stagger && config.staggerNoggins ? config.nogginThickness : 0
    ;[infill, area] = area.splitInZ(infillHeight - staggerOffset)

    if (config.fillMaterial) {
      yield* yieldElement(infill.extrude(config.fillMaterial, [TAG_INFILL]))
    }
    yield* infill.yieldMeasurement('height', [TAG_NOGGIN_SPACING])
    ;[noggin, area] = area.splitInZ(config.nogginThickness)
    yield* yieldElement(
      noggin.extrude(config.nogginMaterial, [TAG_WALL_NOGGIN], { type: 'noggin', requiresSinglePiece: true })
    )
    stagger = false
  }

  if (config.fillMaterial) {
    yield* yieldElement(area.extrude(config.fillMaterial, [TAG_INFILL]))
  }
  yield* area.yieldMeasurement('height', [TAG_NOGGIN_SPACING])
}

function constructStud(stud: WallConstructionArea, config: StudLayoutConfig): Generator<ConstructionResult> {
  return yieldElement(
    stud.extrude(config.studMaterial, [TAG_WALL_STUD], {
      type: 'stud',
      requiresSinglePiece: true
    })
  )
}

function calculateIntervalCount(span: Length, min: Length, desired: Length, max: Length) {
  const minStudCount = Math.max(1, Math.ceil(span / max))
  const maxStudCount = Math.max(minStudCount, Math.floor(span / min))
  const desiredStudCount = Math.round(span / desired)
  return Math.min(maxStudCount, Math.max(minStudCount, desiredStudCount))
}
