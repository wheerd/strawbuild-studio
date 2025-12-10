import { vec2 } from 'gl-matrix'

import type { Perimeter } from '@/building/model'
import type { StoreyId } from '@/building/model/ids'
import { clearPersistence, getModelActions } from '@/building/store'
import { getConfigActions } from '@/construction/config'
import { IfcImporter } from '@/importers/ifc/importer'
import type {
  ImportedPerimeterCandidate,
  ImportedPerimeterSegment,
  ImportedStorey,
  ParsedIfcModel
} from '@/importers/ifc/types'
import type { Polygon2D } from '@/shared/geometry'
import { ensureClipperModule } from '@/shared/geometry/clipperInstance'

export interface IfcImportResult {
  success: boolean
  error?: string
}

const DEFAULT_STOREY_HEIGHT = 2400

export async function importIfcIntoModel(input: ArrayBuffer | Uint8Array): Promise<IfcImportResult> {
  try {
    await ensureClipperModule()
    const importer = new IfcImporter()
    const buffer = normalizeArrayBuffer(input)
    const model = await importer.importFromArrayBuffer(buffer)
    applyImportedModel(model)
    return { success: true }
  } catch (error) {
    console.error('Failed to import IFC', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import IFC model'
    }
  }
}

function applyImportedModel(model: ParsedIfcModel): void {
  const actions = getModelActions()
  const configActions = getConfigActions()

  clearPersistence()
  actions.reset()

  const defaultWallAssemblyId = configActions.getDefaultWallAssemblyId()
  const defaultFloorAssemblyId = configActions.getDefaultFloorAssemblyId()

  const baseStorey = actions.getStoreysOrderedByLevel()[0]
  const importedStoreys = [...model.storeys].sort((a, b) => a.elevation - b.elevation)

  if (importedStoreys.length === 0) {
    // Ensure the default storey has a sensible name after reset
    actions.updateStoreyName(baseStorey.id, 'Ground Floor')
    actions.updateStoreyFloorAssembly(baseStorey.id, defaultFloorAssemblyId)
    return
  }

  let previousHeight = baseStorey.floorHeight ?? DEFAULT_STOREY_HEIGHT

  const storeyIdMap = new Map<ImportedStorey, StoreyId>()

  importedStoreys.forEach((importedStorey, index) => {
    const storeyName = importedStorey.name?.trim() || `Storey ${index + 1}`
    const resolvedHeight = resolveStoreyFloorHeight(importedStorey, importedStoreys[index + 1], previousHeight)
    previousHeight = resolvedHeight

    let targetStoreyId: StoreyId

    if (index === 0 && baseStorey) {
      targetStoreyId = baseStorey.id
      actions.updateStoreyName(targetStoreyId, storeyName)
      actions.updateStoreyFloorHeight(targetStoreyId, resolvedHeight)
      actions.updateStoreyFloorAssembly(targetStoreyId, defaultFloorAssemblyId)
    } else {
      const newStorey = actions.addStorey(storeyName, resolvedHeight, defaultFloorAssemblyId)
      targetStoreyId = newStorey.id
    }

    storeyIdMap.set(importedStorey, targetStoreyId)

    const perimeterCandidates = selectPerimeterCandidates(importedStorey)
    if (perimeterCandidates.length === 0) {
      return
    }

    const wallThickness = estimateWallThickness(importedStorey)

    for (const candidate of perimeterCandidates) {
      if (candidate.boundary.outer.points.length < 3) {
        continue
      }

      const perimeterPolygon = clonePolygon(candidate.boundary.outer)
      const defaultThicknessFromSegments = averageSegmentThickness(candidate.segments) ?? wallThickness ?? undefined

      let perimeter: Perimeter
      try {
        perimeter = actions.addPerimeter(
          targetStoreyId,
          perimeterPolygon,
          defaultWallAssemblyId,
          defaultThicknessFromSegments,
          undefined,
          undefined,
          'inside'
        )
      } catch (e) {
        console.error(e)
        continue
      }

      candidate.segments.forEach((segment, index) => {
        const wall = perimeter.walls[index]
        if (!wall) return

        if (segment.thickness && Number.isFinite(segment.thickness)) {
          actions.updatePerimeterWallThickness(perimeter.id, wall.id, segment.thickness)
        }

        for (const opening of segment.openings) {
          const width = Math.max(0, opening.width)
          if (width <= 1) continue

          const offset = Math.max(0, opening.offset)

          try {
            actions.addPerimeterWallOpening(perimeter.id, wall.id, {
              type: opening.type === 'void' ? 'passage' : opening.type,
              centerOffsetFromWallStart: offset,
              width,
              height: opening.height,
              sillHeight: opening.sill ? Math.max(opening.sill, 0) : undefined
            })
          } catch (e) {
            console.error(e)
          }
        }
      })

      const floorAreaPolygon = clonePolygon(candidate.boundary.outer)
      try {
        actions.addFloorArea(targetStoreyId, floorAreaPolygon)
      } catch (e) {
        console.error(e)
      }

      for (const hole of candidate.boundary.holes) {
        if (hole.points.length >= 3) {
          try {
            actions.addFloorOpening(targetStoreyId, clonePolygon(hole))
          } catch (e) {
            console.error(e)
          }
        }
      }
    }
  })

  const firstStorey = importedStoreys[0]
  const firstStoreyId = firstStorey ? storeyIdMap.get(firstStorey) : undefined
  if (firstStoreyId) {
    actions.setActiveStoreyId(firstStoreyId)
  }
}

function averageSegmentThickness(segments: ImportedPerimeterSegment[]): number | null {
  const values = segments
    .map(segment => segment.thickness)
    .filter((value): value is number => value != null && Number.isFinite(value) && value > 0)
  return average(values)
}

function normalizeArrayBuffer(input: ArrayBuffer | Uint8Array): ArrayBuffer {
  if (input instanceof ArrayBuffer) {
    return input.slice(0)
  }

  const copy = new Uint8Array(input.length)
  copy.set(input)
  return copy.buffer
}

function resolveStoreyFloorHeight(current: ImportedStorey, next: ImportedStorey | undefined, fallback: number): number {
  if (current.height != null && current.height > 0) {
    return current.height
  }

  if (next) {
    const diff = next.elevation - current.elevation
    if (diff > 0) {
      return diff
    }
  }

  return fallback > 0 ? fallback : DEFAULT_STOREY_HEIGHT
}

function selectPerimeterCandidates(storey: ImportedStorey): ImportedPerimeterCandidate[] {
  const slabPerimeters = storey.perimeterCandidates.filter(candidate => candidate.source === 'slab')
  if (slabPerimeters.length > 0) {
    return slabPerimeters
  }
  return storey.perimeterCandidates
}

function estimateWallThickness(storey: ImportedStorey): number | null {
  const thicknessValues = storey.walls
    .map(wall => wall.thickness)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0)

  if (thicknessValues.length === 0) {
    return null
  }

  const sum = thicknessValues.reduce((acc, value) => acc + value, 0)
  return sum / thicknessValues.length
}

function clonePolygon(polygon: Polygon2D): Polygon2D {
  return {
    points: polygon.points.map(point => vec2.clone(point))
  }
}

function average(numbers: number[]): number | null {
  if (numbers.length === 0) return null
  const sum = numbers.reduce((acc, value) => acc + value, 0)
  return sum / numbers.length
}
