import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PerimeterId, PerimeterWallId, RoofId, StoreyId } from '@/building/model/ids'
import type { ConstructionElementId } from '@/construction/elements'
import type { MaterialId } from '@/construction/materials/material'
import { newVec3 } from '@/shared/geometry'

import { useAggregatedParts, useMaterialParts, useVirtualParts } from './hooks'
import { usePartsStore } from './store'
import type { PartDefinition, PartId, PartOccurrence } from './types'

vi.mock('@/construction/store', () => ({
  ensureConstructionLoaded: vi.fn(),
  getConstructionModel: vi.fn()
}))

vi.mock('@/construction/store/store', () => ({
  useConstructionStore: {
    getState: vi.fn(() => ({ generatedAt: 0 })),
    subscribe: vi.fn()
  }
}))

vi.mock('./store', async importOriginal => {
  const actual = await importOriginal<typeof import('./store')>()
  return {
    ...actual,
    ensurePartsLoaded: vi.fn()
  }
})

const createPartId = (id: string): PartId => id as PartId
const createMaterialId = (id: string): MaterialId => id as MaterialId
const createElementId = (id: string): ConstructionElementId => id as ConstructionElementId
const createStoreyId = (id: string): StoreyId => `storey_${id}`
const createPerimeterId = (id: string): PerimeterId => `perimeter_${id}`
const createPerimeterWallId = (id: string): PerimeterWallId => `outwall_${id}`
const createRoofId = (id: string): RoofId => `roof_${id}`

const createOccurrence = (partial: Partial<PartOccurrence>): PartOccurrence => ({
  elementId: createElementId('e-default'),
  partId: createPartId('p-default'),
  virtual: false,
  ...partial
})

const createDefinition = (partId: PartId, overrides: Partial<PartDefinition> = {}): PartDefinition => ({
  partId,
  source: 'element',
  materialId: createMaterialId('mat1'),
  type: 'post',
  size: newVec3(100, 100, 100),
  volume: 1000000,
  ...overrides
})

describe('useAggregatedParts', () => {
  beforeEach(() => {
    usePartsStore.setState({
      definitions: {},
      occurrences: [],
      labels: {},
      usedLabelsByGroup: {},
      nextLabelIndexByGroup: {},
      hasParts: true,
      generatedAt: 1
    })
  })

  it('returns empty array when no parts', () => {
    const { result } = renderHook(() => useAggregatedParts())

    expect(result.current).toEqual([])
  })

  it('aggregates occurrences by partId', () => {
    const partA = createPartId('part-a')
    const partB = createPartId('part-b')

    usePartsStore.setState({
      definitions: {
        [partA]: createDefinition(partA, { volume: 1000 }),
        [partB]: createDefinition(partB, { volume: 2000 })
      },
      occurrences: [
        createOccurrence({ partId: partA, elementId: createElementId('e1') }),
        createOccurrence({ partId: partA, elementId: createElementId('e2') }),
        createOccurrence({ partId: partB, elementId: createElementId('e3') })
      ],
      labels: { [partA]: 'A', [partB]: 'B' },
      hasParts: true,
      generatedAt: 1
    })

    const { result } = renderHook(() => useAggregatedParts())

    expect(result.current).toHaveLength(2)

    const partAItem = result.current.find(p => p.partId === partA)
    const partBItem = result.current.find(p => p.partId === partB)

    expect(partAItem?.quantity).toBe(2)
    expect(partAItem?.label).toBe('A')
    expect(partAItem?.totalVolume).toBe(2000)
    expect(partAItem?.elementIds).toHaveLength(2)

    expect(partBItem?.quantity).toBe(1)
    expect(partBItem?.label).toBe('B')
    expect(partBItem?.totalVolume).toBe(2000)
  })

  it('filters by storeyId', () => {
    const partA = createPartId('part-a')
    const storey1 = createStoreyId('1')
    const storey2 = createStoreyId('2')

    usePartsStore.setState({
      definitions: {
        [partA]: createDefinition(partA)
      },
      occurrences: [
        createOccurrence({ partId: partA, storeyId: storey1, elementId: createElementId('e1') }),
        createOccurrence({ partId: partA, storeyId: storey2, elementId: createElementId('e2') })
      ],
      labels: { [partA]: 'A' },
      hasParts: true,
      generatedAt: 1
    })

    const { result } = renderHook(() => useAggregatedParts(storey1))

    expect(result.current).toHaveLength(1)
    expect(result.current[0].quantity).toBe(1)
    expect(result.current[0].elementIds).toEqual([createElementId('e1')])
  })

  it('filters by perimeterId', () => {
    const partA = createPartId('part-a')
    const perimeter1 = createPerimeterId('1')
    const perimeter2 = createPerimeterId('2')

    usePartsStore.setState({
      definitions: {
        [partA]: createDefinition(partA)
      },
      occurrences: [
        createOccurrence({ partId: partA, perimeterId: perimeter1, elementId: createElementId('e1') }),
        createOccurrence({ partId: partA, perimeterId: perimeter2, elementId: createElementId('e2') })
      ],
      labels: { [partA]: 'A' },
      hasParts: true,
      generatedAt: 1
    })

    const { result } = renderHook(() => useAggregatedParts(perimeter1))

    expect(result.current).toHaveLength(1)
    expect(result.current[0].quantity).toBe(1)
  })

  it('filters by perimeterWallId', () => {
    const partA = createPartId('part-a')
    const wall1 = createPerimeterWallId('1')
    const wall2 = createPerimeterWallId('2')

    usePartsStore.setState({
      definitions: {
        [partA]: createDefinition(partA)
      },
      occurrences: [
        createOccurrence({ partId: partA, wallId: wall1, elementId: createElementId('e1') }),
        createOccurrence({ partId: partA, wallId: wall2, elementId: createElementId('e2') })
      ],
      labels: { [partA]: 'A' },
      hasParts: true,
      generatedAt: 1
    })

    const { result } = renderHook(() => useAggregatedParts(wall1))

    expect(result.current).toHaveLength(1)
  })

  it('filters by roofId', () => {
    const partA = createPartId('part-a')
    const roof1 = createRoofId('1')
    const roof2 = createRoofId('2')

    usePartsStore.setState({
      definitions: {
        [partA]: createDefinition(partA)
      },
      occurrences: [
        createOccurrence({ partId: partA, roofId: roof1, elementId: createElementId('e1') }),
        createOccurrence({ partId: partA, roofId: roof2, elementId: createElementId('e2') })
      ],
      labels: { [partA]: 'A' },
      hasParts: true,
      generatedAt: 1
    })

    const { result } = renderHook(() => useAggregatedParts(roof1))

    expect(result.current).toHaveLength(1)
  })

  it('filters by virtual flag', () => {
    const partA = createPartId('part-a')
    const partB = createPartId('part-b')

    usePartsStore.setState({
      definitions: {
        [partA]: createDefinition(partA),
        [partB]: createDefinition(partB)
      },
      occurrences: [
        createOccurrence({ partId: partA, virtual: false, elementId: createElementId('e1') }),
        createOccurrence({ partId: partB, virtual: true, elementId: createElementId('e2') })
      ],
      labels: { [partA]: 'A', [partB]: 'B' },
      hasParts: true,
      generatedAt: 1
    })

    const { result: materialResult } = renderHook(() => useAggregatedParts(undefined, { virtual: false }))
    const { result: virtualResult } = renderHook(() => useAggregatedParts(undefined, { virtual: true }))

    expect(materialResult.current).toHaveLength(1)
    expect(materialResult.current[0].partId).toBe(partA)

    expect(virtualResult.current).toHaveLength(1)
    expect(virtualResult.current[0].partId).toBe(partB)
  })

  it('computes totalArea when area is defined', () => {
    const partA = createPartId('part-a')

    usePartsStore.setState({
      definitions: {
        [partA]: createDefinition(partA, { volume: 1000, area: 100 })
      },
      occurrences: [
        createOccurrence({ partId: partA, elementId: createElementId('e1') }),
        createOccurrence({ partId: partA, elementId: createElementId('e2') })
      ],
      labels: { [partA]: 'A' },
      hasParts: true,
      generatedAt: 1
    })

    const { result } = renderHook(() => useAggregatedParts())

    expect(result.current[0].totalArea).toBe(200)
  })

  it('computes totalLength when length is defined', () => {
    const partA = createPartId('part-a')

    usePartsStore.setState({
      definitions: {
        [partA]: createDefinition(partA, { volume: 1000, length: 500 })
      },
      occurrences: [
        createOccurrence({ partId: partA, elementId: createElementId('e1') }),
        createOccurrence({ partId: partA, elementId: createElementId('e2') }),
        createOccurrence({ partId: partA, elementId: createElementId('e3') })
      ],
      labels: { [partA]: 'A' },
      hasParts: true,
      generatedAt: 1
    })

    const { result } = renderHook(() => useAggregatedParts())

    expect(result.current[0].totalLength).toBe(1500)
  })

  it('uses empty string for missing label', () => {
    const partA = createPartId('part-a')

    usePartsStore.setState({
      definitions: {
        [partA]: createDefinition(partA)
      },
      occurrences: [createOccurrence({ partId: partA })],
      labels: {},
      hasParts: true,
      generatedAt: 1
    })

    const { result } = renderHook(() => useAggregatedParts())

    expect(result.current[0].label).toBe('')
  })

  it('updates when store changes', () => {
    const partA = createPartId('part-a')
    const partB = createPartId('part-b')

    usePartsStore.setState({
      definitions: {
        [partA]: createDefinition(partA)
      },
      occurrences: [createOccurrence({ partId: partA })],
      labels: { [partA]: 'A' },
      hasParts: true,
      generatedAt: 1
    })

    const { result, rerender } = renderHook(() => useAggregatedParts())

    expect(result.current).toHaveLength(1)

    act(() => {
      usePartsStore.setState({
        definitions: {
          [partA]: createDefinition(partA),
          [partB]: createDefinition(partB)
        },
        occurrences: [createOccurrence({ partId: partA }), createOccurrence({ partId: partB })],
        labels: { [partA]: 'A', [partB]: 'B' },
        generatedAt: 2
      })
    })

    rerender()

    expect(result.current).toHaveLength(2)
  })
})

describe('useMaterialParts', () => {
  beforeEach(() => {
    usePartsStore.setState({
      definitions: {},
      occurrences: [],
      labels: {},
      usedLabelsByGroup: {},
      nextLabelIndexByGroup: {},
      hasParts: true,
      generatedAt: 1
    })
  })

  it('returns only non-virtual parts', () => {
    const partA = createPartId('part-a')
    const partB = createPartId('part-b')

    usePartsStore.setState({
      definitions: {
        [partA]: createDefinition(partA),
        [partB]: createDefinition(partB)
      },
      occurrences: [
        createOccurrence({ partId: partA, virtual: false }),
        createOccurrence({ partId: partB, virtual: true })
      ],
      labels: { [partA]: 'A', [partB]: 'B' },
      hasParts: true,
      generatedAt: 1
    })

    const { result } = renderHook(() => useMaterialParts())

    expect(result.current).toHaveLength(1)
    expect(result.current[0].partId).toBe(partA)
  })

  it('returns empty when only virtual parts exist', () => {
    const partA = createPartId('part-a')

    usePartsStore.setState({
      definitions: {
        [partA]: createDefinition(partA)
      },
      occurrences: [createOccurrence({ partId: partA, virtual: true })],
      labels: { [partA]: 'A' },
      hasParts: true,
      generatedAt: 1
    })

    const { result } = renderHook(() => useMaterialParts())

    expect(result.current).toHaveLength(0)
  })
})

describe('useVirtualParts', () => {
  beforeEach(() => {
    usePartsStore.setState({
      definitions: {},
      occurrences: [],
      labels: {},
      usedLabelsByGroup: {},
      nextLabelIndexByGroup: {},
      hasParts: true,
      generatedAt: 1
    })
  })

  it('returns only virtual parts', () => {
    const partA = createPartId('part-a')
    const partB = createPartId('part-b')

    usePartsStore.setState({
      definitions: {
        [partA]: createDefinition(partA),
        [partB]: createDefinition(partB)
      },
      occurrences: [
        createOccurrence({ partId: partA, virtual: false }),
        createOccurrence({ partId: partB, virtual: true })
      ],
      labels: { [partA]: 'A', [partB]: 'B' },
      hasParts: true,
      generatedAt: 1
    })

    const { result } = renderHook(() => useVirtualParts())

    expect(result.current).toHaveLength(1)
    expect(result.current[0].partId).toBe(partB)
  })

  it('returns empty when only material parts exist', () => {
    const partA = createPartId('part-a')

    usePartsStore.setState({
      definitions: {
        [partA]: createDefinition(partA)
      },
      occurrences: [createOccurrence({ partId: partA, virtual: false })],
      labels: { [partA]: 'A' },
      hasParts: true,
      generatedAt: 1
    })

    const { result } = renderHook(() => useVirtualParts())

    expect(result.current).toHaveLength(0)
  })
})
