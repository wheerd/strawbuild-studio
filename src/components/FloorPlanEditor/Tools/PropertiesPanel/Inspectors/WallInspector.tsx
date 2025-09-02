import { useCallback, useMemo } from 'react'
import type { WallType, OutsideDirection } from '@/types/model'
import { useModelStore } from '@/model/store'
import { createLength } from '@/types/geometry'
import type { WallId } from '@/types/ids'

interface WallInspectorProps {
  selectedId: WallId
}

interface CornerAction {
  pointId: string
  connectedWalls: string[]
  canSwitchMainWalls: boolean
}

export function WallInspector({ selectedId }: WallInspectorProps): React.JSX.Element {
  // Get wall data from model store
  const wall = useModelStore(state => state.walls.get(selectedId))
  const modelStore = useModelStore()

  // Get model store data
  const getWallsAtPoint = useModelStore(state => state.getWallsConnectedToPoint)
  const getPoint = useCallback((pointId: string) => modelStore.points.get(pointId as any), [modelStore.points])

  // If wall not found, show error
  if (!wall) {
    return (
      <div className="wall-inspector error">
        <h3>Wall Not Found</h3>
        <p>Wall with ID {selectedId} could not be found.</p>
      </div>
    )
  }

  // Calculate corner actions
  const cornerActions: CornerAction[] = useMemo(() => {
    try {
      if (!wall.startPointId || !wall.endPointId || !wall.floorId) {
        return []
      }

      return [wall.startPointId, wall.endPointId]
        .map(pointId => {
          try {
            const connectedWalls = getWallsAtPoint(pointId, wall.floorId) || []
            return {
              pointId,
              connectedWalls: connectedWalls.map(w => w.id).filter(id => id !== wall.id),
              canSwitchMainWalls: connectedWalls.length >= 2
            }
          } catch (error) {
            console.error('Error getting walls at point:', pointId, error)
            return {
              pointId,
              connectedWalls: [],
              canSwitchMainWalls: false
            }
          }
        })
        .filter(action => action.canSwitchMainWalls)
    } catch (error) {
      console.error('Error calculating corner actions:', error)
      return []
    }
  }, [wall.startPointId, wall.endPointId, wall.floorId, wall.id, getWallsAtPoint])

  const handleThicknessChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Math.max(50, Math.min(1000, Number(e.target.value))) // Clamp between 50mm and 1000mm
      modelStore.updateWallThickness(selectedId, createLength(value))
    },
    [modelStore, selectedId]
  )

  const handleTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      modelStore.updateWallType(selectedId, e.target.value as WallType)
    },
    [modelStore, selectedId]
  )

  const handleOutsideDirectionChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value === '' ? null : (e.target.value as OutsideDirection)
      modelStore.updateWallOutsideDirection(selectedId, value)
    },
    [modelStore, selectedId]
  )

  const handleCornerAction = useCallback((_pointId: string) => {
    // This would trigger corner main wall switching
    // Implementation would be added to open corner configuration dialog
  }, [])

  const calculateWallLength = useCallback((): string => {
    try {
      if (!wall.startPointId || !wall.endPointId) {
        return 'N/A'
      }

      const startPoint = getPoint(wall.startPointId)
      const endPoint = getPoint(wall.endPointId)

      if (startPoint && endPoint && startPoint.position && endPoint.position) {
        const length = Math.hypot(
          endPoint.position[0] - startPoint.position[0],
          endPoint.position[1] - startPoint.position[1]
        )
        return `${(length / 1000).toFixed(2)} m`
      }

      return 'N/A'
    } catch (error) {
      console.error('Error calculating wall length:', error)
      return 'N/A'
    }
  }, [wall.startPointId, wall.endPointId, getPoint])

  return (
    <div className="wall-inspector">
      <div className="inspector-header">
        <h3>Wall Properties</h3>
      </div>

      <div className="inspector-content">
        {/* Basic Properties */}
        <div className="property-section">
          <h4>Basic Properties</h4>

          <div className="property-group">
            <label htmlFor="wall-type">Wall Type</label>
            <select id="wall-type" value={wall.type} onChange={handleTypeChange}>
              <option value="structural">Structural</option>
              <option value="partition">Partition</option>
              <option value="outer">Outer</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="property-group">
            <label htmlFor="wall-thickness">Thickness (mm)</label>
            <input
              id="wall-thickness"
              type="number"
              value={wall.thickness || 200}
              onChange={handleThicknessChange}
              min="50"
              max="1000"
              step="10"
            />
          </div>

          {wall.type === 'outer' && (
            <div className="property-group">
              <label htmlFor="outside-direction">Outside Direction</label>
              <select
                id="outside-direction"
                value={wall.outsideDirection || ''}
                onChange={handleOutsideDirectionChange}
              >
                <option value="">Not Set</option>
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </div>
          )}
        </div>

        {/* Measurements */}
        <div className="property-section">
          <h4>Measurements</h4>

          <div className="measurement-group">
            <div className="measurement">
              <label>Length:</label>
              <span className="measurement-value">{calculateWallLength()}</span>
            </div>
            <div className="measurement">
              <label>Thickness:</label>
              <span className="measurement-value">{wall.thickness || 0} mm</span>
            </div>
          </div>
        </div>

        {/* Openings */}
        {wall.openings && wall.openings.length > 0 && (
          <div className="property-section">
            <h4>Openings ({wall.openings.length})</h4>

            <div className="openings-list">
              {wall.openings.map((opening: any, index: number) => (
                <div key={index} className="opening-item">
                  <span className="opening-type">{opening.type}</span>
                  <span className="opening-dimensions">
                    {opening.width} × {opening.height} mm
                  </span>
                  <button
                    className="remove-opening"
                    onClick={() => {
                      // Remove opening implementation would go here
                      // For now, this is just a placeholder
                    }}
                    title="Remove opening"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <button className="add-opening-btn">+ Add Opening</button>
          </div>
        )}

        {/* Corner Actions */}
        {cornerActions.length > 0 && (
          <div className="property-section">
            <h4>Corner Configuration</h4>

            <div className="corner-actions">
              {cornerActions.map(action => (
                <div key={action.pointId} className="corner-action">
                  <label>Corner at Point {action.pointId}:</label>
                  <button className="corner-action-button" onClick={() => handleCornerAction(action.pointId)}>
                    Configure Main Walls ({action.connectedWalls.length} connected)
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Room Connections */}
        <div className="property-section">
          <h4>Room Connections</h4>

          <div className="room-connections">
            <div className="room-connection">
              <label>Left Room:</label>
              <span className="room-value">{wall.leftRoomId ? `Room ${wall.leftRoomId}` : 'None'}</span>
            </div>
            <div className="room-connection">
              <label>Right Room:</label>
              <span className="room-value">{wall.rightRoomId ? `Room ${wall.rightRoomId}` : 'None'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
