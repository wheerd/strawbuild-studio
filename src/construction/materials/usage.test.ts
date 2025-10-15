import { describe, expect, it } from 'vitest'

import { createRingBeamAssemblyId, createWallAssemblyId } from '@/building/model/ids'
import type { RingBeamAssembly, WallAssembly } from '@/construction/config/types'
import '@/shared/geometry'

import { straw, strawbale, wood360x60 } from './material'
import { getMaterialUsage } from './usage'

describe('Material Usage Detection', () => {
  describe('getMaterialUsage', () => {
    it('should detect material not in use', () => {
      const usage = getMaterialUsage(wood360x60.id, [], [])

      expect(usage.isUsed).toBe(false)
      expect(usage.usedByConfigs).toEqual([])
    })

    it('should detect material used in ring beam config', () => {
      const ringBeamId = createRingBeamAssemblyId()

      const ringBeamAssembly: RingBeamAssembly = {
        id: ringBeamId,
        name: 'Test Ring Beam',
        config: {
          type: 'full',
          material: wood360x60.id,
          height: 60,
          width: 360,
          offsetFromEdge: 30
        }
      }

      const usage = getMaterialUsage(wood360x60.id, [ringBeamAssembly], [])

      expect(usage.isUsed).toBe(true)
      expect(usage.usedByConfigs).toEqual(['Ring Beam: Test Ring Beam'])
    })

    it('should detect material used in perimeter config posts', () => {
      const perimeterId = createWallAssemblyId()
      const wallAssembly: WallAssembly = {
        id: perimeterId,
        name: 'Test Infill',
        config: {
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
          straw: {
            baleLength: 800,
            baleHeight: 500,
            baleWidth: 360,
            material: strawbale.id
          }
        },
        layers: {
          insideThickness: 30,
          outsideThickness: 50
        }
      }

      const usage = getMaterialUsage(wood360x60.id, [], [wallAssembly])

      expect(usage.isUsed).toBe(true)
      expect(usage.usedByConfigs).toEqual(['Wall: Test Infill (posts, opening headers, opening sills)'])
    })

    it('should detect material used in strawhenge config', () => {
      const perimeterId = createWallAssemblyId()
      const wallAssembly: WallAssembly = {
        id: perimeterId,
        name: 'Test Strawhenge',
        config: {
          type: 'strawhenge',
          module: {
            width: 920,
            type: 'single',
            frameThickness: 60,
            frameMaterial: wood360x60.id,
            strawMaterial: strawbale.id
          },
          infill: {
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
              headerMaterial: wood360x60.id,
              sillThickness: 60,
              sillMaterial: wood360x60.id
            },
            straw: {
              baleLength: 800,
              baleHeight: 500,
              baleWidth: 360,
              material: strawbale.id
            }
          },
          openings: {
            padding: 15,
            headerThickness: 60,
            headerMaterial: wood360x60.id,
            sillThickness: 60,
            sillMaterial: wood360x60.id
          },
          straw: {
            baleLength: 800,
            baleHeight: 500,
            baleWidth: 360,
            material: strawbale.id
          }
        },
        layers: {
          insideThickness: 30,
          outsideThickness: 50
        }
      }

      const usage = getMaterialUsage(wood360x60.id, [], [wallAssembly])

      expect(usage.isUsed).toBe(true)
      expect(usage.usedByConfigs).toEqual([
        'Wall: Test Strawhenge (module frame, infill posts, opening headers, opening sills)'
      ])
    })

    it('should detect material used in multiple configs', () => {
      const ringBeamId = createRingBeamAssemblyId()
      const perimeterId = createWallAssemblyId()
      const ringBeamAssembly: RingBeamAssembly = {
        id: ringBeamId,
        name: 'Test Ring Beam',
        config: {
          type: 'full',
          material: wood360x60.id,
          height: 60,
          width: 360,
          offsetFromEdge: 30
        }
      }

      const wallAssembly: WallAssembly = {
        id: perimeterId,
        name: 'Test Infill',
        config: {
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
          straw: {
            baleLength: 800,
            baleHeight: 500,
            baleWidth: 360,
            material: strawbale.id
          }
        },
        layers: {
          insideThickness: 30,
          outsideThickness: 50
        }
      }

      const usage = getMaterialUsage(wood360x60.id, [ringBeamAssembly], [wallAssembly])

      expect(usage.isUsed).toBe(true)
      expect(usage.usedByConfigs).toHaveLength(2)
      expect(usage.usedByConfigs).toContain('Ring Beam: Test Ring Beam')
      expect(usage.usedByConfigs).toContain('Wall: Test Infill (posts)')
    })
  })
})
