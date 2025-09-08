import { useCallback, useMemo } from 'react'
import * as Select from '@radix-ui/react-select'
import { useModelStore } from '@/model/store'
import type { OuterCornerId, OuterWallId } from '@/types/ids'

interface OuterCornerInspectorProps {
  outerWallId: OuterWallId
  cornerId: OuterCornerId
}

export function OuterCornerInspector({ outerWallId, cornerId }: OuterCornerInspectorProps): React.JSX.Element {
  // Get model store functions - use specific selectors for stable references
  const updateCornerBelongsTo = useModelStore(state => state.updateCornerBelongsTo)

  // Get outer wall from store
  const outerWall = useModelStore(state => state.outerWalls.get(outerWallId))

  // Use useMemo to find corner and its index within the wall object
  const cornerIndex = useMemo(() => {
    return outerWall?.corners.findIndex(c => c.id === cornerId) ?? -1
  }, [outerWall, cornerId])

  const corner = useMemo(() => {
    return cornerIndex !== -1 ? outerWall?.corners[cornerIndex] : null
  }, [outerWall, cornerIndex])

  // If corner not found, show error
  if (!corner || !outerWall || cornerIndex === -1) {
    return (
      <div className="p-2 bg-red-50 border border-red-200 rounded">
        <h3 className="text-xs font-semibold text-red-800">Outer Corner Not Found</h3>
        <p className="text-xs text-red-600">Outer corner with ID {cornerId} could not be found.</p>
      </div>
    )
  }

  // Get adjacent segments
  const { previousSegment, nextSegment } = useMemo(() => {
    const prevIndex = (cornerIndex - 1 + outerWall.segments.length) % outerWall.segments.length
    const nextIndex = cornerIndex % outerWall.segments.length

    return {
      previousSegment: outerWall.segments[prevIndex],
      nextSegment: outerWall.segments[nextIndex]
    }
  }, [outerWall.segments, cornerIndex])

  // Event handlers with stable references
  const handleBelongsToChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newBelongsTo = e.target.value as 'previous' | 'next'
      updateCornerBelongsTo(outerWallId, cornerId, newBelongsTo)
    },
    [updateCornerBelongsTo, outerWallId, cornerId]
  )

  // Calculate angle between segments (simplified)
  const cornerAngle = useMemo(() => {
    if (!previousSegment || !nextSegment) return null

    // Calculate angle between the two segments
    const prevDir = previousSegment.direction
    const nextDir = nextSegment.direction

    // Dot product to get angle
    const dot = prevDir[0] * nextDir[0] + prevDir[1] * nextDir[1]
    const angle = Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI)

    return angle
  }, [previousSegment, nextSegment])

  return (
    <div className="p-2">
      <div className="space-y-4">
        {/* Basic Properties */}
        <div className="space-y-2">
          <h5 className="text-sm font-semibold text-gray-800 pb-1">Corner Configuration</h5>

          <div className="flex items-center justify-between gap-3">
            <label className="text-xs font-medium text-gray-600 flex-shrink-0">Belongs To</label>
            <Select.Root
              value={corner.belongsTo}
              onValueChange={(value: 'previous' | 'next') => handleBelongsToChange({ target: { value } } as any)}
            >
              <Select.Trigger className="flex-1 min-w-0 flex items-center justify-between px-2 py-1.5 bg-white border border-gray-300 rounded text-xs text-gray-800 hover:border-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-200">
                <Select.Value />
                <Select.Icon className="text-gray-600">⌄</Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Content className="bg-white border border-gray-300 rounded-md shadow-lg z-50 overflow-hidden">
                  <Select.Viewport className="p-1">
                    <Select.Item
                      value="previous"
                      className="flex items-center px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100 hover:outline-none cursor-pointer rounded"
                    >
                      <Select.ItemText>Previous Segment</Select.ItemText>
                    </Select.Item>
                    <Select.Item
                      value="next"
                      className="flex items-center px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100 hover:outline-none cursor-pointer rounded"
                    >
                      <Select.ItemText>Next Segment</Select.ItemText>
                    </Select.Item>
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </div>
          <div className="text-xs text-gray-500">
            Determines which wall segment owns this corner for construction purposes.
          </div>
        </div>

        {/* Geometry Information */}
        <div className="space-y-2 pt-1 border-t border-gray-200">
          <h5 className="text-sm font-semibold text-gray-800 pb-1">Geometry</h5>

          <div className="space-y-1">
            {cornerAngle && (
              <div className="flex justify-between items-center py-0.5">
                <span className="text-xs text-gray-600">Interior Angle:</span>
                <span className="text-xs font-medium text-gray-800">{cornerAngle.toFixed(1)}°</span>
              </div>
            )}
          </div>
        </div>

        {/* Construction Notes */}
        <div className="space-y-2 pt-1 border-t border-gray-200">
          <h5 className="text-sm font-semibold text-gray-800 pb-1">Construction Notes</h5>

          <div className="space-y-1.5">
            {previousSegment.constructionType !== nextSegment.constructionType && (
              <div className="p-2 bg-amber-50 border border-amber-200 rounded">
                <div className="text-xs font-medium text-amber-800">Mixed Construction:</div>
                <div className="text-xs text-amber-700">
                  Adjacent segments use different construction types. Special attention may be needed at this corner.
                </div>
              </div>
            )}

            {Math.abs(previousSegment.thickness - nextSegment.thickness) > 5 && (
              <div className="p-2 bg-amber-50 border border-amber-200 rounded">
                <div className="text-xs font-medium text-amber-800">Thickness Difference:</div>
                <div className="text-xs text-amber-700">
                  Adjacent segments have different thicknesses (
                  {Math.abs(previousSegment.thickness - nextSegment.thickness)}mm difference).
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
