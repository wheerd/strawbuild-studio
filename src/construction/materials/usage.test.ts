import { describe, expect, it } from 'vitest'

import { createRingBeamAssemblyId, createWallAssemblyId } from '@/building/model/ids'
import type { RingBeamAssemblyConfig, WallAssemblyConfig } from '@/construction/config/types'
import '@/shared/geometry'

import { createMaterialId, straw, strawbale, wood, woodwool } from './material'
import { getMaterialUsage } from './usage'

const defaultStrawMaterialId = strawbale.id

describe('Material Usage Detection', () => {
  describe('getMaterialUsage', () => {
    it('detects material not in use', () => {
      const usage = getMaterialUsage(wood.id, [], [], defaultStrawMaterialId)

      expect(usage.isUsed).toBe(false)
      expect(usage.usedByConfigs).toEqual([])
    })

    it('detects default straw material usage', () => {
      const usage = getMaterialUsage(defaultStrawMaterialId, [], [], defaultStrawMaterialId)

      expect(usage.isUsed).toBe(true)
      expect(usage.usedByConfigs).toEqual(['Default Straw Material'])
    })

    it('detects ring beam material usage', () => {
      const ringBeamAssembly: RingBeamAssemblyConfig = {
        id: createRingBeamAssemblyId(),
        name: 'Test Ring Beam',
        type: 'full',
        material: wood.id,
        height: 60,
        width: 360,
        offsetFromEdge: 30
      }

      const usage = getMaterialUsage(wood.id, [ringBeamAssembly], [], defaultStrawMaterialId)

      expect(usage.isUsed).toBe(true)
      expect(usage.usedByConfigs).toEqual(['Ring Beam: Test Ring Beam'])
    })

    it('detects wall assembly post materials', () => {
      const wallAssembly: WallAssemblyConfig = {
        id: createWallAssemblyId(),
        name: 'Test Infill',
        type: 'infill',
        maxPostSpacing: 800,
        minStrawSpace: 70,
        posts: {
          type: 'double',
          width: 60,
          thickness: 120,
          material: wood.id,
          infillMaterial: straw.id
        },
        openings: {
          padding: 15,
          headerThickness: 60,
          headerMaterial: wood.id,
          sillThickness: 60,
          sillMaterial: wood.id
        },
        layers: {
          insideThickness: 30,
          insideLayers: [],
          outsideThickness: 50,
          outsideLayers: []
        }
      }

      const usage = getMaterialUsage(wood.id, [], [wallAssembly], defaultStrawMaterialId)

      expect(usage.isUsed).toBe(true)
      expect(usage.usedByConfigs).toEqual(['Wall: Test Infill (posts, opening headers, opening sills)'])
    })

    it('detects strawhenge module usage', () => {
      const wallAssembly: WallAssemblyConfig = {
        id: createWallAssemblyId(),
        name: 'Test Strawhenge',
        type: 'strawhenge',
        module: {
          width: 920,
          type: 'single',
          frameThickness: 60,
          frameMaterial: wood.id,
          strawMaterial: strawbale.id
        },
        infill: {
          maxPostSpacing: 800,
          minStrawSpace: 70,
          posts: {
            type: 'full',
            width: 60,
            material: wood.id
          }
        },
        openings: {
          padding: 15,
          headerThickness: 60,
          headerMaterial: wood.id,
          sillThickness: 60,
          sillMaterial: wood.id
        },
        layers: {
          insideThickness: 30,
          insideLayers: [],
          outsideThickness: 50,
          outsideLayers: []
        }
      }

      const usage = getMaterialUsage(wood.id, [], [wallAssembly], defaultStrawMaterialId)

      expect(usage.isUsed).toBe(true)
      expect(usage.usedByConfigs).toEqual([
        'Wall: Test Strawhenge (module frame, infill posts, opening headers, opening sills)'
      ])
    })

    it('detects spacer and infill materials in double modules', () => {
      const spacerMaterialId = createMaterialId()
      const wallAssembly: WallAssemblyConfig = {
        id: createWallAssemblyId(),
        name: 'Double Module Wall',
        type: 'strawhenge',
        module: {
          width: 920,
          type: 'double',
          frameThickness: 60,
          frameWidth: 120,
          frameMaterial: wood.id,
          strawMaterial: strawbale.id,
          spacerSize: 120,
          spacerCount: 3,
          spacerMaterial: spacerMaterialId,
          infillMaterial: woodwool.id
        },
        infill: {
          maxPostSpacing: 800,
          minStrawSpace: 70,
          posts: {
            type: 'full',
            width: 60,
            material: wood.id
          }
        },
        openings: {
          padding: 15,
          headerThickness: 60,
          headerMaterial: wood.id,
          sillThickness: 60,
          sillMaterial: wood.id
        },
        layers: {
          insideThickness: 30,
          insideLayers: [],
          outsideThickness: 50,
          outsideLayers: []
        }
      }

      const spacerUsage = getMaterialUsage(spacerMaterialId, [], [wallAssembly], defaultStrawMaterialId)
      expect(spacerUsage.isUsed).toBe(true)
      expect(spacerUsage.usedByConfigs).toEqual(['Wall: Double Module Wall (module spacers)'])

      const infillUsage = getMaterialUsage(woodwool.id, [], [wallAssembly], defaultStrawMaterialId)
      expect(infillUsage.isUsed).toBe(true)
      expect(infillUsage.usedByConfigs).toEqual(['Wall: Double Module Wall (module infill)'])
    })

    it('detects materials used across multiple configs', () => {
      const ringBeamAssembly: RingBeamAssemblyConfig = {
        id: createRingBeamAssemblyId(),
        name: 'Test Ring Beam',
        type: 'full',
        material: wood.id,
        height: 60,
        width: 360,
        offsetFromEdge: 30
      }

      const wallAssembly: WallAssemblyConfig = {
        id: createWallAssemblyId(),
        name: 'Test Infill',
        type: 'infill',
        maxPostSpacing: 800,
        minStrawSpace: 70,
        posts: {
          type: 'full',
          width: 60,
          material: wood.id
        },
        openings: {
          padding: 15,
          headerThickness: 60,
          headerMaterial: straw.id,
          sillThickness: 60,
          sillMaterial: straw.id
        },
        layers: {
          insideThickness: 30,
          insideLayers: [],
          outsideThickness: 50,
          outsideLayers: []
        }
      }

      const usage = getMaterialUsage(wood.id, [ringBeamAssembly], [wallAssembly], defaultStrawMaterialId)

      expect(usage.isUsed).toBe(true)
      expect(usage.usedByConfigs).toHaveLength(2)
      expect(usage.usedByConfigs).toContain('Ring Beam: Test Ring Beam')
      expect(usage.usedByConfigs).toContain('Wall: Test Infill (posts)')
    })
  })
})
