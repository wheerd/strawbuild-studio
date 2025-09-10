import { useCallback, useMemo } from 'react'
import { useModelStore } from '@/model/store'
import type { PerimeterCornerId, PerimeterId } from '@/types/ids'

interface PerimeterCornerInspectorProps {
  perimeterId: PerimeterId
  cornerId: PerimeterCornerId
}

export function PerimeterCornerInspector({ perimeterId, cornerId }: PerimeterCornerInspectorProps): React.JSX.Element {
  // Get model store functions - use specific selectors for stable references
  const updateCornerBelongsTo = useModelStore(state => state.updatePerimeterCornerBelongsTo)

  // Get perimeter from store
  const outerWall = useModelStore(state => state.perimeters.get(perimeterId))

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

  // Get adjacent walls
  const { previousWall, nextWall } = useMemo(() => {
    const prevIndex = (cornerIndex - 1 + outerWall.walls.length) % outerWall.walls.length
    const nextIndex = cornerIndex % outerWall.walls.length

    return {
      previousWall: outerWall.walls[prevIndex],
      nextWall: outerWall.walls[nextIndex]
    }
  }, [outerWall.walls, cornerIndex])

  // Event handlers with stable references
  const handleToggleBelongsTo = useCallback(() => {
    const newBelongsTo = corner.belongsTo === 'previous' ? 'next' : 'previous'
    updateCornerBelongsTo(perimeterId, cornerId, newBelongsTo)
  }, [updateCornerBelongsTo, perimeterId, cornerId, corner.belongsTo])

  // Calculate angle between walls (simplified)
  const cornerAngle = useMemo(() => {
    if (!previousWall || !nextWall) return null

    // Calculate angle between the two walls
    const prevDir = previousWall.direction
    const nextDir = nextWall.direction

    // Dot product to get angle
    const dot = prevDir[0] * nextDir[0] + prevDir[1] * nextDir[1]
    const angle = Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI)

    return angle
  }, [previousWall, nextWall])

  // Check if there are construction notes to display
  const hasConstructionNotes = useMemo(() => {
    if (!previousWall || !nextWall) return false

    const hasMixedConstruction = previousWall.constructionType !== nextWall.constructionType
    const hasThicknessDifference = Math.abs(previousWall.thickness - nextWall.thickness) > 5

    return hasMixedConstruction || hasThicknessDifference
  }, [previousWall, nextWall])

  return (
    <div className="p-2">
      <div className="space-y-4">
        {/* Basic Properties */}
        <div className="space-y-2">
          <h5 className="text-sm font-semibold text-gray-800 pb-1">Corner Configuration</h5>

          <div className="flex items-center justify-between gap-3">
            <label className="text-xs font-medium text-gray-600 flex-shrink-0">Main Wall</label>
            <button
              onClick={handleToggleBelongsTo}
              className="flex-1 min-w-0 flex items-center justify-center px-3 py-1.5 bg-white border border-gray-300 rounded text-xs text-gray-800 hover:border-gray-400 hover:bg-gray-50 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-200 transition-colors"
              title="Switch which wall wall owns this corner"
            >
              Switch main wall
            </button>
          </div>
          <div className="text-xs text-gray-500">
            Determines which wall wall owns this corner for construction purposes.
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
        {hasConstructionNotes && (
          <div className="space-y-2 pt-1 border-t border-gray-200">
            <h5 className="text-sm font-semibold text-gray-800 pb-1">Construction Notes</h5>

            <div className="space-y-1.5">
              {previousWall.constructionType !== nextWall.constructionType && (
                <div className="p-2 bg-amber-50 border border-amber-200 rounded">
                  <div className="text-xs font-medium text-amber-800">Mixed Construction:</div>
                  <div className="text-xs text-amber-700">
                    Adjacent walls use different construction types. Special attention may be needed at this corner.
                  </div>
                </div>
              )}

              {Math.abs(previousWall.thickness - nextWall.thickness) > 5 && (
                <div className="p-2 bg-amber-50 border border-amber-200 rounded">
                  <div className="text-xs font-medium text-amber-800">Thickness Difference:</div>
                  <div className="text-xs text-amber-700">
                    Adjacent walls have different thicknesses ({Math.abs(previousWall.thickness - nextWall.thickness)}mm
                    difference).
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
