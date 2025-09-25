import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

import { createPerimeterId } from '@/building/model/ids'

import { RingBeamConstructionModal } from './RingBeamConstructionModal'

// Mock the zustand stores
vi.mock('@/building/store', () => ({
  usePerimeterById: vi.fn(() => null)
}))

vi.mock('@/construction/config/store', () => ({
  useConfigStore: vi.fn(() => ({
    getRingBeamConstructionMethodById: vi.fn(() => null)
  }))
}))

// Mock construction functions
vi.mock('@/construction/walls', () => ({
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
