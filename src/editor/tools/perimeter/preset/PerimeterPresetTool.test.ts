import { beforeEach, describe, expect, it, vi } from 'vitest'

import { type StoreActions, getModelActions } from '@/building/store'
import { replaceSelection } from '@/editor/hooks/useSelectionStore'
import { getViewModeActions } from '@/editor/hooks/useViewMode'
import { viewportActions } from '@/editor/hooks/useViewportStore'
import { getToolActions } from '@/editor/tools/system'
import { Bounds2D, newVec2 } from '@/shared/geometry'

import { PerimeterPresetTool } from './PerimeterPresetTool'
import { LShapedPreset, RectangularPreset } from './presets'
import type { RectangularPresetConfig } from './presets'

describe('PerimeterPresetTool', () => {
  vi.mock('@/building/store', () => ({ getModelActions: vi.fn() }))
  vi.mock('@/editor/hooks/useSelectionStore', () => ({ replaceSelection: vi.fn() }))
  vi.mock('@/editor/hooks/useViewportStore', () => ({ viewportActions: vi.fn() }))
  vi.mock('@/editor/tools/system', () => ({ getToolActions: vi.fn() }))

  const mockGetModelActions = vi.mocked(getModelActions)
  const mockViewportActions = vi.mocked(viewportActions)
  const mockGetToolActions = vi.mocked(getToolActions)

  const mockGetActiveStoreyId = vi.fn<StoreActions['getActiveStoreyId']>()
  const mockAddPerimeter = vi.fn<StoreActions['addPerimeter']>()
  const mockReplaceSelection = vi.mocked(replaceSelection)
  const mockFitToView = vi.fn()
  const mockPopTool = vi.fn()

  const mockPerimeter = {
    id: 'perimeter_mock',
    corners: [{ outsidePoint: newVec2(1, 1) }, { outsidePoint: newVec2(2, 2) }, { outsidePoint: newVec2(3, 3) }]
  } as any

  let tool: PerimeterPresetTool

  beforeEach(() => {
    tool = new PerimeterPresetTool()

    vi.resetAllMocks()
    mockGetModelActions.mockReturnValue({
      getActiveStoreyId: mockGetActiveStoreyId,
      addPerimeter: mockAddPerimeter
    } as any)
    mockViewportActions.mockReturnValue({ fitToView: mockFitToView } as any)
    mockGetToolActions.mockReturnValue({ popTool: mockPopTool } as any)
    mockAddPerimeter.mockReturnValue(mockPerimeter)
    mockGetActiveStoreyId.mockReturnValue('storey_active')
  })

  describe('initialization', () => {
    it('should have correct id', () => {
      expect(tool.id).toBe('perimeter.preset')
    })

    it('should have available presets', () => {
      const presets = tool.availablePresets
      expect(presets).toHaveLength(2)
      expect(presets[0]).toBeInstanceOf(RectangularPreset)
      expect(presets[1]).toBeInstanceOf(LShapedPreset)
    })
  })

  describe('placing perimeter', () => {
    const rectangularPreset = new RectangularPreset()
    const config: RectangularPresetConfig = {
      width: 4000,
      length: 6000,
      thickness: 420,
      baseRingBeamAssemblyId: 'ringbeam_base',
      topRingBeamAssemblyId: 'ringbeam_top',
      wallAssemblyId: 'wa_mock',
      referenceSide: 'inside'
    }

    it('should create perimeter in active storey', () => {
      mockGetActiveStoreyId.mockReturnValue('storey_active')

      tool.placePerimeter(rectangularPreset, config)

      expect(mockAddPerimeter).toHaveBeenCalledWith(
        'storey_active',
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything()
      )
    })

    it('should create perimeter with normalized preset polygon', () => {
      const mockPreset = {
        getPolygonPoints: vi.fn(_config => [newVec2(1, 1), newVec2(2, 1), newVec2(1, 3)])
      } as any

      tool.placePerimeter(mockPreset, config)

      expect(mockAddPerimeter).toHaveBeenCalledWith(
        expect.anything(),
        { points: [newVec2(0, 2), newVec2(1, 0), newVec2(0, 0)] },
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything()
      )
    })

    it('should create perimeter with config params', () => {
      tool.placePerimeter(rectangularPreset, config)

      expect(mockAddPerimeter).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        config.wallAssemblyId,
        config.thickness,
        config.baseRingBeamAssemblyId,
        config.topRingBeamAssemblyId,
        config.referenceSide
      )
    })

    it('should select created perimeter', () => {
      tool.placePerimeter(rectangularPreset, config)

      expect(mockReplaceSelection).toHaveBeenCalledWith([mockPerimeter.id])
    })

    it('should focus created perimeter', () => {
      tool.placePerimeter(rectangularPreset, config)

      expect(mockFitToView).toHaveBeenCalledWith(Bounds2D.fromMinMax(newVec2(1, 1), newVec2(3, 3)))
    })

    it('should deactivate tool', () => {
      tool.placePerimeter(rectangularPreset, config)

      expect(mockPopTool).toHaveBeenCalled()
    })
  })

  describe('lifecycle assemblies', () => {
    vi.mock('@/editor/hooks/useViewMode', () => ({ getViewModeActions: vi.fn() }))
    const mockGetViewModeActions = vi.mocked(getViewModeActions)
    it('should switch to wall mode on activation', () => {
      const mockEnsureMode = vi.fn()
      mockGetViewModeActions.mockReturnValue({ ensureMode: mockEnsureMode } as any)

      tool.onActivate()

      expect(mockEnsureMode).toHaveBeenCalledWith('walls')
    })
  })
})
