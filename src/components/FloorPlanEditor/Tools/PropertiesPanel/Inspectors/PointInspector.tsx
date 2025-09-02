import { useCallback, useMemo } from 'react'
import type { Point } from '@/types/model'
import { useModelStore } from '@/model/store'
import { createVec2 } from '@/types/geometry'

interface PointInspectorProps {
  point: Point
  onChange: (property: string, value: any) => void
}

export function PointInspector({ point, onChange }: PointInspectorProps): React.JSX.Element {
  // Get model store functions
  const getWallsConnectedToPoint = useModelStore(state => state.getWallsConnectedToPoint)
  const getRoomsContainingPoint = useModelStore(state => state.getRoomsContainingPoint)

  // Get connected entities
  const connectedEntities = useMemo(() => {
    const walls = getWallsConnectedToPoint(point.id, point.floorId)
    const rooms = getRoomsContainingPoint(point.id, point.floorId)

    return {
      walls,
      rooms,
      wallCount: walls.length,
      roomCount: rooms.length
    }
  }, [point.id, point.floorId, getWallsConnectedToPoint, getRoomsContainingPoint])

  const handlePositionChange = useCallback(
    (axis: 'x' | 'y', value: string) => {
      const numValue = Number(value)
      if (!isNaN(numValue)) {
        const newPosition = createVec2(
          axis === 'x' ? numValue : point.position[0],
          axis === 'y' ? numValue : point.position[1]
        )
        onChange('position', newPosition)
      }
    },
    [point.position, onChange]
  )

  const handleMergeWithNearby = useCallback(() => {
    // Implementation for merging with nearby points
    // This would find nearby points and offer to merge
  }, [point.id])

  const handleDeletePoint = useCallback(() => {
    // Implementation for deleting point
    // This would check if deletion is safe and delete if so
  }, [point.id])

  const handleFocusPoint = useCallback(() => {
    // Focus/zoom to point
    // This would center the viewport on the point
  }, [point.id])

  const canDeletePoint = connectedEntities.wallCount === 0

  return (
    <div className="point-inspector">
      <div className="inspector-header">
        <h3>Point Properties</h3>
      </div>

      <div className="inspector-content">
        {/* Position Properties */}
        <div className="property-section">
          <h4>Position</h4>

          <div className="position-inputs">
            <div className="property-group">
              <label htmlFor="point-x">X (mm)</label>
              <input
                id="point-x"
                type="number"
                value={point.position[0]}
                onChange={e => handlePositionChange('x', e.target.value)}
                step="1"
              />
            </div>

            <div className="property-group">
              <label htmlFor="point-y">Y (mm)</label>
              <input
                id="point-y"
                type="number"
                value={point.position[1]}
                onChange={e => handlePositionChange('y', e.target.value)}
                step="1"
              />
            </div>
          </div>

          <div className="position-display">
            <span className="coordinate-display">
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
              <span className="stat-value">{connectedEntities.wallCount}</span>
            </div>
            <div className="connection-stat">
              <label>Member of Rooms:</label>
              <span className="stat-value">{connectedEntities.roomCount}</span>
            </div>
          </div>

          {connectedEntities.walls.length > 0 && (
            <div className="connected-entities">
              <h5>Connected Walls:</h5>
              <div className="entity-chips">
                {connectedEntities.walls.map(wall => (
                  <span key={wall.id} className="entity-chip wall-chip" title={wall.id}>
                    {wall.id.split('_')[1]?.substring(0, 6) || wall.id}
                  </span>
                ))}
              </div>
            </div>
          )}

          {connectedEntities.rooms.length > 0 && (
            <div className="connected-entities">
              <h5>Member of Rooms:</h5>
              <div className="entity-chips">
                {connectedEntities.rooms.map(room => (
                  <span key={room.id} className="entity-chip room-chip" title={`${room.name} (${room.id})`}>
                    {room.name}
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
            {connectedEntities.wallCount === 0 && (
              <div className="point-type">
                <span className="type-badge isolated">Isolated Point</span>
                <span className="type-description">Not connected to any walls</span>
              </div>
            )}

            {connectedEntities.wallCount === 1 && (
              <div className="point-type">
                <span className="type-badge endpoint">Wall Endpoint</span>
                <span className="type-description">End of a single wall</span>
              </div>
            )}

            {connectedEntities.wallCount === 2 && (
              <div className="point-type">
                <span className="type-badge junction">Wall Junction</span>
                <span className="type-description">Connection between two walls</span>
              </div>
            )}

            {connectedEntities.wallCount >= 3 && (
              <div className="point-type">
                <span className="type-badge intersection">Wall Intersection</span>
                <span className="type-description">Intersection of {connectedEntities.wallCount} walls</span>
              </div>
            )}
          </div>
        </div>

        {/* Point Actions */}
        <div className="property-section">
          <h4>Actions</h4>

          <div className="point-actions">
            <button className="action-button primary" onClick={handleFocusPoint} title="Center view on this point">
              <span className="action-icon">🎯</span>
              Focus Point
            </button>

            <button className="action-button" onClick={handleMergeWithNearby} title="Merge with nearby points">
              <span className="action-icon">🔗</span>
              Merge Nearby
            </button>

            <button
              className={`action-button ${!canDeletePoint ? 'disabled' : 'danger'}`}
              onClick={handleDeletePoint}
              disabled={!canDeletePoint}
              title={canDeletePoint ? 'Delete this point' : 'Cannot delete: point is connected to walls'}
            >
              <span className="action-icon">🗑️</span>
              Delete Point
            </button>
          </div>

          {!canDeletePoint && (
            <div className="action-warning">
              <span className="warning-icon">⚠️</span>
              Cannot delete point while connected to walls. Remove connected walls first.
            </div>
          )}
        </div>

        {/* Coordinate System */}
        <div className="property-section">
          <h4>Coordinate System</h4>

          <div className="coordinate-info">
            <div className="coordinate-detail">
              <label>World Coordinates:</label>
              <span>
                ({point.position[0].toFixed(1)}, {point.position[1].toFixed(1)}) mm
              </span>
            </div>
            <div className="coordinate-detail">
              <label>Grid Coordinates:</label>
              <span>
                ({(point.position[0] / 500).toFixed(1)}, {(point.position[1] / 500).toFixed(1)}) grid
              </span>
            </div>
            <div className="coordinate-detail">
              <label>Metric:</label>
              <span>
                ({(point.position[0] / 1000).toFixed(2)}, {(point.position[1] / 1000).toFixed(2)}) m
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
