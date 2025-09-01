import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { WallShape } from './WallShape'
import type { Wall, Point } from '@/types/model'
import type { PointId } from '@/types/ids'
import type { Vec2 } from '@/types/geometry'
import { createWallId, createPointId, createFloorId } from '@/types/ids'
import { createLength, createVec2 } from '@/types/geometry'

import {
  useSelectedEntity,
  useEditorStore,
  useDragState,
  useActiveTool
} from '@/components/FloorPlanEditor/hooks/useEditorStore'
import { usePoints, useCorners, useWallLength } from '@/model/store'

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
  useCorners: vi.fn(),
  useWallLength: vi.fn()
}))

describe('WallShape Angle Normalization', () => {
  const testFloorId = createFloorId()
  const mockWall: Wall = {
    id: createWallId(),
    floorId: testFloorId,
    startPointId: createPointId(),
    endPointId: createPointId(),
    thickness: createLength(200),
    type: 'other'
  }

  const createMockPoint = (id: PointId, position: Vec2): Point => ({
    id,
    floorId: testFloorId,
    position,
    roomIds: new Set()
  })

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
      startPos: createVec2(0, 0),
      dragEntityId: undefined
    })
    vi.mocked(useActiveTool).mockReturnValue('select')
    vi.mocked(useCorners).mockReturnValue(new Map())
    vi.mocked(useWallLength).mockReturnValue(() => createLength(3456)) // Returns length in mm for 3.46m
  })

  it('should render text with correct angle for horizontal wall (left to right)', () => {
    vi.mocked(usePoints).mockReturnValue(
      new Map([
        [mockWall.startPointId, createMockPoint(mockWall.startPointId, createVec2(0, 0))],
        [mockWall.endPointId, createMockPoint(mockWall.endPointId, createVec2(1000, 0))]
      ])
    )

    const { getByTestId } = render(<WallShape wall={mockWall} />)

    const textElement = getByTestId('text')
    expect(textElement).toBeTruthy()
    expect(textElement.getAttribute('data-rotation')).toBe('0')
  })

  it('should render text with correct angle for horizontal wall (right to left)', () => {
    vi.mocked(usePoints).mockReturnValue(
      new Map([
        [mockWall.startPointId, createMockPoint(mockWall.startPointId, createVec2(1000, 0))],
        [mockWall.endPointId, createMockPoint(mockWall.endPointId, createVec2(0, 0))]
      ])
    )

    const { getByTestId } = render(<WallShape wall={mockWall} />)

    const textElement = getByTestId('text')
    const rotation = parseFloat(textElement.getAttribute('data-rotation') ?? '0')
    expect(rotation).toBeCloseTo(0, 1)
  })

  it('should render text with correct angle for vertical wall (bottom to top)', () => {
    vi.mocked(usePoints).mockReturnValue(
      new Map([
        [mockWall.startPointId, createMockPoint(mockWall.startPointId, createVec2(0, 0))],
        [mockWall.endPointId, createMockPoint(mockWall.endPointId, createVec2(0, 1000))]
      ])
    )

    const { getByTestId } = render(<WallShape wall={mockWall} />)

    const textElement = getByTestId('text')
    const rotation = parseFloat(textElement.getAttribute('data-rotation') ?? '0')
    expect(rotation).toBeCloseTo(90, 1)
  })

  it('should render text with correct angle for vertical wall (top to bottom)', () => {
    vi.mocked(usePoints).mockReturnValue(
      new Map([
        [mockWall.startPointId, createMockPoint(mockWall.startPointId, createVec2(0, 1000))],
        [mockWall.endPointId, createMockPoint(mockWall.endPointId, createVec2(0, 0))]
      ])
    )

    const { getByTestId } = render(<WallShape wall={mockWall} />)

    const textElement = getByTestId('text')
    const rotation = parseFloat(textElement.getAttribute('data-rotation') ?? '0')
    expect(rotation).toBeCloseTo(-90, 1)
  })

  it('should render text with correct angle for diagonal wall (45 degrees)', () => {
    vi.mocked(usePoints).mockReturnValue(
      new Map([
        [mockWall.startPointId, createMockPoint(mockWall.startPointId, createVec2(0, 0))],
        [mockWall.endPointId, createMockPoint(mockWall.endPointId, createVec2(1000, 1000))]
      ])
    )

    const { getByTestId } = render(<WallShape wall={mockWall} />)

    const textElement = getByTestId('text')
    const rotation = parseFloat(textElement.getAttribute('data-rotation') ?? '0')
    expect(rotation).toBeCloseTo(45, 1)
  })

  it('should render text with correct angle for diagonal wall (-45 degrees)', () => {
    vi.mocked(usePoints).mockReturnValue(
      new Map([
        [mockWall.startPointId, createMockPoint(mockWall.startPointId, createVec2(0, 1000))],
        [mockWall.endPointId, createMockPoint(mockWall.endPointId, createVec2(1000, 0))]
      ])
    )

    const { getByTestId } = render(<WallShape wall={mockWall} />)

    const textElement = getByTestId('text')
    const rotation = parseFloat(textElement.getAttribute('data-rotation') ?? '0')
    expect(rotation).toBeCloseTo(-45, 1)
  })

  it('should normalize 135 degrees to -45 degrees', () => {
    vi.mocked(usePoints).mockReturnValue(
      new Map([
        [mockWall.startPointId, createMockPoint(mockWall.startPointId, createVec2(1000, 0))],
        [mockWall.endPointId, createMockPoint(mockWall.endPointId, createVec2(0, 1000))]
      ])
    )

    const { getByTestId } = render(<WallShape wall={mockWall} />)

    const textElement = getByTestId('text')
    const rotation = parseFloat(textElement.getAttribute('data-rotation') ?? '0')
    expect(rotation).toBeCloseTo(-45, 1)
  })

  it('should normalize -135 degrees to 45 degrees', () => {
    vi.mocked(usePoints).mockReturnValue(
      new Map([
        [mockWall.startPointId, createMockPoint(mockWall.startPointId, createVec2(1000, 1000))],
        [mockWall.endPointId, createMockPoint(mockWall.endPointId, createVec2(0, 0))]
      ])
    )

    const { getByTestId } = render(<WallShape wall={mockWall} />)

    const textElement = getByTestId('text')
    const rotation = parseFloat(textElement.getAttribute('data-rotation') ?? '0')
    expect(rotation).toBeCloseTo(45, 1)
  })

  it('should not render text when wall is not selected', () => {
    vi.mocked(useSelectedEntity).mockReturnValue('different-id')
    vi.mocked(usePoints).mockReturnValue(
      new Map([
        [mockWall.startPointId, createMockPoint(mockWall.startPointId, createVec2(0, 0))],
        [mockWall.endPointId, createMockPoint(mockWall.endPointId, createVec2(1000, 0))]
      ])
    )

    const { queryByTestId } = render(<WallShape wall={mockWall} />)

    // Should not render text when not selected
    expect(queryByTestId('text')).toBeNull()
  })

  it('should display length in meters with 2 decimal places', () => {
    vi.mocked(usePoints).mockReturnValue(
      new Map([
        [mockWall.startPointId, createMockPoint(mockWall.startPointId, createVec2(0, 0))],
        [mockWall.endPointId, createMockPoint(mockWall.endPointId, createVec2(1000, 0))]
      ])
    )

    const { getByTestId } = render(<WallShape wall={mockWall} />)

    const textElement = getByTestId('text')
    expect(textElement.textContent).toBe('3.46m')
  })
})
