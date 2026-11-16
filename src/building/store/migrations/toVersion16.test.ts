import { describe, expect, it } from 'vitest'

import { DEFAULT_INTERIOR_WALL_ASSEMBLY_ID } from '@/config/store/slices/interiorWalls.defaults'

import { applyMigrations } from './index'

describe('model migration to version 16', () => {
  it('assigns defaults to intermediate walls and connected inner nodes', () => {
    const migrated = applyMigrations(
      {
        intermediateWalls: {
          intermediate_wall: { id: 'intermediate_wall', wallAssemblyId: undefined }
        },
        wallNodes: {
          wallnode_inner: {
            id: 'wallnode_inner',
            type: 'inner',
            connectedWallIds: ['intermediate_wall']
          }
        }
      },
      15
    ) as Record<string, any>

    expect(migrated.intermediateWalls.intermediate_wall.wallAssemblyId).toBe(DEFAULT_INTERIOR_WALL_ASSEMBLY_ID)
    expect(migrated.wallNodes.wallnode_inner.constructedBy).toBe('intermediate_wall')
    expect(migrated.timestamps.intermediate_wall).toEqual(expect.any(Number))
    expect(migrated.timestamps.wallnode_inner).toEqual(expect.any(Number))
  })
})
