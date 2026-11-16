import { describe, expect, it } from 'vitest'

import { DEFAULT_INTERIOR_WALL_ASSEMBLY_ID } from '@/config/store/slices/interiorWalls.defaults'

import { applyMigrations } from './index'

describe('config migration to version 16', () => {
  it('renames perimeter wall fields and initializes interior assemblies', () => {
    const migrated = applyMigrations({
      wallAssemblyConfigs: { custom: { id: 'wa_custom', name: 'Custom' } },
      defaultWallAssemblyId: 'wa_custom'
    }) as Record<string, unknown>

    expect(migrated.perimeterWallAssemblyConfigs).toEqual({ custom: { id: 'wa_custom', name: 'Custom' } })
    expect(migrated.defaultPerimeterWallAssemblyId).toBe('wa_custom')
    expect(migrated.wallAssemblyConfigs).toBeUndefined()
    expect(migrated.defaultWallAssemblyId).toBeUndefined()
    expect(migrated.interiorWallAssemblyConfigs).toBeDefined()
    expect(migrated.defaultInteriorWallAssemblyId).toBe(DEFAULT_INTERIOR_WALL_ASSEMBLY_ID)
  })
})
