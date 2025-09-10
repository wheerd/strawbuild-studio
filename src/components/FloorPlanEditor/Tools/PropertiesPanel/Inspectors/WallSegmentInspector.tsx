import { useCallback, useMemo } from 'react'
import * as Select from '@radix-ui/react-select'
import { useModelStore } from '@/model/store'
import { createLength } from '@/types/geometry'
import { useDebouncedNumericInput } from '@/components/FloorPlanEditor/hooks/useDebouncedInput'
import type { WallSegmentId, PerimeterId } from '@/types/ids'
import type { OuterWallConstructionType } from '@/types/model'

interface WallSegmentInspectorProps {
  perimeterId: PerimeterId
  segmentId: WallSegmentId
}

// Construction type options - moved outside component to avoid recreation
const CONSTRUCTION_TYPE_OPTIONS: { value: OuterWallConstructionType; label: string }[] = [
  { value: 'cells-under-tension', label: 'CUT' },
  { value: 'infill', label: 'Infill' },
  { value: 'strawhenge', label: 'Strawhenge' },
  { value: 'non-strawbale', label: 'Non-Strawbale' }
]

export function WallSegmentInspector({ perimeterId, segmentId }: WallSegmentInspectorProps): React.JSX.Element {
  // Get model store functions - use specific selectors for stable references
  const updateOuterWallConstructionType = useModelStore(state => state.updateOuterWallConstructionType)
  const updateOuterWallThickness = useModelStore(state => state.updateOuterWallThickness)

  // Get outer wall from store
  const outerWall = useModelStore(state => state.perimeters.get(perimeterId))

  // Use useMemo to find segment within the wall object
  const segment = useMemo(() => {
    return outerWall?.segments.find(s => s.id === segmentId)
  }, [outerWall, segmentId])

  // Debounced thickness input handler
  const thicknessInput = useDebouncedNumericInput(
    segment?.thickness || 0,
    useCallback(
      (value: number) => {
        updateOuterWallThickness(perimeterId, segmentId, createLength(value))
      },
      [updateOuterWallThickness, perimeterId, segmentId]
    ),
    {
      debounceMs: 300,
      min: 50,
      max: 1500,
      step: 10
    }
  )

  // If segment not found, show error
  if (!segment || !outerWall) {
    return (
      <div className="wall-segment-inspector error">
        <h3>Wall Segment Not Found</h3>
        <p>Wall segment with ID {segmentId} could not be found.</p>
      </div>
    )
  }

  return (
    <div className="p-2">
      <div className="space-y-4">
        {/* Basic Properties */}
        <div className="space-y-2">
          <div className="space-y-1.5">
            {/* Construction Type */}
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-medium text-gray-600 flex-shrink-0">Construction Type</label>
              <Select.Root
                value={segment.constructionType}
                onValueChange={(value: OuterWallConstructionType) => {
                  updateOuterWallConstructionType(perimeterId, segmentId, value)
                }}
              >
                <Select.Trigger className="flex-1 min-w-0 flex items-center justify-between px-2 py-1.5 bg-white border border-gray-300 rounded text-xs text-gray-800 hover:border-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-200">
                  <Select.Value placeholder="Select type" />
                  <Select.Icon className="text-gray-600">⌄</Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="bg-white border border-gray-300 rounded-md shadow-lg z-50 overflow-hidden">
                    <Select.Viewport className="p-1">
                      {CONSTRUCTION_TYPE_OPTIONS.map(option => (
                        <Select.Item
                          key={option.value}
                          value={option.value}
                          className="flex items-center px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100 hover:outline-none cursor-pointer rounded"
                        >
                          <Select.ItemText>{option.label}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>

            {/* Thickness Input */}
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="segment-thickness" className="text-xs font-medium text-gray-600 flex-shrink-0">
                Thickness
              </label>
              <div className="relative flex-1 max-w-24">
                <input
                  id="segment-thickness"
                  type="number"
                  value={thicknessInput.value}
                  onChange={e => thicknessInput.handleChange(e.target.value)}
                  onBlur={thicknessInput.handleBlur}
                  onKeyDown={thicknessInput.handleKeyDown}
                  min="50"
                  max="1500"
                  step="10"
                  className="unit-input w-full pl-2 py-1.5 pr-8 bg-white border border-gray-300 rounded text-xs text-right hover:border-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-200"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">
                  mm
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Measurements */}
        <div className="space-y-2 pt-1 border-t border-gray-200">
          <h5 className="text-sm font-semibold text-gray-800 pb-1">Measurements</h5>

          <div className="space-y-1">
            <div className="flex justify-between items-center py-0.5">
              <span className="text-xs text-gray-600">Inside Length:</span>
              <span className="text-xs font-medium text-gray-800">{(segment.insideLength / 1000).toFixed(3)} m</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-xs text-gray-600">Outside Length:</span>
              <span className="text-xs font-medium text-gray-800">{(segment.outsideLength / 1000).toFixed(3)} m</span>
            </div>
          </div>
        </div>

        {/* Openings */}
        <div className="space-y-2 pt-1 border-t border-gray-200">
          <h5 className="text-sm font-semibold text-gray-800 pb-1">Openings</h5>

          <div className="grid grid-cols-3 gap-1.5">
            <div className="text-center p-1.5 bg-gray-50 rounded">
              <div className="text-sm font-semibold text-gray-800">
                {segment.openings.filter(o => o.type === 'door').length}
              </div>
              <div className="text-xs text-gray-600">Doors</div>
            </div>
            <div className="text-center p-1.5 bg-gray-50 rounded">
              <div className="text-sm font-semibold text-gray-800">
                {segment.openings.filter(o => o.type === 'window').length}
              </div>
              <div className="text-xs text-gray-600">Windows</div>
            </div>
            <div className="text-center p-1.5 bg-gray-50 rounded">
              <div className="text-sm font-semibold text-gray-800">
                {segment.openings.filter(o => o.type === 'passage').length}
              </div>
              <div className="text-xs text-gray-600">Passages</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
