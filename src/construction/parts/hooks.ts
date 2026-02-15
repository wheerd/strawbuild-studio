import { rollup } from 'd3-array'
import { useEffect, useMemo } from 'react'

import type { PerimeterId, PerimeterWallId, RoofId, StoreyId } from '@/building/model/ids'
import { isPerimeterId, isPerimeterWallId, isRoofId, isStoreyId } from '@/building/model/ids'

import { ensurePartsLoaded, getLabelGroupId, usePartsStore } from './store'
import type { AggregatedPartItem, PartDefinition, PartId, PartOccurrence, PartsFilter, PartsStoreState } from './types'

export type ConstructionModelId = PerimeterId | PerimeterWallId | RoofId | StoreyId | undefined

function deriveLocationFilter(modelId: ConstructionModelId): PartsFilter {
  if (!modelId) return {}
  if (isStoreyId(modelId)) return { storeyId: modelId }
  if (isRoofId(modelId)) return { roofId: modelId }
  if (isPerimeterId(modelId)) return { perimeterId: modelId }
  if (isPerimeterWallId(modelId)) return { wallId: modelId }
  return {}
}

function filterOccurrences(occurrences: PartOccurrence[], filter: PartsFilter): PartOccurrence[] {
  return occurrences.filter(occ => {
    if (filter.storeyId != null && occ.storeyId !== filter.storeyId) return false
    if (filter.perimeterId != null && occ.perimeterId !== filter.perimeterId) return false
    if (filter.wallId != null && occ.wallId !== filter.wallId) return false
    if (filter.roofId != null && occ.roofId !== filter.roofId) return false
    if (filter.virtual != null && occ.virtual !== filter.virtual) return false
    return true
  })
}

export function useAggregatedParts(modelId?: ConstructionModelId, filter?: PartsFilter): AggregatedPartItem[] {
  useEnsurePartsLoaded()

  const definitions = usePartsStore(s => s.definitions)
  const occurrences = usePartsStore(s => s.occurrences)
  const labels = usePartsStore(s => s.labels)

  const locationFilter = deriveLocationFilter(modelId)
  const combinedFilter: PartsFilter = { ...locationFilter, ...filter }

  return useMemo(
    () => aggregateParts(occurrences, combinedFilter, definitions, labels),
    [
      occurrences,
      definitions,
      labels,
      combinedFilter.storeyId,
      combinedFilter.perimeterId,
      combinedFilter.wallId,
      combinedFilter.roofId,
      combinedFilter.virtual
    ]
  )
}

export function aggregateParts(
  occurrences: PartOccurrence[],
  combinedFilter: PartsFilter,
  definitions: Record<PartId, PartDefinition>,
  labels: PartsStoreState['labels']
) {
  const filtered = filterOccurrences(occurrences, combinedFilter)

  const aggregated = rollup(
    filtered,
    v => ({
      quantity: v.length,
      elementIds: v.map(occ => occ.elementId)
    }),
    occ => occ.partId
  )

  const result: AggregatedPartItem[] = []
  for (const [partId, agg] of aggregated) {
    const definition = definitions[partId]
    const label = labels[partId] ?? ''
    const totalVolume = agg.quantity * definition.volume
    const totalArea = definition.area != null ? agg.quantity * definition.area : undefined
    const totalLength = definition.length != null ? agg.quantity * definition.length : undefined

    result.push({
      ...definition,
      label,
      quantity: agg.quantity,
      elementIds: agg.elementIds,
      totalVolume,
      totalArea,
      totalLength
    })
  }

  return result
}

export function useMaterialParts(modelId?: ConstructionModelId): AggregatedPartItem[] {
  return useAggregatedParts(modelId, { virtual: false })
}

export function useVirtualParts(modelId?: ConstructionModelId): AggregatedPartItem[] {
  return useAggregatedParts(modelId, { virtual: true })
}

export function useEnsurePartsLoaded(): void {
  const notInitialized = usePartsStore(state => !state.hasParts && !state.rebuilding)
  useEffect(() => {
    if (notInitialized) ensurePartsLoaded()
  }, [notInitialized])
}

export function usePartActions() {
  return usePartsStore(store => store.actions)
}

export function useHasUnusedLabels(groupId?: string): boolean {
  const usedLabelsByGroup = usePartsStore(s => s.usedLabelsByGroup)
  const nextLabelIndexByGroup = usePartsStore(s => s.nextLabelIndexByGroup)
  const definitions = usePartsStore(s => s.definitions)

  return useMemo(() => {
    if (groupId) {
      const usedCount = usedLabelsByGroup[groupId]?.length ?? 0
      const nextIndex = nextLabelIndexByGroup[groupId] ?? 0
      return nextIndex > usedCount
    }

    const groups = new Set(Object.values(definitions).map(getLabelGroupId))
    for (const gid of groups) {
      const usedCount = usedLabelsByGroup[gid]?.length ?? 0
      const nextIndex = nextLabelIndexByGroup[gid] ?? 0
      if (nextIndex > usedCount) return true
    }
    return false
  }, [groupId, usedLabelsByGroup, nextLabelIndexByGroup, definitions])
}
