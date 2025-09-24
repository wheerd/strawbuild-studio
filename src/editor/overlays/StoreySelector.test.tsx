import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StoreySelector } from './StoreySelector'
import { useStoreysOrderedByLevel, useActiveStoreyId, useModelActions } from '@/building/store'
import { createStoreyLevel } from '@/shared/types/model'
import { createLength } from '@/shared/geometry'
import type { StoreyId } from '@/shared/types/ids'
import { Theme } from '@radix-ui/themes'

// Mock the stores
vi.mock('@/building/store', async importOriginal => {
  const actual = await importOriginal<typeof import('@/building/store')>()
  return {
    ...actual,
    useStoreysOrderedByLevel: vi.fn(),
    useActiveStoreyId: vi.fn(),
    useModelActions: vi.fn(() => ({
      addStorey: vi.fn(),
      setActiveStorey: vi.fn()
    }))
  }
})

const mockUseStoreysOrderedByLevel = vi.mocked(useStoreysOrderedByLevel)
const mockUseActiveStoreyId = vi.mocked(useActiveStoreyId)
const mockUseModelActions = vi.mocked(useModelActions)

describe('StoreySelector', () => {
  const mockStoreys = [
    {
      id: 'storey-1' as StoreyId,
      name: 'Ground Floor',
      level: createStoreyLevel(0),
      height: createLength(3000)
    },
    {
      id: 'storey-2' as StoreyId,
      name: 'First Floor',
      level: createStoreyLevel(1),
      height: createLength(3000)
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
      setActiveStorey: mockSetActiveStorey,
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
    expect(screen.getByText('Ground Floor')).toBeInTheDocument()
  })

  it('renders edit button', () => {
    render(
      <Theme>
        <StoreySelector />
      </Theme>
    )

    const editButton = screen.getByRole('button', { name: /manage floors/i })
    expect(editButton).toBeInTheDocument()
  })

  it('calls setActiveStorey when selection changes', () => {
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
