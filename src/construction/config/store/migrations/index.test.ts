import { describe, expect, it } from 'vitest'

import { roughWood, strawbale, woodwool } from '@/construction/materials/material'

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
    expect(module.spacerMaterial).toBe(roughWood.id)
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
      straw: {
        baleMinLength: 850,
        baleMaxLength: 950,
        baleHeight: 480,
        baleWidth: 340,
        material: strawbale.id
      }
    }) as { defaultStrawMaterial: string; straw?: unknown }

    expect(migrated.defaultStrawMaterial).toBe(strawbale.id)
    expect('straw' in migrated).toBe(false)
  })

  it('adds defaults for new straw configuration properties when missing or invalid', () => {
    const migrated = applyMigrations({
      straw: {
        baleMinLength: 820,
        baleMaxLength: 930,
        baleHeight: 500,
        baleWidth: 360,
        material: strawbale.id
      }
    }) as { defaultStrawMaterial: string; straw?: unknown }

    expect(migrated.defaultStrawMaterial).toBe(strawbale.id)
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

  it('renames purlin roof config fields from cladding to sheathing/decking', () => {
    const migrated = applyMigrations({
      roofAssemblyConfigs: {
        purlin: {
          type: 'purlin',
          thickness: 250,
          insideCladdingMaterial: 'inside-mat',
          insideCladdingThickness: 15,
          topCladdingMaterial: 'top-mat',
          topCladdingThickness: 20,
          rafterSpacingMax: 800
        }
      }
    }) as {
      roofAssemblyConfigs: Record<string, Record<string, unknown>>
    }

    const roof = migrated.roofAssemblyConfigs.purlin
    expect(roof.ceilingSheathingMaterial).toBe('inside-mat')
    expect(roof.ceilingSheathingThickness).toBe(15)
    expect(roof.deckingMaterial).toBe('top-mat')
    expect(roof.deckingThickness).toBe(20)
    expect('insideCladdingMaterial' in roof).toBe(false)
    expect('insideCladdingThickness' in roof).toBe(false)
    expect('topCladdingMaterial' in roof).toBe(false)
    expect('topCladdingThickness' in roof).toBe(false)
    expect('rafterSpacingMax' in roof).toBe(false)
  })

  it('renames filled floor config fields from bottomCladding to ceilingSheathing', () => {
    const migrated = applyMigrations({
      floorAssemblyConfigs: {
        filled: {
          type: 'filled',
          constructionHeight: 300,
          bottomCladdingMaterial: 'bottom-mat',
          bottomCladdingThickness: 18
        }
      }
    }) as {
      floorAssemblyConfigs: Record<string, Record<string, unknown>>
    }

    const floor = migrated.floorAssemblyConfigs.filled
    expect(floor.ceilingSheathingMaterial).toBe('bottom-mat')
    expect(floor.ceilingSheathingThickness).toBe(18)
    expect('bottomCladdingMaterial' in floor).toBe(false)
    expect('bottomCladdingThickness' in floor).toBe(false)
  })

  it('does not migrate monolithic roof or other floor types', () => {
    const migrated = applyMigrations({
      roofAssemblyConfigs: {
        monolithic: {
          type: 'monolithic',
          thickness: 200,
          insideCladdingMaterial: 'should-not-migrate'
        }
      },
      floorAssemblyConfigs: {
        joist: {
          type: 'joist',
          bottomCladdingMaterial: 'should-not-migrate'
        }
      }
    }) as {
      roofAssemblyConfigs: Record<string, Record<string, unknown>>
      floorAssemblyConfigs: Record<string, Record<string, unknown>>
    }

    const roof = migrated.roofAssemblyConfigs.monolithic
    expect(roof.insideCladdingMaterial).toBe('should-not-migrate')
    expect('ceilingSheathingMaterial' in roof).toBe(false)

    const floor = migrated.floorAssemblyConfigs.joist
    expect(floor.bottomCladdingMaterial).toBe('should-not-migrate')
    expect('ceilingSheathingMaterial' in floor).toBe(false)
  })

  it('does not overwrite already migrated fields', () => {
    const migrated = applyMigrations({
      roofAssemblyConfigs: {
        purlin: {
          type: 'purlin',
          ceilingSheathingMaterial: 'new-mat',
          insideCladdingMaterial: 'old-mat'
        }
      }
    }) as {
      roofAssemblyConfigs: Record<string, Record<string, unknown>>
    }

    const roof = migrated.roofAssemblyConfigs.purlin
    expect(roof.ceilingSheathingMaterial).toBe('new-mat')
  })

  it('adds triangle batten configuration to wall assemblies', () => {
    const migrated = applyMigrations({
      wallAssemblyConfigs: {
        infillWithoutBattens: {
          type: 'infill',
          posts: { type: 'full', width: 60, material: roughWood.id }
        },
        strawhengeWithoutBattens: {
          type: 'strawhenge',
          module: {
            type: 'single',
            minWidth: 920,
            maxWidth: 920,
            frameThickness: 60,
            frameMaterial: roughWood.id,
            strawMaterial: strawbale.id
          },
          infill: {
            posts: { type: 'full', width: 60, material: roughWood.id }
          }
        },
        modulesWithoutBattens: {
          type: 'modules',
          module: {
            type: 'single',
            minWidth: 920,
            maxWidth: 920,
            frameThickness: 60,
            frameMaterial: roughWood.id,
            strawMaterial: strawbale.id
          },
          infill: {
            posts: { type: 'full', width: 60, material: roughWood.id }
          }
        }
      }
    }) as {
      wallAssemblyConfigs: Record<
        string,
        {
          triangularBattens?: Record<string, unknown>
          module?: { triangularBattens?: Record<string, unknown> }
          infill?: { triangularBattens?: Record<string, unknown> }
        }
      >
    }

    // Check infill assembly
    const infill = migrated.wallAssemblyConfigs.infillWithoutBattens
    expect(infill.triangularBattens).toBeDefined()
    expect(infill.triangularBattens?.size).toBe(30)
    expect(infill.triangularBattens?.inside).toBe(false)
    expect(infill.triangularBattens?.outside).toBe(false)
    expect(infill.triangularBattens?.minLength).toBe(100)

    // Check strawhenge module battens
    const strawhenge = migrated.wallAssemblyConfigs.strawhengeWithoutBattens
    expect(strawhenge.module?.triangularBattens).toBeDefined()
    expect(strawhenge.module?.triangularBattens?.size).toBe(30)
    expect(strawhenge.module?.triangularBattens?.inside).toBe(false)

    // Check strawhenge infill battens
    expect(strawhenge.infill?.triangularBattens).toBeDefined()
    expect(strawhenge.infill?.triangularBattens?.outside).toBe(false)

    // Check modules assembly
    const modules = migrated.wallAssemblyConfigs.modulesWithoutBattens
    expect(modules.module?.triangularBattens).toBeDefined()
    expect(modules.infill?.triangularBattens).toBeDefined()
  })
})
