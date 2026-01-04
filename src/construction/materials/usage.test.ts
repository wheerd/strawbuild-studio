import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createRingBeamAssemblyId, createWallAssemblyId } from '@/building/model/ids'
import type { RingBeamAssemblyConfig, WallAssemblyConfig } from '@/construction/config/types'

import { createMaterialId, roughWood, strawbale, woodwool } from './material'
import { useMaterialUsage } from './usage'

const defaultStrawMaterialId = strawbale.id

// Mock the store hooks
const mockUseRingBeamAssemblies: any = vi.fn(() => [])
const mockUseWallAssemblies: any = vi.fn(() => [])
const mockUseFloorAssemblies: any = vi.fn(() => [])
const mockUseRoofAssemblies: any = vi.fn(() => [])
const mockUseOpeningAssemblies: any = vi.fn(() => [])
const mockUseDefaultStrawMaterialId: any = vi.fn(() => defaultStrawMaterialId)
const mockUsePerimeters: any = vi.fn(() => [])

vi.mock('@/construction/config/store', () => ({
  useRingBeamAssemblies: () => mockUseRingBeamAssemblies(),
  useWallAssemblies: () => mockUseWallAssemblies(),
  useFloorAssemblies: () => mockUseFloorAssemblies(),
  useRoofAssemblies: () => mockUseRoofAssemblies(),
  useOpeningAssemblies: () => mockUseOpeningAssemblies(),
  useDefaultStrawMaterialId: () => mockUseDefaultStrawMaterialId()
}))

vi.mock('@/building/store', () => ({
  usePerimeters: () => mockUsePerimeters()
}))

describe('Material Usage Detection', () => {
  describe('useMaterialUsage', () => {
    beforeEach(() => {
      // Reset all mocks to return empty arrays
      mockUseRingBeamAssemblies.mockReturnValue([])
      mockUseWallAssemblies.mockReturnValue([])
      mockUseFloorAssemblies.mockReturnValue([])
      mockUseRoofAssemblies.mockReturnValue([])
      mockUseOpeningAssemblies.mockReturnValue([])
      mockUseDefaultStrawMaterialId.mockReturnValue(defaultStrawMaterialId)
      mockUsePerimeters.mockReturnValue([])
    })

    it('detects material not in use', () => {
      const { result } = renderHook(() => useMaterialUsage(roughWood.id))

      expect(result.current.isUsed).toBe(false)
      expect(result.current.isDefaultStraw).toBe(false)
      expect(result.current.assemblyIds).toEqual([])
      expect(result.current.usedInWallPosts).toBe(false)
    })

    it('detects default straw material usage', () => {
      const { result } = renderHook(() => useMaterialUsage(defaultStrawMaterialId))

      expect(result.current.isUsed).toBe(true)
      expect(result.current.isDefaultStraw).toBe(true)
      expect(result.current.assemblyIds).toEqual([])
      expect(result.current.usedInWallPosts).toBe(false)
    })

    it('detects ring beam material usage', () => {
      const ringBeamAssembly: RingBeamAssemblyConfig = {
        id: createRingBeamAssemblyId(),
        name: 'Test Ring Beam',
        type: 'full',
        material: roughWood.id,
        height: 60,
        width: 360,
        offsetFromEdge: 30
      }

      mockUseRingBeamAssemblies.mockReturnValue([ringBeamAssembly])

      const { result } = renderHook(() => useMaterialUsage(roughWood.id))

      expect(result.current.isUsed).toBe(true)
      expect(result.current.isDefaultStraw).toBe(false)
      expect(result.current.assemblyIds).toEqual([ringBeamAssembly.id])
      expect(result.current.usedInWallPosts).toBe(false)
    })

    it('detects wall assembly post materials', () => {
      const wallAssembly: WallAssemblyConfig = {
        id: createWallAssemblyId(),
        name: 'Test Infill',
        type: 'infill',
        maxPostSpacing: 900,
        desiredPostSpacing: 800,
        minStrawSpace: 70,
        posts: {
          type: 'double',
          width: 60,
          thickness: 120,
          material: roughWood.id,
          infillMaterial: strawbale.id
        },
        layers: {
          insideThickness: 30,
          insideLayers: [],
          outsideThickness: 50,
          outsideLayers: []
        }
      }

      mockUseWallAssemblies.mockReturnValue([wallAssembly])

      const { result } = renderHook(() => useMaterialUsage(roughWood.id))

      expect(result.current.isUsed).toBe(true)
      expect(result.current.isDefaultStraw).toBe(false)
      expect(result.current.assemblyIds).toEqual([wallAssembly.id])
      expect(result.current.usedInWallPosts).toBe(false) // No actual posts in building model
    })

    it('detects strawhenge module usage', () => {
      const wallAssembly: WallAssemblyConfig = {
        id: createWallAssemblyId(),
        name: 'Test Strawhenge',
        type: 'strawhenge',
        module: {
          minWidth: 920,
          maxWidth: 920,
          type: 'single',
          frameThickness: 60,
          frameMaterial: roughWood.id,
          strawMaterial: strawbale.id
        },
        infill: {
          maxPostSpacing: 900,
          desiredPostSpacing: 800,
          minStrawSpace: 70,
          posts: {
            type: 'full',
            width: 60,
            material: roughWood.id
          }
        },
        layers: {
          insideThickness: 30,
          insideLayers: [],
          outsideThickness: 50,
          outsideLayers: []
        }
      }

      mockUseWallAssemblies.mockReturnValue([wallAssembly])

      const { result } = renderHook(() => useMaterialUsage(roughWood.id))

      expect(result.current.isUsed).toBe(true)
      expect(result.current.isDefaultStraw).toBe(false)
      expect(result.current.assemblyIds).toEqual([wallAssembly.id])
      expect(result.current.usedInWallPosts).toBe(false) // No actual posts in building model
    })

    it('detects spacer and infill materials in double modules', () => {
      const spacerMaterialId = createMaterialId()
      const wallAssembly: WallAssemblyConfig = {
        id: createWallAssemblyId(),
        name: 'Double Module Wall',
        type: 'strawhenge',
        module: {
          minWidth: 920,
          maxWidth: 920,
          type: 'double',
          frameThickness: 60,
          frameWidth: 120,
          frameMaterial: roughWood.id,
          strawMaterial: strawbale.id,
          spacerSize: 120,
          spacerCount: 3,
          spacerMaterial: spacerMaterialId,
          infillMaterial: woodwool.id
        },
        infill: {
          maxPostSpacing: 900,
          desiredPostSpacing: 800,
          minStrawSpace: 70,
          posts: {
            type: 'full',
            width: 60,
            material: roughWood.id
          }
        },
        layers: {
          insideThickness: 30,
          insideLayers: [],
          outsideThickness: 50,
          outsideLayers: []
        }
      }

      mockUseWallAssemblies.mockReturnValue([wallAssembly])

      const { result: spacerResult } = renderHook(() => useMaterialUsage(spacerMaterialId))
      expect(spacerResult.current.isUsed).toBe(true)
      expect(spacerResult.current.isDefaultStraw).toBe(false)
      expect(spacerResult.current.assemblyIds).toEqual([wallAssembly.id])
      expect(spacerResult.current.usedInWallPosts).toBe(false)

      const { result: infillResult } = renderHook(() => useMaterialUsage(woodwool.id))
      expect(infillResult.current.isUsed).toBe(true)
      expect(infillResult.current.isDefaultStraw).toBe(false)
      expect(infillResult.current.assemblyIds).toEqual([wallAssembly.id])
      expect(infillResult.current.usedInWallPosts).toBe(false)
    })

    it('detects materials used across multiple configs', () => {
      const ringBeamAssembly: RingBeamAssemblyConfig = {
        id: createRingBeamAssemblyId(),
        name: 'Test Ring Beam',
        type: 'full',
        material: roughWood.id,
        height: 60,
        width: 360,
        offsetFromEdge: 30
      }

      const wallAssembly: WallAssemblyConfig = {
        id: createWallAssemblyId(),
        name: 'Test Infill',
        type: 'infill',
        maxPostSpacing: 900,
        desiredPostSpacing: 800,
        minStrawSpace: 70,
        posts: {
          type: 'full',
          width: 60,
          material: roughWood.id
        },
        layers: {
          insideThickness: 30,
          insideLayers: [],
          outsideThickness: 50,
          outsideLayers: []
        }
      }

      mockUseRingBeamAssemblies.mockReturnValue([ringBeamAssembly])
      mockUseWallAssemblies.mockReturnValue([wallAssembly])

      const { result } = renderHook(() => useMaterialUsage(roughWood.id))

      expect(result.current.isUsed).toBe(true)
      expect(result.current.isDefaultStraw).toBe(false)
      expect(result.current.assemblyIds).toHaveLength(2)
      expect(result.current.assemblyIds).toContain(ringBeamAssembly.id)
      expect(result.current.assemblyIds).toContain(wallAssembly.id)
      expect(result.current.usedInWallPosts).toBe(false) // No actual posts in building model
    })
  })
})
