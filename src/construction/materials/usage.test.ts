import { describe, expect, it } from 'vitest'

import { createRingBeamAssemblyId, createWallAssemblyId } from '@/building/model/ids'
import type { RingBeamAssemblyConfig, WallAssemblyConfig } from '@/construction/config/types'
import type { StrawConfig } from '@/construction/materials/straw'
import '@/shared/geometry'

import { straw, strawbale, wood120x60, wood360x60, woodwool } from './material'
import { getMaterialUsage } from './usage'

const defaultStrawConfig: StrawConfig = {
  baleMinLength: 800,
  baleMaxLength: 900,
  baleHeight: 500,
  baleWidth: 360,
  material: strawbale.id,
  tolerance: 2,
  topCutoffLimit: 50,
  flakeSize: 70
}

describe('Material Usage Detection', () => {
  describe('getMaterialUsage', () => {
    it('should detect material not in use', () => {
      const usage = getMaterialUsage(wood360x60.id, [], [], defaultStrawConfig)

      expect(usage.isUsed).toBe(false)
      expect(usage.usedByConfigs).toEqual([])
    })

    it('should detect material used in straw configuration', () => {
      const usage = getMaterialUsage(defaultStrawConfig.material, [], [], defaultStrawConfig)

      expect(usage.isUsed).toBe(true)
      expect(usage.usedByConfigs).toEqual(['Global Straw Configuration'])
    })

    it('should detect material used in ring beam config', () => {
      const ringBeamId = createRingBeamAssemblyId()

      const ringBeamAssembly: RingBeamAssemblyConfig = {
        id: ringBeamId,
        name: 'Test Ring Beam',
        type: 'full',
        material: wood360x60.id,
        height: 60,
        width: 360,
        offsetFromEdge: 30
      }

      const usage = getMaterialUsage(wood360x60.id, [ringBeamAssembly], [], defaultStrawConfig)

      expect(usage.isUsed).toBe(true)
      expect(usage.usedByConfigs).toEqual(['Ring Beam: Test Ring Beam'])
    })

    it('should detect material used in wall assembly posts', () => {
      const perimeterId = createWallAssemblyId()
      const wallAssembly: WallAssemblyConfig = {
        id: perimeterId,
        name: 'Test Infill',
        type: 'infill',
        maxPostSpacing: 800,
        minStrawSpace: 70,
        posts: {
          type: 'double',
          width: 60,
          thickness: 120,
          material: wood360x60.id,
          infillMaterial: straw.id
        },
        openings: {
          padding: 15,
          headerThickness: 60,
          headerMaterial: wood360x60.id,
          sillThickness: 60,
          sillMaterial: wood360x60.id
        },
        layers: {
          insideThickness: 30,
          outsideThickness: 50
        }
      }

      const usage = getMaterialUsage(wood360x60.id, [], [wallAssembly], defaultStrawConfig)

      expect(usage.isUsed).toBe(true)
      expect(usage.usedByConfigs).toEqual(['Wall: Test Infill (posts, opening headers, opening sills)'])
    })

    it('should detect material used in strawhenge config', () => {
      const perimeterId = createWallAssemblyId()
      const wallAssembly: WallAssemblyConfig = {
        id: perimeterId,
        name: 'Test Strawhenge',
        type: 'strawhenge',
        module: {
          width: 920,
          type: 'single',
          frameThickness: 60,
          frameMaterial: wood360x60.id,
          strawMaterial: strawbale.id
        },
        infill: {
          maxPostSpacing: 800,
          minStrawSpace: 70,
          posts: {
            type: 'full',
            width: 60,
            material: wood360x60.id
          }
        },
        openings: {
          padding: 15,
          headerThickness: 60,
          headerMaterial: wood360x60.id,
          sillThickness: 60,
          sillMaterial: wood360x60.id
        },
        layers: {
          insideThickness: 30,
          outsideThickness: 50
        }
      }

      const usage = getMaterialUsage(wood360x60.id, [], [wallAssembly], defaultStrawConfig)

      expect(usage.isUsed).toBe(true)
      expect(usage.usedByConfigs).toEqual([
        'Wall: Test Strawhenge (module frame, infill posts, opening headers, opening sills)'
      ])
    })

    it('should detect materials used in double module spacers and infill', () => {
      const perimeterId = createWallAssemblyId()
      const wallAssembly: WallAssemblyConfig = {
        id: perimeterId,
        name: 'Double Module Wall',
        type: 'strawhenge',
        module: {
          width: 920,
          type: 'double',
          frameThickness: 60,
          frameWidth: 120,
          frameMaterial: wood360x60.id,
          strawMaterial: strawbale.id,
          spacerSize: 120,
          spacerCount: 3,
          spacerMaterial: wood120x60.id,
          infillMaterial: woodwool.id
        },
        infill: {
          maxPostSpacing: 800,
          minStrawSpace: 70,
          posts: {
            type: 'full',
            width: 60,
            material: wood360x60.id
          }
        },
        openings: {
          padding: 15,
          headerThickness: 60,
          headerMaterial: wood360x60.id,
          sillThickness: 60,
          sillMaterial: wood360x60.id
        },
        layers: {
          insideThickness: 30,
          outsideThickness: 50
        }
      }

      const spacerUsage = getMaterialUsage(wood120x60.id, [], [wallAssembly], defaultStrawConfig)
      expect(spacerUsage.isUsed).toBe(true)
      expect(spacerUsage.usedByConfigs).toEqual(['Wall: Double Module Wall (module spacers)'])

      const infillUsage = getMaterialUsage(woodwool.id, [], [wallAssembly], defaultStrawConfig)
      expect(infillUsage.isUsed).toBe(true)
      expect(infillUsage.usedByConfigs).toEqual(['Wall: Double Module Wall (module infill)'])
    })

    it('should detect material used in multiple configs', () => {
      const ringBeamId = createRingBeamAssemblyId()
      const perimeterId = createWallAssemblyId()
      const ringBeamAssembly: RingBeamAssemblyConfig = {
        id: ringBeamId,
        name: 'Test Ring Beam',
        type: 'full',
        material: wood360x60.id,
        height: 60,
        width: 360,
        offsetFromEdge: 30
      }

      const wallAssembly: WallAssemblyConfig = {
        id: perimeterId,
        name: 'Test Infill',
        type: 'infill',
        maxPostSpacing: 800,
        minStrawSpace: 70,
        posts: {
          type: 'full',
          width: 60,
          material: wood360x60.id
        },
        openings: {
          padding: 15,
          headerThickness: 60,
          headerMaterial: straw.id, // Different material for headers
          sillThickness: 60,
          sillMaterial: straw.id
        },
        layers: {
          insideThickness: 30,
          outsideThickness: 50
        }
      }

      const usage = getMaterialUsage(wood360x60.id, [ringBeamAssembly], [wallAssembly], defaultStrawConfig)

      expect(usage.isUsed).toBe(true)
      expect(usage.usedByConfigs).toHaveLength(2)
      expect(usage.usedByConfigs).toContain('Ring Beam: Test Ring Beam')
      expect(usage.usedByConfigs).toContain('Wall: Test Infill (posts)')
    })
  })
})
