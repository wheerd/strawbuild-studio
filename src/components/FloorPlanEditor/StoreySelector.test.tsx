import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StoreySelector } from './StoreySelector'
import { useModelStore } from '@/model/store'
import { useEditorStore } from './hooks/useEditorStore'
import { createStoreyLevel } from '@/types/model'
import type { StoreyId } from '@/types/ids'

// Mock the stores
vi.mock('@/model/store')
vi.mock('./hooks/useEditorStore')

const mockUseModelStore = vi.mocked(useModelStore)
const mockUseEditorStore = vi.mocked(useEditorStore)

describe('StoreySelector', () => {
  const mockStoreys = [
    {
      id: 'storey-1' as StoreyId,
      name: 'Ground Floor',
      level: createStoreyLevel(0),
      height: 3000
    },
    {
      id: 'storey-2' as StoreyId,
      name: 'First Floor',
      level: createStoreyLevel(1),
      height: 3000
    }
  ]

  const mockSetActiveStorey = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock the selector-style calls
    mockUseModelStore.mockImplementation((selector: any) => {
      const mockState = {
        getStoreysOrderedByLevel: () => mockStoreys
      }
      return selector(mockState)
    })

    mockUseEditorStore.mockImplementation((selector: any) => {
      const mockState = {
        activeStoreyId: 'storey-1' as StoreyId,
        setActiveStorey: mockSetActiveStorey
      }
      return selector(mockState)
    })
  })

  it('renders storey selector with floors', () => {
    render(<StoreySelector />)

    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByText('L0')).toBeInTheDocument()
    expect(screen.getByText('Ground Floor')).toBeInTheDocument()
  })

  it('renders edit button', () => {
    render(<StoreySelector />)

    const editButton = screen.getByRole('button', { name: /manage floors/i })
    expect(editButton).toBeInTheDocument()
  })

  it('calls setActiveStorey when selection changes', () => {
    // Mock scrollIntoView for Radix UI Select
    Element.prototype.scrollIntoView = vi.fn()

    render(<StoreySelector />)

    const select = screen.getByRole('combobox')
    fireEvent.click(select)

    // Find and click the option for First Floor (look for the floor name)
    const option = screen.getByText('First Floor')
    fireEvent.click(option)

    expect(mockSetActiveStorey).toHaveBeenCalledWith('storey-2')
  })

  it('does not render when no storeys exist', () => {
    mockUseModelStore.mockImplementation((selector: any) => {
      const mockState = {
        getStoreysOrderedByLevel: () => []
      }
      return selector(mockState)
    })

    const { container } = render(<StoreySelector />)

    expect(container.firstChild).toBeNull()
  })
})
