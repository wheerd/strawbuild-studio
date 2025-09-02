import React from 'react'
import { useModelStore } from '@/model/store'
import type { OuterWallId } from '@/types/ids'
import { calculatePolygonArea } from '@/types/geometry'

interface OuterWallInspectorProps {
  selectedId: OuterWallId
}

export function OuterWallInspector({ selectedId }: OuterWallInspectorProps): React.JSX.Element {
  // Get outer wall data from model store
  const outerWall = useModelStore(state => state.outerWalls.get(selectedId))

  // If outer wall not found, show error
  if (!outerWall) {
    return (
      <div className="outer-wall-inspector error">
        <h3>Outer Wall Not Found</h3>
        <p>Outer wall with ID {selectedId} could not be found.</p>
      </div>
    )
  }

  const totalPerimeter = outerWall.segments.reduce((l, s) => l + s.insideLength, 0)
  const totalArea = calculatePolygonArea({ points: outerWall.boundary })

  return (
    <div className="outer-wall-inspector">
      <div className="inspector-header">
        <h3>Outer Wall Properties</h3>
      </div>

      <div className="inspector-content">
        {/* Basic Information */}
        <div className="property-section">
          <h4>Wall Information</h4>

          <div className="measurements-grid">
            <div className="measurement">
              <label>Total Perimeter:</label>
              <span className="measurement-value">{(totalPerimeter / 1000).toFixed(2)} m</span>
            </div>
            <div className="measurement">
              <label>Total Area:</label>
              <span className="measurement-value">{(totalArea / (1000 * 1000)).toFixed(2)} m²</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
