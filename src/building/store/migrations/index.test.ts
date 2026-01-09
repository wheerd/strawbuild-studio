import { describe, expect, it, vi } from 'vitest'

import { newVec2 } from '@/shared/geometry'

import { applyMigrations } from './index'

vi.mock('@/shared/geometry/polygon', () => ({
  ensurePolygonIsClockwise: vi.fn().mockImplementation(p => p)
}))

describe('model store migrations', () => {
  beforeEach(() => {
    const storage = (globalThis as { localStorage?: Storage }).localStorage
    storage?.clear()
  })

  it('ensures floor collections are plain objects', () => {
    const migrated = applyMigrations({
      floorAreas: null,
      floorOpenings: []
    }, 8) as Record<string, unknown>

    expect(migrated.floorAreas).toEqual({})
    expect(migrated.floorOpenings).toEqual({})
  })

  it('derives referencePolygon from corners when missing (inside reference)', () => {
    const migrated = applyMigrations({
      perimeters: {
        perimeter1: {
          referenceSide: 'inside',
          corners: [
            { insidePoint: [100, 0], outsidePoint: [100, 100] },
            { insidePoint: [100, 100], outsidePoint: [0, 100] },
            { insidePoint: [0, 0], outsidePoint: [100, 0] }
          ],
          walls: []
        }
      }
    }, 8) as Record<string, any>

    const perimeter = migrated.perimeters.perimeter1
    expect(Array.isArray(perimeter.referencePolygon)).toBe(true)
    expect(perimeter.referencePolygon).toHaveLength(3)
    expect(Array.from(perimeter.referencePolygon)).toEqual([newVec2(100, 0), newVec2(100, 100), newVec2(0, 0)])
  })

  it('derives referencePolygon from corners when reference side is outside', () => {
    const migrated = applyMigrations({
      perimeters: {
        perimeter1: {
          referenceSide: 'outside',
          corners: [
            { insidePoint: [10, 0], outsidePoint: [-10, 0] },
            { insidePoint: [10, 10], outsidePoint: [10, 10] },
            { insidePoint: [0, 0], outsidePoint: [10, 0] }
          ],
          walls: []
        }
      }
    }, 8) as Record<string, any>

    const perimeter = migrated.perimeters.perimeter1
    expect(Array.isArray(perimeter.referencePolygon)).toBe(true)
    expect(perimeter.referencePolygon).toHaveLength(3)
    expect(Array.from(perimeter.referencePolygon)).toEqual([newVec2(-10, 0), newVec2(10, 10), newVec2(10, 0)])
  })

  it('renames storey height to floorHeight and adds next floor thickness', () => {
    const storage = (globalThis as { localStorage?: Storage }).localStorage
    storage?.setItem(
      'strawbaler-config',
      JSON.stringify({
        state: {
          floorAssemblyConfigs: {
            floorB: {
              id: 'floorB',
              name: 'Second Floor',
              type: 'monolithic',
              thickness: 200,
              material: 'material_floor',
              layers: {
                topThickness: 40,
                bottomThickness: 60
              }
            }
          }
        }
      })
    )

    const migrated = applyMigrations({
      defaultHeight: 2600,
      storeys: {
        a: { id: 'a', level: 0, height: 2400, floorAssemblyId: 'floorA' },
        b: { id: 'b', level: 1, height: 2300, floorAssemblyId: 'floorB' }
      }
    }, 8) as Record<string, any>

    const storeys = migrated.storeys as Record<string, any>

    expect(migrated.defaultHeight).toBeUndefined()
    expect(migrated.defaultFloorHeight).toBe(2600)

    expect(storeys.a.height).toBeUndefined()
    expect(storeys.a.floorHeight).toBe(2400 + 200 + 40 + 60)

    expect(storeys.b.height).toBeUndefined()
    expect(storeys.b.floorHeight).toBe(2300)
  })

  it('preserves opening dimensions as fitting values', () => {
    const storage = (globalThis as { localStorage?: Storage }).localStorage
    storage?.setItem(
      'strawbaler-config',
      JSON.stringify({
        state: {
          wallAssemblyConfigs: {
            wallA: {
              id: 'wallA',
              name: 'Wall',
              type: 'non-strawbale',
              material: 'mat',
              thickness: 300,
              layers: { insideThickness: 20, insideLayers: [], outsideThickness: 20, outsideLayers: [] },
              openings: {
                padding: 25,
                headerThickness: 60,
                headerMaterial: 'mat',
                sillThickness: 60,
                sillMaterial: 'mat'
              }
            }
          }
        }
      })
    )

    const migrated = applyMigrations({
      perimeters: {
        perimeter1: {
          id: 'perimeter1',
          storeyId: 'storey1',
          referenceSide: 'inside',
          referencePolygon: [],
          corners: [],
          walls: [
            {
              id: 'wall1',
              wallAssemblyId: 'wallA',
              thickness: 300,
              openings: [
                {
                  id: 'opening1',
                  type: 'door',
                  centerOffsetFromWallStart: 500,
                  width: 1000, // Fitted width
                  height: 2100, // Fitted height
                  sillHeight: 100 // Fitted sill height
                }
              ]
            }
          ]
        }
      }
    }, 8) as Record<string, any>

    const opening = migrated.perimeters.perimeter1.walls[0].openings[0]
    // Dimensions are stored as fitted and should remain unchanged
    expect(opening.width).toBe(1000)
    expect(opening.height).toBe(2100)
    expect(opening.centerOffsetFromWallStart).toBe(500)
    expect(opening.sillHeight).toBe(100)
  })
})
