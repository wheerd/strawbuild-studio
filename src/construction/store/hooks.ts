import { useEffect, useMemo } from 'react'

import type { PerimeterId, PerimeterWallId, RoofId, StoreyId } from '@/building/model/ids'
import { isPerimeterId, isPerimeterWallId, isRoofId, isStoreyId } from '@/building/model/ids'
import type { ConstructionModel } from '@/construction/model'

import { ensureConstructionLoaded, getConstructionActions, useConstructionStore } from './store'
import type { ConstructionStoreState, ModelId } from './types'
import { createColinearWallId, createFullPerimeterId } from './utils'

export type ConstructionModelId = PerimeterId | PerimeterWallId | RoofId | StoreyId | undefined

function toInternalId(
  externalId: ConstructionModelId,
  conlinearMapping: ConstructionStoreState['conlinearMapping']
): ModelId {
  if (externalId === undefined) return 'building'
  if (isStoreyId(externalId)) return externalId
  if (isRoofId(externalId)) return externalId
  if (isPerimeterId(externalId)) return createFullPerimeterId(externalId)
  if (isPerimeterWallId(externalId)) {
    return conlinearMapping[externalId] ?? createColinearWallId(externalId)
  }
  throw new Error(`Unknown external ID type: ${externalId}`)
}

export function useConstructionModel(externalId: ConstructionModelId): ConstructionModel | null {
  useEnsureConstructionLoaded()
  const generatedAt = useConstructionStore(s => s.generatedAt)
  const conlinearMapping = useConstructionStore(s => s.conlinearMapping)
  const internalId = toInternalId(externalId, conlinearMapping)
  return useMemo(() => {
    try {
      return getConstructionActions().getModel(internalId)
    } catch {
      return null
    }
  }, [generatedAt, internalId])
}

export function useHasConstructionModel(): boolean {
  useEnsureConstructionLoaded()
  return useConstructionStore(state => state.hasModel)
}

export const useConstructionActions = () => useConstructionStore(state => state.actions)

export function useIsConstructionOutdated(): boolean {
  useEnsureConstructionLoaded()
  const generatedAt = useConstructionStore(state => state.generatedAt)
  const lastSourceChange = useConstructionStore(state => state.lastSourceChange)
  return useMemo(() => getConstructionActions().isOutdated(), [generatedAt, lastSourceChange])
}

export function useEnsureConstructionLoaded(): void {
  useEffect(ensureConstructionLoaded, [])
}
