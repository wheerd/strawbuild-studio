import { render, screen } from '@testing-library/react'
import { vec3 } from 'gl-matrix'
import { vi } from 'vitest'

import { createPerimeterId } from '@/building/model/ids'

import { RingBeamConstructionPlanModal } from './RingBeamConstructionPlan'

// Mock the zustand stores
vi.mock('@/building/store', () => ({
  usePerimeterById: vi.fn(() => null)
}))

vi.mock('@/construction/config/store', () => ({
  useConfigActions: vi.fn(() => ({
    getRingBeamConstructionMethodById: vi.fn(() => null)
  }))
}))

// Mock construction functions
vi.mock('@/construction/walls', () => ({
  constructRingBeam: vi.fn(),
  getElementSize: vi.fn(() => vec3.fromValues(1000, 100, 60))
}))

describe('RingBeamConstructionModal', () => {
  const mockPerimeterId = createPerimeterId()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the trigger button', () => {
    render(<RingBeamConstructionPlanModal perimeterId={mockPerimeterId} trigger={<button>Test Trigger</button>} />)

    expect(screen.getByText('Test Trigger')).toBeInTheDocument()
  })
})
