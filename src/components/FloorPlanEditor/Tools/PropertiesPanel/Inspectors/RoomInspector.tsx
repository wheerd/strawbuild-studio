import { useCallback, useMemo } from 'react'
import { useModelStore } from '@/model/store'
import type { RoomId } from '@/types/ids'

interface RoomInspectorProps {
  selectedId: RoomId
}

export function RoomInspector({ selectedId }: RoomInspectorProps): React.JSX.Element {
  // Get room data from model store
  const room = useModelStore(state => state.rooms.get(selectedId))
  const modelStore = useModelStore()

  // Get model store functions
  const getWalls = useModelStore(state => state.walls)

  // If room not found, show error
  if (!room) {
    return (
      <div className="room-inspector error">
        <h3>Room Not Found</h3>
        <p>Room with ID {selectedId} could not be found.</p>
      </div>
    )
  }

  // Room type options
  const roomTypeOptions = [
    { value: 'living', label: 'Living Room' },
    { value: 'bedroom', label: 'Bedroom' },
    { value: 'kitchen', label: 'Kitchen' },
    { value: 'bathroom', label: 'Bathroom' },
    { value: 'dining', label: 'Dining Room' },
    { value: 'office', label: 'Office' },
    { value: 'storage', label: 'Storage' },
    { value: 'utility', label: 'Utility Room' },
    { value: 'garage', label: 'Garage' },
    { value: 'hallway', label: 'Hallway' },
    { value: 'closet', label: 'Closet' },
    { value: 'general', label: 'General' }
  ]

  // Calculate room metrics
  const roomMetrics = useMemo(() => {
    // Calculate perimeter from boundary walls
    let perimeter = 0
    if (room.outerBoundary?.wallIds) {
      for (const wallId of room.outerBoundary.wallIds) {
        const wall = getWalls.get(wallId)
        if (wall) {
          // Would need to calculate wall length here
          // For now, just count walls
          perimeter += 1
        }
      }
    }

    return {
      area: 'N/A', // Area calculation would be implemented later
      perimeter: perimeter > 0 ? `${perimeter} walls` : 'N/A',
      wallCount: room.outerBoundary?.wallIds?.size || 0
    }
  }, [room, getWalls])

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      modelStore.updateRoomName(selectedId, e.target.value)
    },
    [modelStore, selectedId]
  )

  const handleRoomTypeChange = useCallback(
    (_e: React.ChangeEvent<HTMLSelectElement>) => {
      // Note: This would need to be implemented in the model store
      // modelStore.updateRoomType(selectedId, e.target.value)
    },
    [modelStore, selectedId]
  )

  const handleColorChange = useCallback(
    (_e: React.ChangeEvent<HTMLInputElement>) => {
      // Note: This would need to be implemented in the model store
      // modelStore.updateRoomFillColor(selectedId, e.target.value)
    },
    [modelStore, selectedId]
  )

  const handleSplitRoom = useCallback(() => {
    // Implementation for room splitting
    // This would open a tool or dialog for splitting the room
  }, [selectedId])

  const handleMergeRooms = useCallback(() => {
    // Implementation for room merging
    // This would show adjacent rooms and allow selection for merging
  }, [selectedId])

  const handleFocusRoom = useCallback(() => {
    // Focus/zoom to room
    // This would center the viewport on the room
  }, [selectedId])

  return (
    <div className="room-inspector">
      <div className="inspector-header">
        <h3>Room Properties</h3>
      </div>

      <div className="inspector-content">
        {/* Basic Properties */}
        <div className="property-section">
          <h4>Basic Properties</h4>

          <div className="property-group">
            <label htmlFor="room-name">Name</label>
            <input id="room-name" type="text" value={room.name} onChange={handleNameChange} placeholder="Room name" />
          </div>

          <div className="property-group">
            <label htmlFor="room-type">Room Type</label>
            <select id="room-type" value={(room as any).roomType || 'general'} onChange={handleRoomTypeChange}>
              {roomTypeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="property-group">
            <label htmlFor="room-color">Fill Color</label>
            <div className="color-input-wrapper">
              <input
                id="room-color"
                type="color"
                value={(room as any).fillColor || '#e0e0e0'}
                onChange={handleColorChange}
              />
              <input
                type="text"
                value={(room as any).fillColor || '#e0e0e0'}
                onChange={e => handleColorChange(e)}
                className="color-text-input"
                placeholder="#e0e0e0"
              />
            </div>
          </div>
        </div>

        {/* Measurements */}
        <div className="property-section">
          <h4>Measurements</h4>

          <div className="measurements-grid">
            <div className="measurement">
              <label>Area:</label>
              <span className="measurement-value">{roomMetrics.area} m²</span>
            </div>
            <div className="measurement">
              <label>Walls:</label>
              <span className="measurement-value">{roomMetrics.wallCount}</span>
            </div>
            <div className="measurement">
              <label>Perimeter:</label>
              <span className="measurement-value">{roomMetrics.perimeter}</span>
            </div>
          </div>
        </div>

        {/* Boundary Information */}
        {room.outerBoundary && (
          <div className="property-section">
            <h4>Boundary</h4>

            <div className="boundary-info">
              <div className="boundary-stat">
                <label>Points:</label>
                <span>{room.outerBoundary.pointIds?.length || 0}</span>
              </div>
              <div className="boundary-stat">
                <label>Walls:</label>
                <span>{room.outerBoundary.wallIds?.size || 0}</span>
              </div>
            </div>

            {room.outerBoundary.wallIds && room.outerBoundary.wallIds.size > 0 && (
              <div className="wall-list">
                <h5>Connected Walls:</h5>
                <div className="wall-chips">
                  {Array.from(room.outerBoundary.wallIds).map((wallId: string) => (
                    <span key={wallId} className="wall-chip" title={wallId}>
                      {wallId.split('_')[1]?.substring(0, 6) || wallId}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Room Actions */}
        <div className="property-section">
          <h4>Actions</h4>

          <div className="room-actions">
            <button className="action-button primary" onClick={handleFocusRoom} title="Center view on this room">
              <span className="action-icon">🎯</span>
              Focus Room
            </button>

            <button className="action-button" onClick={handleSplitRoom} title="Split this room into multiple rooms">
              <span className="action-icon">✂️</span>
              Split Room
            </button>

            <button className="action-button" onClick={handleMergeRooms} title="Merge with adjacent rooms">
              <span className="action-icon">🔗</span>
              Merge Rooms
            </button>
          </div>
        </div>

        {/* Room Notes */}
        <div className="property-section">
          <h4>Notes</h4>

          <div className="property-group">
            <label htmlFor="room-notes">Description/Notes</label>
            <textarea
              id="room-notes"
              value={(room as any).notes || ''}
              onChange={_e => {
                // Note: This would need to be implemented in the model store
                // modelStore.updateRoomNotes(selectedId, _e.target.value)
              }}
              placeholder="Add notes about this room..."
              rows={3}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
