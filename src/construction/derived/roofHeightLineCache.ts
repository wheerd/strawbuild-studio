import type { StoreyId } from '@/building/model/ids'
import { getModelActions, subscribeToRoofs } from '@/building/store'
import { getConfigActions } from '@/construction/config'
import {
  getPerimeterContextsByStorey,
  subscribeToPerimeterContextInvalidations
} from '@/construction/derived/perimeterContextCache'
import { resolveRoofAssembly } from '@/construction/roofs'
import type { HeightItem, HeightJumpItem, HeightLine } from '@/construction/roofs/types'
import { getWallStoreyContextCached, subscribeToWallStoreyContextInvalidations } from '@/construction/storeys/context'
import { VerticalOffsetMap } from '@/construction/storeys/offsets'
import { type Length, type LineSegment2D, subtractPolygons } from '@/shared/geometry'

export class RoofHeightLineCacheService {
  private readonly entries: Map<StoreyId, VerticalOffsetMap>

  constructor() {
    this.entries = new Map()
    this.setupSubscriptions()
  }

  getOffsets(storeyId: StoreyId, lines: LineSegment2D[]): HeightLine {
    const map = this.getOrCreateMap(storeyId)
    const rawOffsets = lines.map(l => map.getOffsets(l))
    console.log('raw', rawOffsets)
    return this.mergeHeightLines(...rawOffsets)
  }

  private getOrCreateMap(storeyId: StoreyId): VerticalOffsetMap {
    const cached = this.entries.get(storeyId)
    if (cached) return cached

    const map = this.buildMap(storeyId)
    this.entries.set(storeyId, map)
    return map
  }

  private buildMap(storeyId: StoreyId): VerticalOffsetMap {
    const { getRoofsByStorey } = getModelActions()
    const { getRoofAssemblyById } = getConfigActions()

    const map = new VerticalOffsetMap(0, true)
    const roofs = getRoofsByStorey(storeyId)
    const perimeterContexts = getPerimeterContextsByStorey(storeyId)
    const storeyContext = getWallStoreyContextCached(storeyId)

    const roofPolygons = roofs.map(r => r.overhangPolygon)
    const innerFloorPolygons = subtractPolygons(
      perimeterContexts.map(c => c.innerPolygon),
      roofPolygons
    ).map(p => p.outer)
    for (const polygon of innerFloorPolygons) {
      map.addConstantArea(polygon, storeyContext.wallTop - storeyContext.ceilingConstructionBottom)
    }

    const outerFloorPolygons = subtractPolygons(
      perimeterContexts.map(c => c.outerFinishedPolygon),
      roofPolygons
    ).map(p => p.outer)
    for (const polygon of outerFloorPolygons) {
      map.addConstantArea(polygon, 0)
    }

    for (const roof of roofs) {
      const roofAssembly = getRoofAssemblyById(roof.assemblyId)
      if (!roofAssembly) continue

      const roofImpl = resolveRoofAssembly(roofAssembly)
      roofImpl.getBottomOffsets(roof, map, perimeterContexts)
    }

    return map
  }

  private invalidateStorey(storeyId: StoreyId): void {
    this.entries.delete(storeyId)
  }

  private setupSubscriptions(): void {
    const { getPerimeterById } = getModelActions()

    subscribeToRoofs((current, previous) => {
      const storeyId = current?.storeyId ?? previous?.storeyId
      if (storeyId) this.invalidateStorey(storeyId)
    })

    subscribeToWallStoreyContextInvalidations(storeyId => {
      this.invalidateStorey(storeyId)
    })

    subscribeToPerimeterContextInvalidations(perimeterId => {
      try {
        const perimeter = getPerimeterById(perimeterId)
        this.invalidateStorey(perimeter.storeyId)
      } catch {
        this.entries.clear()
      }
    })
  }

  private mergeHeightLines(...lines: HeightLine[]): HeightLine {
    if (lines.length === 0 || lines.every(l => l.length === 0)) {
      return []
    }
    const allPositions = lines.flatMap(l => l.map(x => x.position))
    const uniquePositions = new Set(allPositions)
    const sortedPositions = Array.from(uniquePositions).sort((a, b) => a - b)

    const merged: HeightLine = []
    for (const pos of sortedPositions) {
      const offsets = lines.map(l => this.getOffsetAt(l, pos))
      const beforeOffsets = offsets.map(o => o[0])
      const afterOffsets = offsets.map(o => o[1])

      const beforeOffset = Math.min(...beforeOffsets)
      const afterOffset = Math.min(...afterOffsets)

      if (beforeOffset !== afterOffset) {
        merged.push({
          position: pos,
          offsetBefore: beforeOffset,
          offsetAfter: afterOffset
        } as HeightJumpItem)
      } else {
        merged.push({
          position: pos,
          offset: beforeOffset,
          nullAfter: false
        })
      }
    }

    return merged
  }

  private getOffsetAt(heightLine: HeightLine, position: number): [Length, Length] {
    const POSITION_EPSILON = 0.0001
    position = Math.max(0, Math.min(1, position))

    let before: HeightItem | HeightJumpItem | null = null
    let after: HeightItem | HeightJumpItem | null = null

    for (const item of heightLine) {
      if (item.position <= position) {
        before = item
      }
      if (item.position >= position) {
        after = item
        break
      }
    }

    if (!before || !after) {
      throw new Error('inconsistent height line (not filled?)')
    }

    if (Math.abs(before.position - position) < POSITION_EPSILON) {
      return this.isHeightItem(before) ? [before.offset, before.offset] : [before.offsetBefore, before.offsetAfter]
    }
    if (Math.abs(after.position - position) < POSITION_EPSILON) {
      return this.isHeightItem(after) ? [after.offset, after.offset] : [after.offsetBefore, after.offsetAfter]
    }

    const beforeOffset = this.isHeightItem(before) ? before.offset : before.offsetAfter
    const afterOffset = this.isHeightItem(after) ? after.offset : after.offsetBefore

    const ratio = (position - before.position) / (after.position - before.position)
    const interpolated = beforeOffset + ratio * (afterOffset - beforeOffset)
    return [interpolated, interpolated]
  }

  private isHeightItem(item: HeightJumpItem | HeightItem): item is HeightItem {
    return 'offset' in item && 'nullAfter' in item
  }

  getDebugAllMaps(): ReadonlyMap<StoreyId, { map: VerticalOffsetMap; storeyId: StoreyId }> {
    const result = new Map<StoreyId, { map: VerticalOffsetMap; storeyId: StoreyId }>()
    for (const [storeyId, map] of this.entries) {
      result.set(storeyId, { map, storeyId })
    }
    return result
  }
}

const serviceInstance = new RoofHeightLineCacheService()

export function getRoofHeightLineCached(storeyId: StoreyId, lines: LineSegment2D[]): HeightLine {
  return serviceInstance.getOffsets(storeyId, lines)
}

export function getRoofOffsetMapsDebug(): ReadonlyMap<StoreyId, { map: VerticalOffsetMap; storeyId: StoreyId }> {
  return serviceInstance.getDebugAllMaps()
}
