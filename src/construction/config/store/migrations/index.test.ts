import { describe, expect, it } from 'vitest'

import { strawbale, wood120x60, woodwool } from '@/construction/materials/material'

import { applyMigrations } from './index'

describe('config migrations', () => {
  it('adds default spacer properties to double modules', () => {
    const migrated = applyMigrations({
      wallAssemblyConfigs: {
        missingFields: {
          module: {
            type: 'double',
            width: 900,
            frameThickness: 60,
            frameWidth: 120,
            frameMaterial: 'frame-material',
            strawMaterial: 'straw-material'
          }
        }
      }
    }) as { wallAssemblyConfigs: Record<string, { module: Record<string, unknown> }> }

    const module = migrated.wallAssemblyConfigs.missingFields.module
    expect(module.spacerSize).toBe(120)
    expect(module.spacerCount).toBe(3)
    expect(module.spacerMaterial).toBe(wood120x60.id)
    expect(module.infillMaterial).toBe(woodwool.id)
  })

  it('normalizes existing spacer properties when provided as strings', () => {
    const migrated = applyMigrations({
      wallAssemblyConfigs: {
        withStrings: {
          module: {
            type: 'double',
            width: 900,
            frameThickness: 60,
            frameWidth: 120,
            frameMaterial: 'frame-material',
            strawMaterial: 'straw-material',
            spacerSize: '150',
            spacerCount: '4',
            spacerMaterial: 'custom-spacer',
            infillMaterial: 'custom-infill'
          }
        }
      }
    }) as { wallAssemblyConfigs: Record<string, { module: Record<string, unknown> }> }

    const module = migrated.wallAssemblyConfigs.withStrings.module
    expect(module.spacerSize).toBe(150)
    expect(module.spacerCount).toBe(4)
    expect(module.spacerMaterial).toBe('custom-spacer')
    expect(module.infillMaterial).toBe('custom-infill')
  })

  it('migrates straw configuration to top level and removes duplicates', () => {
    const migrated = applyMigrations({
      wallAssemblyConfigs: {
        sample: {
          straw: {
            baleMinLength: 850,
            baleMaxLength: 950,
            baleHeight: 480,
            baleWidth: 340,
            material: strawbale.id
          }
        }
      }
    }) as { straw: Record<string, unknown>; wallAssemblyConfigs: Record<string, Record<string, unknown>> }

    expect(migrated.straw).toMatchObject({
      baleMinLength: 850,
      baleMaxLength: 950,
      baleHeight: 480,
      baleWidth: 340,
      material: strawbale.id,
      tolerance: 2,
      topCutoffLimit: 50,
      flakeSize: 70
    })
    expect('straw' in migrated.wallAssemblyConfigs.sample).toBe(false)
  })

  it('adds defaults for new straw configuration properties when missing or invalid', () => {
    const migrated = applyMigrations({
      straw: {
        baleMinLength: 820,
        baleMaxLength: 930,
        baleHeight: 500,
        baleWidth: 360,
        material: strawbale.id,
        tolerance: -5,
        topCutoffLimit: 'invalid',
        flakeSize: 0
      }
    }) as { straw: Record<string, unknown> }

    expect(migrated.straw).toMatchObject({
      baleMinLength: 820,
      baleMaxLength: 930,
      baleHeight: 500,
      baleWidth: 360,
      material: strawbale.id,
      tolerance: 2,
      topCutoffLimit: 50,
      flakeSize: 70
    })
  })

  it('populates missing wall layer arrays with clay and lime defaults', () => {
    const migrated = applyMigrations({
      wallAssemblyConfigs: {
        test: {
          type: 'infill',
          openings: {},
          layers: {
            insideThickness: 25,
            outsideThickness: 45
          }
        }
      }
    }) as {
      wallAssemblyConfigs: Record<
        string,
        {
          layers: {
            insideLayers: { material: string; thickness: number; name: string }[]
            outsideLayers: { material: string; thickness: number; name: string }[]
          }
        }
      >
    }

    const layers = migrated.wallAssemblyConfigs.test.layers
    expect(layers.insideLayers).toHaveLength(1)
    expect(layers.insideLayers[0].material).toBeDefined()
    expect(layers.insideLayers[0].thickness).toBe(25)
    expect(layers.insideLayers[0].name).toBe('Default Layer')

    expect(layers.outsideLayers).toHaveLength(1)
    expect(layers.outsideLayers[0].material).toBeDefined()
    expect(layers.outsideLayers[0].thickness).toBe(45)
    expect(layers.outsideLayers[0].name).toBe('Default Layer')
  })

  it('populates missing floor layer arrays with invalid material defaults', () => {
    const migrated = applyMigrations({
      floorAssemblyConfigs: {
        floor: {
          type: 'monolithic',
          thickness: 180,
          material: 'mat',
          layers: {
            topThickness: 22,
            bottomThickness: 12
          }
        }
      }
    }) as {
      floorAssemblyConfigs: Record<
        string,
        {
          layers: {
            topLayers: { material: string; thickness: number; name: string }[]
            bottomLayers: { material: string; thickness: number; name: string }[]
          }
        }
      >
    }

    const layers = migrated.floorAssemblyConfigs.floor.layers
    expect(layers.topLayers).toHaveLength(1)
    expect(layers.topLayers[0].material).toBeDefined()
    expect(layers.topLayers[0].thickness).toBe(22)
    expect(layers.topLayers[0].name).toBe('Default Layer')

    expect(layers.bottomLayers).toHaveLength(1)
    expect(layers.bottomLayers[0].material).toBeDefined()
    expect(layers.bottomLayers[0].thickness).toBe(12)
    expect(layers.bottomLayers[0].name).toBe('Default Layer')
  })
})
