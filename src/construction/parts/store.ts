import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import {
  ensureConstructionLoaded,
  getConstructionModel,
  subscribeToConstructionModelChanges
} from '@/construction/store'

import { generatePartsData } from './generation'
import { indexToLabel } from './shared'
import type { LocationFilter, PartDefinition, PartId, PartsStore, PartsStoreState } from './types'

export const getLabelGroupId = (definition: Pick<PartDefinition, 'source' | 'materialId'>): string =>
  definition.source === 'group' ? 'virtual' : `material:${definition.materialId}`

export const PARTS_STORE_VERSION = 1

export const usePartsStore = create<PartsStore>()(
  persist(
    (set, get) => ({
      definitions: {},
      occurrences: [],
      labels: {},
      usedLabelsByGroup: {},
      nextLabelIndexByGroup: {},
      hasParts: false,
      rebuilding: false,
      generatedAt: 0,

      actions: {
        rebuildParts(): void {
          set(state => ({ ...state, hasParts: false, rebuilding: true }))

          ensureConstructionLoaded()
          const model = getConstructionModel()
          const { definitions, occurrences } = generatePartsData(model)

          set(state => {
            const { labels, usedLabelsByGroup, nextLabelIndexByGroup } = assignLabelsForNewParts(definitions, state)
            return {
              ...state,
              definitions,
              occurrences,
              labels,
              usedLabelsByGroup,
              nextLabelIndexByGroup,
              hasParts: true,
              rebuilding: false,
              generatedAt: Date.now()
            }
          })
        },

        resetLabels(groupId?: string): void {
          set(state => {
            const { labels, usedLabelsByGroup, nextLabelIndexByGroup } = regenerateLabels(groupId, state)
            return {
              ...state,
              labels,
              usedLabelsByGroup,
              nextLabelIndexByGroup
            }
          })
        },

        getFilteredOccurrences(filter: LocationFilter) {
          const { occurrences } = get()
          return occurrences.filter(occ => {
            if (filter.storeyId && occ.storeyId !== filter.storeyId) return false
            if (filter.perimeterId && occ.perimeterId !== filter.perimeterId) return false
            if (filter.wallId && occ.wallId !== filter.wallId) return false
            if (filter.roofId && occ.roofId !== filter.roofId) return false
            return true
          })
        }
      }
    }),
    {
      name: 'strawbaler-parts',
      partialize: state => ({
        labels: state.labels,
        nextLabelIndexByGroup: state.nextLabelIndexByGroup
      }),
      version: PARTS_STORE_VERSION
    }
  )
)

export type LabelState = Pick<PartsStoreState, 'labels' | 'usedLabelsByGroup' | 'nextLabelIndexByGroup'>

export type PartializedPartsState = Pick<PartsStoreState, 'labels' | 'nextLabelIndexByGroup'>

export function exportPartsState(): PartializedPartsState {
  const state = usePartsStore.getState()
  return {
    labels: state.labels,
    nextLabelIndexByGroup: state.nextLabelIndexByGroup
  }
}

export function hydratePartsState(state: PartializedPartsState, _version: number): void {
  usePartsStore.setState(state, false)
}

export function regenerateLabels(groupId: string | undefined, state: PartsStoreState): LabelState {
  const newLabels: Partial<Record<PartId, string>> = {}
  const newUsedLabelsByGroup: Partial<Record<string, string[]>> = {}
  const newNextLabelIndexByGroup: Partial<Record<string, number>> = {}

  if (groupId) {
    for (const [gId, labels] of Object.entries(state.usedLabelsByGroup)) {
      if (gId !== groupId) {
        newUsedLabelsByGroup[gId] = labels
        newNextLabelIndexByGroup[gId] = state.nextLabelIndexByGroup[gId] ?? 0
      }
    }
    for (const [partId, label] of Object.entries(state.labels)) {
      const typedPartId = partId as PartId
      if (typedPartId in state.definitions) {
        const definition = state.definitions[typedPartId]
        const newGroupId = getLabelGroupId(definition)
        if (newGroupId !== groupId) {
          newLabels[typedPartId] = label
        }
      }
    }
  }

  for (const [partId, definition] of Object.entries(state.definitions)) {
    const gid = getLabelGroupId(definition)
    if (groupId && gid !== groupId) continue

    const typedPartId = partId as PartId
    const nextIndex = newNextLabelIndexByGroup[gid] ?? 0
    const label = indexToLabel(nextIndex)

    newLabels[typedPartId] = label
    newNextLabelIndexByGroup[gid] = nextIndex + 1

    newUsedLabelsByGroup[gid] ??= []
    newUsedLabelsByGroup[gid].push(label)
  }

  return {
    labels: newLabels,
    usedLabelsByGroup: newUsedLabelsByGroup,
    nextLabelIndexByGroup: newNextLabelIndexByGroup
  }
}

export function assignLabelsForNewParts(definitions: Record<PartId, PartDefinition>, current: LabelState): LabelState {
  const newLabels = { ...current.labels }
  const newNextLabelIndexByGroup = { ...current.nextLabelIndexByGroup }

  for (const partId of Object.keys(definitions) as PartId[]) {
    if (!(partId in newLabels)) {
      const definition = definitions[partId]
      const groupId = getLabelGroupId(definition)
      const nextIndex = newNextLabelIndexByGroup[groupId] ?? 0
      const label = indexToLabel(nextIndex)

      newLabels[partId] = label
      newNextLabelIndexByGroup[groupId] = nextIndex + 1
    }
  }

  const newUsedLabelsByGroup: Record<string, string[]> = {}
  for (const [partId, label] of Object.entries(newLabels)) {
    const typedPartId = partId as PartId
    if (typedPartId in definitions) {
      const definition = definitions[typedPartId]
      const groupId = getLabelGroupId(definition)
      newUsedLabelsByGroup[groupId] ??= []
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      newUsedLabelsByGroup[groupId].push(label!)
    }
  }

  return {
    labels: newLabels,
    usedLabelsByGroup: newUsedLabelsByGroup,
    nextLabelIndexByGroup: newNextLabelIndexByGroup
  }
}

export function getPartsActions() {
  return usePartsStore.getState().actions
}

let subscribed = false
export function setupPartsSubscriptions() {
  if (subscribed) return
  subscribed = true

  subscribeToConstructionModelChanges(() => {
    usePartsStore.getState().actions.rebuildParts()
  })
}

export function ensurePartsLoaded() {
  const state = usePartsStore.getState()
  if (!state.hasParts) {
    state.actions.rebuildParts()
  }
  setupPartsSubscriptions()
}

export function clearPartsLabelPersistence(): void {
  localStorage.removeItem('strawbaler-parts-labels')
}
