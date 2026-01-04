import { Theme } from '@radix-ui/themes'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_FLOOR_ASSEMBLY_ID, type StoreyId } from '@/building/model/ids'
import { type Storey, createStoreyLevel } from '@/building/model/model'
import { useActiveStoreyId, useModelActions, useStoreysOrderedByLevel } from '@/building/store'

import { StoreySelector } from './StoreySelector'

// Mock the stores
vi.mock('@/building/store', async importOriginal => {
  const actual = await importOriginal<typeof import('@/building/store')>()
  return {
    ...actual,
    useStoreysOrderedByLevel: vi.fn(),
    useActiveStoreyId: vi.fn(),
    useModelActions: vi.fn(() => ({
      addStorey: vi.fn(),
      setActiveStoreyId: vi.fn()
    }))
  }
})

const mockUseStoreysOrderedByLevel = vi.mocked(useStoreysOrderedByLevel)
const mockUseActiveStoreyId = vi.mocked(useActiveStoreyId)
const mockUseModelActions = vi.mocked(useModelActions)

describe('StoreySelector', () => {
  const mockStoreys: Storey[] = [
    {
      id: 'storey-1' as StoreyId,
      name: 'Ground Floor',
      useDefaultName: true,
      level: createStoreyLevel(0),
      floorHeight: 3000,
      floorAssemblyId: DEFAULT_FLOOR_ASSEMBLY_ID
    },
    {
      id: 'storey-2' as StoreyId,
      name: 'First Floor',
      useDefaultName: false,
      level: createStoreyLevel(1),
      floorHeight: 3000,
      floorAssemblyId: DEFAULT_FLOOR_ASSEMBLY_ID
    }
  ]

  const mockSetActiveStorey = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock the storeys hook
    mockUseStoreysOrderedByLevel.mockReturnValue(mockStoreys)

    // Mock the active storey hook
    mockUseActiveStoreyId.mockReturnValue('storey-1' as StoreyId)

    // Mock the model actions hook
    mockUseModelActions.mockReturnValue({
      setActiveStoreyId: mockSetActiveStorey,
      addStorey: vi.fn()
    } as any)
  })

  it('renders storey selector with floors', () => {
    render(
      <Theme>
        <StoreySelector />
      </Theme>
    )

    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByText('L0')).toBeInTheDocument()
    expect(screen.getByText('storeys.groundFloor')).toBeInTheDocument()
  })

  it('calls setActiveStoreyId when selection changes', () => {
    // Mock scrollIntoView for Radix UI Select
    Element.prototype.scrollIntoView = vi.fn()

    render(
      <Theme>
        <StoreySelector />
      </Theme>
    )

    const select = screen.getByRole('combobox')
    fireEvent.click(select)

    // Find and click the option for First Floor (look for the floor name)
    const option = screen.getByText('First Floor')
    fireEvent.click(option)

    expect(mockSetActiveStorey).toHaveBeenCalledWith('storey-2')
  })
})
