import React from 'react'
import { useModelStore } from '@/model/store'
import type { PerimeterId } from '@/types/ids'
import { calculatePolygonArea } from '@/types/geometry'

interface PerimeterInspectorProps {
  selectedId: PerimeterId
}

export function PerimeterInspector({ selectedId }: PerimeterInspectorProps): React.JSX.Element {
  // Get perimeter data from model store
  const outerWall = useModelStore(state => state.perimeters.get(selectedId))

  // If perimeter not found, show error
  if (!outerWall) {
    return (
      <div className="p-2 bg-red-50 border border-red-200 rounded">
        <h3 className="text-xs font-semibold text-red-800">Perimeter Wall Not Found</h3>
        <p className="text-xs text-red-600">Perimeter with ID {selectedId} could not be found.</p>
      </div>
    )
  }

  const totalPerimeter = outerWall.walls.reduce((l, s) => l + s.insideLength, 0)
  const totalArea = calculatePolygonArea({ points: outerWall.boundary })

  return (
    <div className="p-2">
      <div className="space-y-3">
        {/* Basic Information */}
        <div className="space-y-2">
          <div className="space-y-1">
            <div className="flex justify-between items-center py-0.5">
              <span className="text-xs text-gray-600">Total Perimeter:</span>
              <span className="text-xs font-medium text-gray-800">{(totalPerimeter / 1000).toFixed(2)} m</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-xs text-gray-600">Total Area:</span>
              <span className="text-xs font-medium text-gray-800">{(totalArea / (1000 * 1000)).toFixed(2)} m²</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
