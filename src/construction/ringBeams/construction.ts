import type { PerimeterId, RingBeamAssemblyId } from '@/building/model/ids'
import { getModelActions } from '@/building/store'
import { getConfigActions } from '@/construction/config'
import { getPerimeterContextCached } from '@/construction/derived/perimeterContextCache'
import { type ConstructionModel, mergeModels, transformModel } from '@/construction/model'
import { assignDeterministicIdsToResults, resultsToModel } from '@/construction/results'
import { resolveRingBeamAssembly } from '@/construction/ringBeams'
import { getWallStoreyContextCached } from '@/construction/storeys/context'
import { TAG_BASE_PLATE, TAG_TOP_PLATE } from '@/construction/tags'
import { fromTrans, newVec3 } from '@/shared/geometry'

export function constructBasePlate(perimeterId: PerimeterId): ConstructionModel {
  const { getPerimeterById, getPerimeterWallById } = getModelActions()
  const { getRingBeamAssemblyById } = getConfigActions()

  const perimeter = getPerimeterById(perimeterId)
  const storeyContext = getWallStoreyContextCached(perimeter.storeyId)
  const perimeterContext = getPerimeterContextCached(perimeterId)

  const walls = perimeter.wallIds.map(getPerimeterWallById)

  const basePlateModels: ConstructionModel[] = []

  const baseSegments = groupConsecutiveWallsByRingBeam(walls.map(w => w.baseRingBeamAssemblyId))
  for (const segment of baseSegments) {
    const assemblyConfig = getRingBeamAssemblyById(segment.assemblyId)
    if (!assemblyConfig) continue

    const assembly = resolveRingBeamAssembly(assemblyConfig)
    const ringBeam = Array.from(
      assembly.construct({ perimeter, startIndex: segment.startIndex, endIndex: segment.endIndex }, perimeterContext)
    )
    assignDeterministicIdsToResults(ringBeam, `${perimeter.id}_baseplate_${segment.startIndex}`)
    const model = transformModel(resultsToModel(ringBeam), fromTrans(newVec3(0, 0, storeyContext.wallBottom)), [
      TAG_BASE_PLATE
    ])
    basePlateModels.push(model)
  }

  return mergeModels(...basePlateModels)
}

export function constructTopPlate(perimeterId: PerimeterId): ConstructionModel {
  const { getPerimeterById, getPerimeterWallById } = getModelActions()
  const { getRingBeamAssemblyById } = getConfigActions()

  const perimeter = getPerimeterById(perimeterId)
  const storeyContext = getWallStoreyContextCached(perimeter.storeyId)
  const perimeterContext = getPerimeterContextCached(perimeterId)

  const walls = perimeter.wallIds.map(getPerimeterWallById)

  const topPlateModels: ConstructionModel[] = []

  const topSegments = groupConsecutiveWallsByRingBeam(walls.map(w => w.topRingBeamAssemblyId))
  for (const segment of topSegments) {
    const assemblyConfig = getRingBeamAssemblyById(segment.assemblyId)
    if (!assemblyConfig) continue

    const assembly = resolveRingBeamAssembly(assemblyConfig)
    const ringBeam = Array.from(
      assembly.construct(
        { perimeter, startIndex: segment.startIndex, endIndex: segment.endIndex },
        perimeterContext,
        storeyContext
      )
    )
    assignDeterministicIdsToResults(ringBeam, `${perimeter.id}_topplate_${segment.startIndex}`)
    const model = transformModel(
      resultsToModel(ringBeam),
      fromTrans(newVec3(0, 0, storeyContext.wallTop - assembly.height)),
      [TAG_TOP_PLATE]
    )
    topPlateModels.push(model)
  }

  return mergeModels(...topPlateModels)
}

interface RingBeamSegment {
  assemblyId: RingBeamAssemblyId
  startIndex: number
  endIndex: number
}

function groupConsecutiveWallsByRingBeam(assemblies: (RingBeamAssemblyId | undefined)[]): RingBeamSegment[] {
  if (assemblies.length === 0) return []

  const segments: RingBeamSegment[] = []
  let currentAssemblyId = assemblies[0]
  let startIndex = currentAssemblyId ? 0 : -1

  for (let i = 1; i <= assemblies.length; i++) {
    const assemblyId = i < assemblies.length ? assemblies[i] : undefined

    if (assemblyId !== currentAssemblyId) {
      if (currentAssemblyId && startIndex >= 0) {
        segments.push({
          assemblyId: currentAssemblyId,
          startIndex,
          endIndex: i - 1
        })
      }
      currentAssemblyId = assemblyId
      startIndex = assemblyId ? i : -1
    }
  }

  // Handle wrap-around for circular perimeter
  if (segments.length > 1) {
    const firstSegment = segments[0]
    const lastSegment = segments[segments.length - 1]
    if (
      firstSegment.startIndex === 0 &&
      lastSegment.endIndex === assemblies.length - 1 &&
      firstSegment.assemblyId === lastSegment.assemblyId
    ) {
      // Merge first and last segment (wrap around)
      segments[0].startIndex = lastSegment.startIndex
      segments.pop()
    }
  }

  return segments
}
