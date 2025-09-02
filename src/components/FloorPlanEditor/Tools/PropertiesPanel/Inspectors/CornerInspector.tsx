import { useMemo } from 'react'
import { useModelStore } from '@/model/store'
import type { PointId } from '@/types/ids'

interface CornerInspectorProps {
  selectedId: PointId
}

export function CornerInspector({ selectedId }: CornerInspectorProps): React.JSX.Element {
  // Get point data from model store
  const point = useModelStore(state => state.points.get(selectedId))
  const getWallsAtPoint = useModelStore(state => state.getWallsConnectedToPoint)

  // If point not found, show error
  if (!point) {
    return (
      <div className="corner-inspector error">
        <h3>Point Not Found</h3>
        <p>Point with ID {selectedId} could not be found.</p>
      </div>
    )
  }

  // Get connected walls
  const connectedWalls = useMemo(() => {
    return getWallsAtPoint(selectedId, point.floorId)
  }, [selectedId, point.floorId, getWallsAtPoint])

  return (
    <div className="corner-inspector">
      <div className="inspector-header">
        <h3>Corner/Point Properties</h3>
      </div>

      <div className="inspector-content">
        {/* Position Information */}
        <div className="property-section">
          <h4>Position</h4>
          <div className="position-info">
            <label>Coordinates:</label>
            <span className="position-value">
              ({point.position[0].toFixed(0)}, {point.position[1].toFixed(0)}) mm
            </span>
          </div>
        </div>

        {/* Connection Information */}
        <div className="property-section">
          <h4>Connections</h4>
          <div className="connection-stats">
            <div className="connection-stat">
              <label>Connected Walls:</label>
              <span className="stat-value">{connectedWalls.length}</span>
            </div>
          </div>

          {connectedWalls.length > 0 && (
            <div className="connected-entities">
              <h5>Connected Walls:</h5>
              <div className="entity-chips">
                {connectedWalls.map(wall => (
                  <span key={wall.id} className="entity-chip wall-chip" title={wall.id}>
                    {wall.id.split('_')[1]?.substring(0, 6) || wall.id}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Point Type Information */}
        <div className="property-section">
          <h4>Point Type</h4>
          <div className="point-type-info">
            {connectedWalls.length === 0 && (
              <div className="point-type">
                <span className="type-badge isolated">Isolated Point</span>
                <span className="type-description">Not connected to any walls</span>
              </div>
            )}

            {connectedWalls.length === 1 && (
              <div className="point-type">
                <span className="type-badge endpoint">Wall Endpoint</span>
                <span className="type-description">End of a single wall</span>
              </div>
            )}

            {connectedWalls.length === 2 && (
              <div className="point-type">
                <span className="type-badge corner">Corner Point</span>
                <span className="type-description">Connection between two walls</span>
              </div>
            )}

            {connectedWalls.length >= 3 && (
              <div className="point-type">
                <span className="type-badge intersection">Wall Intersection</span>
                <span className="type-description">Intersection of {connectedWalls.length} walls</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
