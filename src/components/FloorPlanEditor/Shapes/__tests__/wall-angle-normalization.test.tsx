import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { WallShape } from '../WallShape'
import type { Wall } from '@/types/model'
import { createWallId, createPointId } from '@/types/ids'
import { createLength, createPoint2D } from '@/types/geometry'

import { useSelectedEntity, useEditorStore, useDragState, useActiveTool } from '@/components/FloorPlanEditor/hooks/useEditorStore'
import { usePoints, useCorners } from '@/model/store'

// Mock the editor store hooks
vi.mock('@/components/FloorPlanEditor/hooks/useEditorStore', () => ({
  useSelectedEntity: vi.fn(),
  useEditorStore: vi.fn(),
  useDragState: vi.fn(),
  useActiveTool: vi.fn()
}))

// Mock the model store hooks
vi.mock('@/model/store', () => ({
  usePoints: vi.fn(),
  useCorners: vi.fn()
}))

describe('WallShape Angle Normalization', () => {
  const mockWall: Wall = {
    id: createWallId(),
    startPointId: createPointId(),
    endPointId: createPointId(),
    heightAtStart: createLength(3000),
    heightAtEnd: createLength(3000),
    thickness: createLength(200),
    type: 'other',
    shape: { points: [] },
    length: createLength(3456) // Match the expected test length
  }

  beforeEach(() => {
    vi.mocked(useSelectedEntity).mockReturnValue(mockWall.id)
    vi.mocked(useEditorStore).mockReturnValue({
      selectEntity: vi.fn(),
      setSelectedEntity: vi.fn(),
      startDrag: vi.fn()
    })
    vi.mocked(useDragState).mockReturnValue({
      isDragging: false,
      dragType: 'pan',
      startPos: createPoint2D(0, 0),
      dragEntityId: undefined
    })
    vi.mocked(useActiveTool).mockReturnValue('select')
    vi.mocked(useCorners).mockReturnValue(new Map())
  })

  it('should render text with correct angle for horizontal wall (left to right)', () => {
    vi.mocked(usePoints).mockReturnValue(new Map([
      [mockWall.startPointId, { id: mockWall.startPointId, position: createPoint2D(0, 0) }],
      [mockWall.endPointId, { id: mockWall.endPointId, position: createPoint2D(1000, 0) }]
    ]))

    const { getByTestId } = render(<WallShape wall={mockWall} />)

    const textElement = getByTestId('text')
    expect(textElement).toBeTruthy()
    expect(textElement.getAttribute('rotation')).toBe('0')
  })

  it('should render text with correct angle for horizontal wall (right to left)', () => {
    vi.mocked(usePoints).mockReturnValue(new Map([
      [mockWall.startPointId, { id: mockWall.startPointId, position: createPoint2D(1000, 0) }],
      [mockWall.endPointId, { id: mockWall.endPointId, position: createPoint2D(0, 0) }]
    ]))

    const { getByTestId } = render(<WallShape wall={mockWall} />)

    const textElement = getByTestId('text')
    const rotation = parseFloat(textElement.getAttribute('rotation') ?? '0')
    expect(rotation).toBeCloseTo(0, 1)
  })

  it('should render text with correct angle for vertical wall (bottom to top)', () => {
    vi.mocked(usePoints).mockReturnValue(new Map([
      [mockWall.startPointId, { id: mockWall.startPointId, position: createPoint2D(0, 0) }],
      [mockWall.endPointId, { id: mockWall.endPointId, position: createPoint2D(0, 1000) }]
    ]))

    const { getByTestId } = render(<WallShape wall={mockWall} />)

    const textElement = getByTestId('text')
    const rotation = parseFloat(textElement.getAttribute('rotation') ?? '0')
    expect(rotation).toBeCloseTo(90, 1)
  })

  it('should render text with correct angle for vertical wall (top to bottom)', () => {
    vi.mocked(usePoints).mockReturnValue(new Map([
      [mockWall.startPointId, { id: mockWall.startPointId, position: createPoint2D(0, 1000) }],
      [mockWall.endPointId, { id: mockWall.endPointId, position: createPoint2D(0, 0) }]
    ]))

    const { getByTestId } = render(<WallShape wall={mockWall} />)

    const textElement = getByTestId('text')
    const rotation = parseFloat(textElement.getAttribute('rotation') ?? '0')
    expect(rotation).toBeCloseTo(-90, 1)
  })

  it('should render text with correct angle for diagonal wall (45 degrees)', () => {
    vi.mocked(usePoints).mockReturnValue(new Map([
      [mockWall.startPointId, { id: mockWall.startPointId, position: createPoint2D(0, 0) }],
      [mockWall.endPointId, { id: mockWall.endPointId, position: createPoint2D(1000, 1000) }]
    ]))

    const { getByTestId } = render(<WallShape wall={mockWall} />)

    const textElement = getByTestId('text')
    const rotation = parseFloat(textElement.getAttribute('rotation') ?? '0')
    expect(rotation).toBeCloseTo(45, 1)
  })

  it('should render text with correct angle for diagonal wall (-45 degrees)', () => {
    vi.mocked(usePoints).mockReturnValue(new Map([
      [mockWall.startPointId, { id: mockWall.startPointId, position: createPoint2D(0, 1000) }],
      [mockWall.endPointId, { id: mockWall.endPointId, position: createPoint2D(1000, 0) }]
    ]))

    const { getByTestId } = render(<WallShape wall={mockWall} />)

    const textElement = getByTestId('text')
    const rotation = parseFloat(textElement.getAttribute('rotation') ?? '0')
    expect(rotation).toBeCloseTo(-45, 1)
  })

  it('should normalize 135 degrees to -45 degrees', () => {
    vi.mocked(usePoints).mockReturnValue(new Map([
      [mockWall.startPointId, { id: mockWall.startPointId, position: createPoint2D(1000, 0) }],
      [mockWall.endPointId, { id: mockWall.endPointId, position: createPoint2D(0, 1000) }]
    ]))

    const { getByTestId } = render(<WallShape wall={mockWall} />)

    const textElement = getByTestId('text')
    const rotation = parseFloat(textElement.getAttribute('rotation') ?? '0')
    expect(rotation).toBeCloseTo(-45, 1)
  })

  it('should normalize -135 degrees to 45 degrees', () => {
    vi.mocked(usePoints).mockReturnValue(new Map([
      [mockWall.startPointId, { id: mockWall.startPointId, position: createPoint2D(1000, 1000) }],
      [mockWall.endPointId, { id: mockWall.endPointId, position: createPoint2D(0, 0) }]
    ]))

    const { getByTestId } = render(<WallShape wall={mockWall} />)

    const textElement = getByTestId('text')
    const rotation = parseFloat(textElement.getAttribute('rotation') ?? '0')
    expect(rotation).toBeCloseTo(45, 1)
  })

  it('should not render text when wall is not selected', () => {
    vi.mocked(useSelectedEntity).mockReturnValue('different-id')
    vi.mocked(usePoints).mockReturnValue(new Map([
      [mockWall.startPointId, { id: mockWall.startPointId, position: createPoint2D(0, 0) }],
      [mockWall.endPointId, { id: mockWall.endPointId, position: createPoint2D(1000, 0) }]
    ]))

    const { queryByTestId } = render(<WallShape wall={mockWall} />)

    // Should not render text when not selected
    expect(queryByTestId('text')).toBeNull()
  })

  it('should display length in meters with 2 decimal places', () => {
    const { getByTestId } = render(<WallShape wall={mockWall} />)

    const textElement = getByTestId('text')
    expect(textElement.textContent).toBe('3.46m')
  })
})
