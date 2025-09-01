import { useState, useCallback, useMemo } from 'react'
import type { Corner } from '@/types/model'
import { useModelStore } from '@/model/store'
import { createLength } from '@/types/geometry'

interface CornerInspectorProps {
  corner: Corner
  onChange: (property: string, value: any) => void
}

export function CornerInspector({ corner, onChange }: CornerInspectorProps): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState(true)

  // Get model store functions
  const getWallsAtPoint = useModelStore(state => state.getWallsConnectedToPoint)
  const modelStore = useModelStore()
  const getPoint = useCallback((pointId: string) => modelStore.points.get(pointId as any), [modelStore.points])
  const getWall = useCallback((wallId: string) => modelStore.walls.get(wallId as any), [modelStore.walls])

  // Get corner data
  const cornerData = useMemo(() => {
    const point = getPoint(corner.pointId)
    const connectedWalls = getWallsAtPoint(corner.pointId, corner.floorId)
    const wall1 = getWall(corner.wall1Id)
    const wall2 = getWall(corner.wall2Id)
    const otherWalls = corner.otherWallIds?.map(id => getWall(id)).filter(Boolean) || []

    // Calculate corner angle (simplified calculation)
    let angle: number | null = null
    if (point && wall1 && wall2) {
      // This would need proper vector math to calculate the actual angle
      // For now, just return a placeholder
      angle = 90 // Default to 90 degrees
    }

    return {
      point,
      connectedWalls,
      wall1,
      wall2,
      otherWalls,
      angle,
      totalWalls: connectedWalls.length
    }
  }, [corner, getPoint, getWallsAtPoint, getWall])

  // Corner type options
  const cornerTypeOptions = [
    { value: 'square', label: 'Square Corner' },
    { value: 'rounded', label: 'Rounded Corner' },
    { value: 'chamfer', label: 'Chamfered Corner' },
    { value: 'custom', label: 'Custom Corner' }
  ]

  const handleCornerTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange('cornerType', e.target.value)
    },
    [onChange]
  )

  const handleRadiusChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Math.max(1, Math.min(500, Number(e.target.value))) // Clamp between 1mm and 500mm
      onChange('radius', createLength(value))
    },
    [onChange]
  )

  const handleSwitchMainWalls = useCallback(
    (wall1Id: string, wall2Id: string) => {
      onChange('wall1Id', wall1Id)
      onChange('wall2Id', wall2Id)

      // Update other walls list
      const remainingWalls = cornerData.connectedWalls.map(w => w.id).filter(id => id !== wall1Id && id !== wall2Id)
      onChange('otherWallIds', remainingWalls)
    },
    [onChange, cornerData.connectedWalls]
  )

  const handleFocusCorner = useCallback(() => {
    // Focus/zoom to corner
  }, [corner.pointId])

  const getCornerTypeName = (cornerType?: string): string => {
    switch (cornerType) {
      case 'rounded':
        return 'Rounded'
      case 'chamfer':
        return 'Chamfered'
      case 'custom':
        return 'Custom'
      case 'square':
      default:
        return 'Square'
    }
  }

  return (
    <div className="corner-inspector">
      <div className="inspector-header">
        <button
          className="inspector-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          <span className={`toggle-icon ${isExpanded ? 'expanded' : ''}`}>▶</span>
          <h3>Corner Properties</h3>
        </button>
      </div>

      {isExpanded && (
        <div className="inspector-content">
          {/* Basic Properties */}
          <div className="property-section">
            <h4>Corner Configuration</h4>

            <div className="property-group">
              <label htmlFor="corner-type">Corner Type</label>
              <select id="corner-type" value={(corner as any).cornerType || 'square'} onChange={handleCornerTypeChange}>
                {cornerTypeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {(corner as any).cornerType === 'rounded' && (
              <div className="property-group">
                <label htmlFor="corner-radius">Radius (mm)</label>
                <input
                  id="corner-radius"
                  type="number"
                  value={(corner as any).radius || 100}
                  onChange={handleRadiusChange}
                  min="1"
                  max="500"
                  step="1"
                />
              </div>
            )}

            {(corner as any).cornerType === 'chamfer' && (
              <div className="property-group">
                <label htmlFor="chamfer-size">Chamfer Size (mm)</label>
                <input
                  id="chamfer-size"
                  type="number"
                  value={(corner as any).chamferSize || 50}
                  onChange={e => onChange('chamferSize', createLength(Number(e.target.value)))}
                  min="1"
                  max="200"
                  step="1"
                />
              </div>
            )}
          </div>

          {/* Corner Information */}
          <div className="property-section">
            <h4>Corner Information</h4>

            <div className="corner-stats">
              <div className="corner-stat">
                <label>Angle:</label>
                <span className="stat-value">{cornerData.angle ? `${cornerData.angle.toFixed(1)}°` : 'N/A'}</span>
              </div>
              <div className="corner-stat">
                <label>Connected Walls:</label>
                <span className="stat-value">{cornerData.totalWalls}</span>
              </div>
              <div className="corner-stat">
                <label>Corner Type:</label>
                <span className="stat-value">{getCornerTypeName((corner as any).cornerType)}</span>
              </div>
            </div>

            {cornerData.point && (
              <div className="position-info">
                <label>Position:</label>
                <span className="position-value">
                  ({cornerData.point.position[0].toFixed(0)}, {cornerData.point.position[1].toFixed(0)}) mm
                </span>
              </div>
            )}
          </div>

          {/* Main Wall Configuration */}
          <div className="property-section">
            <h4>Main Wall Priority</h4>

            <div className="main-walls-info">
              <p className="info-text">
                The main walls determine how the corner is constructed. Other walls will adapt to these primary walls.
              </p>

              <div className="main-wall-list">
                <div className="main-wall-item primary">
                  <label>Primary Wall:</label>
                  <span className="wall-name">{cornerData.wall1?.id.split('_')[1]?.substring(0, 8) || 'Unknown'}</span>
                </div>
                <div className="main-wall-item secondary">
                  <label>Secondary Wall:</label>
                  <span className="wall-name">{cornerData.wall2?.id.split('_')[1]?.substring(0, 8) || 'Unknown'}</span>
                </div>
              </div>
            </div>

            {cornerData.connectedWalls.length >= 2 && (
              <div className="wall-selection">
                <h5>Switch Main Wall Priority:</h5>
                <div className="wall-buttons">
                  {cornerData.connectedWalls.slice(0, 4).map(
                    (
                      wall // Limit to 4 for UI space
                    ) => (
                      <button
                        key={wall.id}
                        className={`wall-select-btn ${
                          wall.id === corner.wall1Id ? 'primary' : wall.id === corner.wall2Id ? 'secondary' : 'other'
                        }`}
                        onClick={() => {
                          if (wall.id !== corner.wall1Id && wall.id !== corner.wall2Id) {
                            // Make this wall primary, current primary becomes secondary
                            handleSwitchMainWalls(wall.id, corner.wall1Id)
                          } else if (wall.id === corner.wall2Id) {
                            // Swap primary and secondary
                            handleSwitchMainWalls(corner.wall2Id, corner.wall1Id)
                          }
                        }}
                        title={`Wall ${wall.id}`}
                      >
                        {wall.id.split('_')[1]?.substring(0, 6) || 'Wall'}
                        {wall.id === corner.wall1Id && <span className="priority-badge">1st</span>}
                        {wall.id === corner.wall2Id && <span className="priority-badge">2nd</span>}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Other Connected Walls */}
          {cornerData.otherWalls.length > 0 && (
            <div className="property-section">
              <h4>Other Connected Walls</h4>

              <div className="other-walls">
                <div className="wall-chips">
                  {cornerData.otherWalls.map(
                    wall =>
                      wall && (
                        <span key={wall.id} className="wall-chip other-wall" title={wall.id}>
                          {wall.id.split('_')[1]?.substring(0, 6) || wall.id}
                        </span>
                      )
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Corner Actions */}
          <div className="property-section">
            <h4>Actions</h4>

            <div className="corner-actions">
              <button className="action-button primary" onClick={handleFocusCorner} title="Center view on this corner">
                <span className="action-icon">🎯</span>
                Focus Corner
              </button>

              <button
                className="action-button"
                onClick={() => {
                  // Reset to default square corner
                  onChange('cornerType', 'square')
                  onChange('radius', undefined)
                  onChange('chamferSize', undefined)
                }}
                title="Reset to square corner"
              >
                <span className="action-icon">↺</span>
                Reset to Square
              </button>

              <button
                className="action-button"
                onClick={() => {
                  // Auto-detect optimal corner type
                }}
                title="Automatically detect best corner type"
              >
                <span className="action-icon">🔍</span>
                Auto-Detect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
