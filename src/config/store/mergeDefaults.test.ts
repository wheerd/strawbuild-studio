import { describe, expect, it } from 'vitest'

import { mergeStateWithDefaults } from './mergeDefaults'
import { DEFAULT_FLOOR_ASSEMBLIES } from './slices/floors.defaults'
import { DEFAULT_LAYER_SETS } from './slices/layers.defaults'
import { DEFAULT_OPENING_ASSEMBLIES } from './slices/opening.defaults'
import { DEFAULT_PERIMETER_WALL_ASSEMBLIES } from './slices/perimeterWalls.defaults'
import { DEFAULT_RING_BEAM_ASSEMBLIES } from './slices/ringBeams.defaults'
import { DEFAULT_ROOF_ASSEMBLIES } from './slices/roofs.defaults'
import type { ConfigState } from './types'

describe('mergeStateWithDefaults', () => {
  it('should restore nameKey for default layer sets that were not customized', () => {
    const defaultLayerSet = DEFAULT_LAYER_SETS[0]
    const state: Partial<ConfigState> = {
      layerSetConfigs: {
        [defaultLayerSet.id]: {
          ...defaultLayerSet,
          nameKey: undefined
        }
      }
    }

    mergeStateWithDefaults(state as ConfigState)

    expect(state.layerSetConfigs?.[defaultLayerSet.id]?.nameKey).toBe(defaultLayerSet.nameKey)
  })

  it('should preserve customized layer sets (different name)', () => {
    const defaultLayerSet = DEFAULT_LAYER_SETS[0]
    const customName = 'My Custom Name'
    const state: Partial<ConfigState> = {
      layerSetConfigs: {
        [defaultLayerSet.id]: {
          ...defaultLayerSet,
          name: customName,
          nameKey: undefined
        }
      }
    }

    mergeStateWithDefaults(state as ConfigState)

    expect(state.layerSetConfigs?.[defaultLayerSet.id]?.name).toBe(customName)
    expect(state.layerSetConfigs?.[defaultLayerSet.id]?.nameKey).toBeUndefined()
  })

  it('should preserve custom (non-default) layer sets', () => {
    const customId = 'ls_custom' as const
    const customLayerSet = {
      id: customId,
      name: 'Custom Set',
      layers: [],
      totalThickness: 0,
      use: 'wall' as const
    }
    const state: Partial<ConfigState> = {
      layerSetConfigs: {
        [customId]: customLayerSet
      }
    }

    mergeStateWithDefaults(state as ConfigState)

    expect(state.layerSetConfigs?.[customId]).toEqual(customLayerSet)
  })

  it('should restore nameKey for all assembly types', () => {
    const defaultWall = DEFAULT_PERIMETER_WALL_ASSEMBLIES[0]
    const defaultFloor = DEFAULT_FLOOR_ASSEMBLIES[0]
    const defaultRoof = DEFAULT_ROOF_ASSEMBLIES[0]
    const defaultOpening = DEFAULT_OPENING_ASSEMBLIES[0]
    const defaultRingBeam = DEFAULT_RING_BEAM_ASSEMBLIES[0]

    const state: Partial<ConfigState> = {
      perimeterWallAssemblyConfigs: {
        [defaultWall.id]: { ...defaultWall, nameKey: undefined }
      },
      floorAssemblyConfigs: {
        [defaultFloor.id]: { ...defaultFloor, nameKey: undefined }
      },
      roofAssemblyConfigs: {
        [defaultRoof.id]: { ...defaultRoof, nameKey: undefined }
      },
      openingAssemblyConfigs: {
        [defaultOpening.id]: { ...defaultOpening, nameKey: undefined }
      },
      ringBeamAssemblyConfigs: {
        [defaultRingBeam.id]: { ...defaultRingBeam, nameKey: undefined }
      }
    }

    mergeStateWithDefaults(state as ConfigState)

    expect(state.perimeterWallAssemblyConfigs?.[defaultWall.id]?.nameKey).toBe(defaultWall.nameKey)
    expect(state.floorAssemblyConfigs?.[defaultFloor.id]?.nameKey).toBe(defaultFloor.nameKey)
    expect(state.roofAssemblyConfigs?.[defaultRoof.id]?.nameKey).toBe(defaultRoof.nameKey)
    expect(state.openingAssemblyConfigs?.[defaultOpening.id]?.nameKey).toBe(defaultOpening.nameKey)
    expect(state.ringBeamAssemblyConfigs?.[defaultRingBeam.id]?.nameKey).toBe(defaultRingBeam.nameKey)
  })

  it('should handle undefined configs gracefully', () => {
    const state: Partial<ConfigState> = {
      layerSetConfigs: undefined,
      perimeterWallAssemblyConfigs: undefined
    }

    expect(() => {
      mergeStateWithDefaults(state as ConfigState)
    }).not.toThrow()
  })
})
