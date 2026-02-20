import { type StateCreator } from 'zustand'

import { type LayerSetId, createLayerSetId } from '@/building/model/ids'
import {
  appendLayer,
  moveLayer,
  removeLayerAt,
  sanitizeLayerArray,
  sumLayerThickness,
  updateLayerAt
} from '@/construction/config/store/layerUtils'
import {
  type TimestampsState,
  removeTimestampDraft,
  updateTimestampDraft
} from '@/construction/config/store/slices/timestampsSlice'
import type { LayerConfig, LayerSetConfig, LayerSetUse } from '@/construction/layers/types'

import { DEFAULT_LAYER_SETS } from './layers.defaults'

export interface LayerSetsState {
  layerSetConfigs: Record<LayerSetId, LayerSetConfig>
}

export interface LayerSetsActions {
  addLayerSet: (name: string, layers: LayerConfig[], use: LayerSetUse) => LayerSetConfig
  duplicateLayerSet: (id: LayerSetId, name: string) => LayerSetConfig
  removeLayerSet: (id: LayerSetId) => void
  updateLayerSetName: (id: LayerSetId, name: string) => void
  updateLayerSetUse: (id: LayerSetId, use: LayerSetUse) => void
  setLayerSetLayers: (id: LayerSetId, layers: LayerConfig[]) => void
  addLayerToSet: (id: LayerSetId, layer: LayerConfig) => void
  updateLayerInSet: (id: LayerSetId, index: number, updates: Partial<Omit<LayerConfig, 'type'>>) => void
  removeLayerFromSet: (id: LayerSetId, index: number) => void
  moveLayerInSet: (id: LayerSetId, fromIndex: number, toIndex: number) => void

  getLayerSetById: (id: LayerSetId) => LayerSetConfig | null
  getAllLayerSets: () => LayerSetConfig[]
  getLayerSetsByUse: (use: LayerSetUse) => LayerSetConfig[]

  resetLayerSetsToDefaults: () => void
}

export type LayerSetsSlice = LayerSetsState & { actions: LayerSetsActions }

const validateLayerSetName = (name: string): void => {
  if (name.trim().length === 0) {
    throw new Error('Layer set name cannot be empty')
  }
}

export const createLayerSetsSlice: StateCreator<
  LayerSetsSlice & TimestampsState,
  [['zustand/immer', never]],
  [],
  LayerSetsSlice
> = (set, get) => {
  return {
    layerSetConfigs: Object.fromEntries(DEFAULT_LAYER_SETS.map(layerSet => [layerSet.id, layerSet])),

    actions: {
      addLayerSet: (name: string, layers: LayerConfig[], use: LayerSetUse) => {
        validateLayerSetName(name)

        const sanitizedLayers = sanitizeLayerArray(layers)
        const id = createLayerSetId()
        const layerSet: LayerSetConfig = {
          id,
          name: name.trim(),
          layers: sanitizedLayers,
          totalThickness: sumLayerThickness(sanitizedLayers),
          use
        }

        set(state => {
          state.layerSetConfigs[id] = layerSet
          updateTimestampDraft(state, id)
        })

        return layerSet
      },

      duplicateLayerSet: (id: LayerSetId, name: string) => {
        const state = get()
        if (!(id in state.layerSetConfigs)) {
          throw new Error(`Layer set with id ${id} not found`)
        }
        const original = state.layerSetConfigs[id]

        validateLayerSetName(name)

        const newId = createLayerSetId()
        const duplicated: LayerSetConfig = {
          ...original,
          id: newId,
          name: name.trim(),
          nameKey: undefined,
          layers: original.layers.map(layer => ({ ...layer }))
        }

        set(state => {
          state.layerSetConfigs[newId] = duplicated
          updateTimestampDraft(state, newId)
        })

        return duplicated
      },

      removeLayerSet: (id: LayerSetId) => {
        set(state => {
          const defaultIds = DEFAULT_LAYER_SETS.map(ls => ls.id)
          if (defaultIds.includes(id)) {
            return
          }

          const { [id]: _removed, ...remaining } = state.layerSetConfigs
          state.layerSetConfigs = remaining
          removeTimestampDraft(state, id)
        })
      },

      updateLayerSetName: (id: LayerSetId, name: string) => {
        set(state => {
          if (!(id in state.layerSetConfigs)) return
          const layerSet = state.layerSetConfigs[id]

          validateLayerSetName(name)

          layerSet.name = name.trim()
          layerSet.nameKey = undefined
          updateTimestampDraft(state, id)
        })
      },

      updateLayerSetUse: (id: LayerSetId, use: LayerSetUse) => {
        set(state => {
          if (!(id in state.layerSetConfigs)) return
          const layerSet = state.layerSetConfigs[id]

          layerSet.use = use
          updateTimestampDraft(state, id)
        })
      },

      setLayerSetLayers: (id: LayerSetId, layers: LayerConfig[]) => {
        set(state => {
          if (!(id in state.layerSetConfigs)) return
          const layerSet = state.layerSetConfigs[id]

          const sanitizedLayers = sanitizeLayerArray(layers)
          layerSet.layers = sanitizedLayers
          layerSet.totalThickness = sumLayerThickness(sanitizedLayers)
          updateTimestampDraft(state, id)
        })
      },

      addLayerToSet: (id: LayerSetId, layer: LayerConfig) => {
        set(state => {
          if (!(id in state.layerSetConfigs)) return
          const layerSet = state.layerSetConfigs[id]

          const newLayers = appendLayer(layerSet.layers, layer)
          layerSet.layers = newLayers
          layerSet.totalThickness = sumLayerThickness(newLayers)
          updateTimestampDraft(state, id)
        })
      },

      updateLayerInSet: (id: LayerSetId, index: number, updates: Partial<Omit<LayerConfig, 'type'>>) => {
        set(state => {
          if (!(id in state.layerSetConfigs)) return
          const layerSet = state.layerSetConfigs[id]

          const newLayers = updateLayerAt(layerSet.layers, index, updates)
          layerSet.layers = newLayers
          layerSet.totalThickness = sumLayerThickness(newLayers)
          updateTimestampDraft(state, id)
        })
      },

      removeLayerFromSet: (id: LayerSetId, index: number) => {
        set(state => {
          if (!(id in state.layerSetConfigs)) return
          const layerSet = state.layerSetConfigs[id]

          const newLayers = removeLayerAt(layerSet.layers, index)
          layerSet.layers = newLayers
          layerSet.totalThickness = sumLayerThickness(newLayers)
          updateTimestampDraft(state, id)
        })
      },

      moveLayerInSet: (id: LayerSetId, fromIndex: number, toIndex: number) => {
        set(state => {
          if (!(id in state.layerSetConfigs)) return
          const layerSet = state.layerSetConfigs[id]

          const newLayers = moveLayer(layerSet.layers, fromIndex, toIndex)
          layerSet.layers = newLayers
          layerSet.totalThickness = sumLayerThickness(newLayers)
          updateTimestampDraft(state, id)
        })
      },

      getLayerSetById: (id: LayerSetId) => {
        const state = get()
        return state.layerSetConfigs[id] ?? null
      },

      getAllLayerSets: () => {
        const state = get()
        return Object.values(state.layerSetConfigs)
      },

      getLayerSetsByUse: (use: LayerSetUse) => {
        const state = get()
        return Object.values(state.layerSetConfigs).filter(ls => ls.use === use)
      },

      resetLayerSetsToDefaults: () => {
        set(state => {
          const defaultIds = DEFAULT_LAYER_SETS.map(ls => ls.id)
          const currentIds = Object.keys(state.layerSetConfigs) as LayerSetId[]

          const customLayerSets = Object.fromEntries(
            Object.entries(state.layerSetConfigs).filter(([id]) => !defaultIds.includes(id as LayerSetId))
          )

          const resetLayerSets = Object.fromEntries(DEFAULT_LAYER_SETS.map(ls => [ls.id, ls]))

          for (const id of currentIds) {
            if (!defaultIds.includes(id) && id in customLayerSets) {
              continue
            }
            if (defaultIds.includes(id) && !(id in customLayerSets)) {
              removeTimestampDraft(state, id)
            }
          }

          for (const layerSet of DEFAULT_LAYER_SETS) {
            if (!currentIds.includes(layerSet.id)) {
              updateTimestampDraft(state, layerSet.id)
            }
          }

          state.layerSetConfigs = { ...resetLayerSets, ...customLayerSets }
        })
      }
    } satisfies LayerSetsActions
  }
}
