import { create } from 'zustand'

import { ensureConstructionLoaded, getConstructionModel } from '@/construction/store'
import { useConstructionStore } from '@/construction/store/store'

import { generatePartsData } from './generation'
import type { LocationFilter, PartDefinition, PartId, PartsStore, PartsStoreState } from './types'

const indexToLabel = (index: number): string => {
  const alphabetLength = 26
  let current = index
  let label = ''

  do {
    const remainder = current % alphabetLength
    label = String.fromCharCode(65 + remainder) + label
    current = Math.floor(current / alphabetLength) - 1
  } while (current >= 0)

  return label
}

const getLabelGroupId = (definition: PartDefinition): string =>
  definition.source === 'group' ? 'virtual' : `material:${definition.materialId}`

export const usePartsStore = create<PartsStore>()((set, get) => ({
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
      const currentState = get()

      const newLabels: Record<PartId, string> = { ...currentState.labels }

      for (const partId of Object.keys(definitions) as PartId[]) {
        if (!(partId in newLabels)) {
          const definition = definitions[partId]
          const groupId = getLabelGroupId(definition)
          assignLabelToDefinition(newLabels, currentState, partId, groupId)
        }
      }

      set(state => ({
        ...state,
        definitions,
        occurrences,
        labels: newLabels,
        hasParts: true,
        rebuilding: false,
        generatedAt: Date.now()
      }))
    },

    resetLabels(groupId?: string): void {
      set(state => {
        const newLabels: Record<PartId, string> = {} as Record<PartId, string>
        const newUsedLabelsByGroup: Record<string, string[]> = {}
        const newNextLabelIndexByGroup: Record<string, number> = {}

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
          ...state,
          labels: newLabels,
          usedLabelsByGroup: newUsedLabelsByGroup,
          nextLabelIndexByGroup: newNextLabelIndexByGroup
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
}))

function assignLabelToDefinition(
  newLabels: Record<PartId, string>,
  state: PartsStoreState,
  partId: PartId,
  groupId: string
): void {
  const nextIndex = state.nextLabelIndexByGroup[groupId] ?? 0
  const label = indexToLabel(nextIndex)

  newLabels[partId] = label
  state.nextLabelIndexByGroup[groupId] = nextIndex + 1

  state.usedLabelsByGroup[groupId] ??= []
  state.usedLabelsByGroup[groupId].push(label)
}

export function getPartsActions() {
  return usePartsStore.getState().actions
}

let subscribed = false
export function setupPartsSubscriptions() {
  if (subscribed) return
  subscribed = true

  let previousGeneratedAt = useConstructionStore.getState().generatedAt
  useConstructionStore.subscribe(state => {
    if (state.generatedAt !== previousGeneratedAt && state.generatedAt > 0) {
      previousGeneratedAt = state.generatedAt
      usePartsStore.getState().actions.rebuildParts()
    }
  })
}

export function ensurePartsLoaded() {
  const state = usePartsStore.getState()
  if (!state.hasParts) {
    state.actions.rebuildParts()
  }
  setupPartsSubscriptions()
}
