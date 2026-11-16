import { describe, expect, it } from 'vitest'

import { validateInteriorWallConfig } from './types'

const config = {
  type: 'stud' as const,
  layerSetId: 'layer-set' as never,
  minStudSpacing: 70,
  desiredStudSpacing: 800,
  maxStudSpacing: 900,
  studWidth: 40,
  studMaterial: 'material_stud' as never,
  equidistantStuds: true,
  headPlateThickness: 60,
  solePlateThickness: 60,
  nogginThickness: 60,
  nogginSpacing: 1500,
  equidistantNoggins: false,
  staggerNoggins: false,
  plankThickness: 20
}

describe('validateInteriorWallConfig', () => {
  it.each([
    ['studWidth', { studWidth: 0 }],
    ['headPlateThickness', { headPlateThickness: 0 }],
    ['solePlateThickness', { solePlateThickness: -1 }],
    ['nogginThickness', { nogginThickness: 0 }],
    ['nogginSpacing', { nogginSpacing: 0 }],
    ['plankThickness', { plankThickness: -1 }]
  ])('rejects non-positive %s', (_, update) => {
    expect(() => {
      validateInteriorWallConfig({ ...config, ...update })
    }).toThrow()
  })

  it('allows optional parts to be disabled by clearing their materials', () => {
    expect(() => {
      validateInteriorWallConfig({
        ...config,
        plankMaterial: undefined,
        headPlateMaterial: undefined,
        solePlateMaterial: undefined,
        nogginMaterial: undefined,
        fillMaterial: undefined
      })
    }).not.toThrow()
  })
})
