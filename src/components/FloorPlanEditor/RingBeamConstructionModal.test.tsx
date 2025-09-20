import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { RingBeamConstructionModal } from './RingBeamConstructionModal'
import { createPerimeterId } from '@/types/ids'

// Mock the zustand stores
vi.mock('@/model/store', () => ({
  useModelStore: vi.fn(() => ({
    perimeters: new Map()
  }))
}))

vi.mock('@/config/store', () => ({
  useConfigStore: vi.fn(() => ({
    getRingBeamConstructionMethodById: vi.fn(() => null)
  }))
}))

// Mock construction functions
vi.mock('@/construction', () => ({
  constructRingBeam: vi.fn(),
  resolveDefaultMaterial: vi.fn(),
  getElementSize: vi.fn(() => [1000, 100, 60])
}))

describe('RingBeamConstructionModal', () => {
  const mockPerimeterId = createPerimeterId()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the trigger button', () => {
    render(
      <RingBeamConstructionModal
        perimeterId={mockPerimeterId}
        position="base"
        trigger={<button>Test Trigger</button>}
      />
    )

    expect(screen.getByText('Test Trigger')).toBeInTheDocument()
  })

  it('renders modal with base position initially', () => {
    render(
      <RingBeamConstructionModal
        perimeterId={mockPerimeterId}
        position="base"
        trigger={<button>Test Trigger</button>}
      />
    )

    // The modal should render the trigger
    expect(screen.getByText('Test Trigger')).toBeInTheDocument()
  })

  it('handles missing perimeter gracefully', () => {
    // This test ensures the component doesn't crash when perimeter is not found
    render(
      <RingBeamConstructionModal perimeterId={mockPerimeterId} position="top" trigger={<button>Test Trigger</button>} />
    )

    expect(screen.getByText('Test Trigger')).toBeInTheDocument()
  })
})
