import { describe, expect, it } from 'vitest'

import { createPerimeterConstructionMethodId, createRingBeamConstructionMethodId } from '@/building/model/ids'
import type { PerimeterConstructionMethod, RingBeamConstructionMethod } from '@/construction/config/types'
import { createLength } from '@/shared/geometry'

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
      const ringBeamId = createRingBeamConstructionMethodId()

      const ringBeamMethod: RingBeamConstructionMethod = {
        id: ringBeamId,
        name: 'Test Ring Beam',
        config: {
          type: 'full',
          material: wood360x60.id,
          height: createLength(60),
          width: createLength(360),
          offsetFromEdge: createLength(30)
        }
      }

      const usage = getMaterialUsage(wood360x60.id, [ringBeamMethod], [])

      expect(usage.isUsed).toBe(true)
      expect(usage.usedByConfigs).toEqual(['Ring Beam: Test Ring Beam'])
    })

    it('should detect material used in perimeter config posts', () => {
      const perimeterId = createPerimeterConstructionMethodId()
      const perimeterMethod: PerimeterConstructionMethod = {
        id: perimeterId,
        name: 'Test Infill',
        config: {
          type: 'infill',
          maxPostSpacing: createLength(800),
          minStrawSpace: createLength(70),
          posts: {
            type: 'double',
            width: createLength(60),
            thickness: createLength(120),
            material: wood360x60.id,
            infillMaterial: straw.id
          },
          openings: {
            padding: createLength(15),
            headerThickness: createLength(60),
            headerMaterial: wood360x60.id,
            sillThickness: createLength(60),
            sillMaterial: wood360x60.id
          },
          straw: {
            baleLength: createLength(800),
            baleHeight: createLength(500),
            baleWidth: createLength(360),
            material: strawbale.id
          }
        },
        layers: {
          insideThickness: createLength(30),
          outsideThickness: createLength(50)
        }
      }

      const usage = getMaterialUsage(wood360x60.id, [], [perimeterMethod])

      expect(usage.isUsed).toBe(true)
      expect(usage.usedByConfigs).toEqual(['Perimeter: Test Infill (posts, opening headers, opening sills)'])
    })

    it('should detect material used in strawhenge config', () => {
      const perimeterId = createPerimeterConstructionMethodId()
      const perimeterMethod: PerimeterConstructionMethod = {
        id: perimeterId,
        name: 'Test Strawhenge',
        config: {
          type: 'strawhenge',
          module: {
            width: createLength(920),
            type: 'single',
            frameThickness: createLength(60),
            frameMaterial: wood360x60.id,
            strawMaterial: strawbale.id
          },
          infill: {
            type: 'infill',
            maxPostSpacing: createLength(800),
            minStrawSpace: createLength(70),
            posts: {
              type: 'full',
              width: createLength(60),
              material: wood360x60.id
            },
            openings: {
              padding: createLength(15),
              headerThickness: createLength(60),
              headerMaterial: wood360x60.id,
              sillThickness: createLength(60),
              sillMaterial: wood360x60.id
            },
            straw: {
              baleLength: createLength(800),
              baleHeight: createLength(500),
              baleWidth: createLength(360),
              material: strawbale.id
            }
          },
          openings: {
            padding: createLength(15),
            headerThickness: createLength(60),
            headerMaterial: wood360x60.id,
            sillThickness: createLength(60),
            sillMaterial: wood360x60.id
          },
          straw: {
            baleLength: createLength(800),
            baleHeight: createLength(500),
            baleWidth: createLength(360),
            material: strawbale.id
          }
        },
        layers: {
          insideThickness: createLength(30),
          outsideThickness: createLength(50)
        }
      }

      const usage = getMaterialUsage(wood360x60.id, [], [perimeterMethod])

      expect(usage.isUsed).toBe(true)
      expect(usage.usedByConfigs).toEqual([
        'Perimeter: Test Strawhenge (module frame, infill posts, opening headers, opening sills)'
      ])
    })

    it('should detect material used in multiple configs', () => {
      const ringBeamId = createRingBeamConstructionMethodId()
      const perimeterId = createPerimeterConstructionMethodId()
      const ringBeamMethod: RingBeamConstructionMethod = {
        id: ringBeamId,
        name: 'Test Ring Beam',
        config: {
          type: 'full',
          material: wood360x60.id,
          height: createLength(60),
          width: createLength(360),
          offsetFromEdge: createLength(30)
        }
      }

      const perimeterMethod: PerimeterConstructionMethod = {
        id: perimeterId,
        name: 'Test Infill',
        config: {
          type: 'infill',
          maxPostSpacing: createLength(800),
          minStrawSpace: createLength(70),
          posts: {
            type: 'full',
            width: createLength(60),
            material: wood360x60.id
          },
          openings: {
            padding: createLength(15),
            headerThickness: createLength(60),
            headerMaterial: straw.id, // Different material for headers
            sillThickness: createLength(60),
            sillMaterial: straw.id
          },
          straw: {
            baleLength: createLength(800),
            baleHeight: createLength(500),
            baleWidth: createLength(360),
            material: strawbale.id
          }
        },
        layers: {
          insideThickness: createLength(30),
          outsideThickness: createLength(50)
        }
      }

      const usage = getMaterialUsage(wood360x60.id, [ringBeamMethod], [perimeterMethod])

      expect(usage.isUsed).toBe(true)
      expect(usage.usedByConfigs).toHaveLength(2)
      expect(usage.usedByConfigs).toContain('Ring Beam: Test Ring Beam')
      expect(usage.usedByConfigs).toContain('Perimeter: Test Infill (posts)')
    })
  })
})
