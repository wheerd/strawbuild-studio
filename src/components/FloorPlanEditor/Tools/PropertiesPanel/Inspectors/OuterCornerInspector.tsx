import { useCallback, useMemo } from 'react'
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
      <div className="outer-corner-inspector error">
        <h3>Outer Corner Not Found</h3>
        <p>Outer corner with ID {cornerId} could not be found.</p>
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

  // Get boundary point
  const boundaryPoint = outerWall.boundary[cornerIndex]

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
    <div className="outer-corner-inspector">
      <div className="inspector-header">
        <h3>Outer Corner Properties</h3>
      </div>

      <div className="inspector-content">
        {/* Basic Properties */}
        <div className="property-section">
          <h4>Corner Configuration</h4>

          <div className="property-group">
            <label htmlFor="belongs-to">Belongs To</label>
            <select id="belongs-to" value={corner.belongsTo} onChange={handleBelongsToChange}>
              <option value="previous">Previous Segment</option>
              <option value="next">Next Segment</option>
            </select>
            <div className="help-text">Determines which wall segment owns this corner for construction purposes.</div>
          </div>
        </div>

        {/* Position Information */}
        <div className="property-section">
          <h4>Position</h4>

          <div className="position-info">
            <div className="position-detail">
              <label>Boundary Point:</label>
              <span>
                ({boundaryPoint[0].toFixed(0)}, {boundaryPoint[1].toFixed(0)}) mm
              </span>
            </div>
            <div className="position-detail">
              <label>Outside Point:</label>
              <span>
                ({corner.outsidePoint[0].toFixed(0)}, {corner.outsidePoint[1].toFixed(0)}) mm
              </span>
            </div>
            <div className="position-detail">
              <label>Corner Index:</label>
              <span>
                {cornerIndex + 1} of {outerWall.corners.length}
              </span>
            </div>
          </div>
        </div>

        {/* Geometry Information */}
        <div className="property-section">
          <h4>Geometry</h4>

          <div className="geometry-info">
            {cornerAngle && (
              <div className="geometry-detail">
                <label>Interior Angle:</label>
                <span>{cornerAngle.toFixed(1)}°</span>
              </div>
            )}

            <div className="geometry-detail">
              <label>Corner Type:</label>
              <span>
                {cornerAngle && cornerAngle > 170
                  ? 'Nearly Straight'
                  : cornerAngle && cornerAngle > 120
                    ? 'Obtuse'
                    : cornerAngle && cornerAngle > 60
                      ? 'Right/Acute'
                      : 'Sharp'}
              </span>
            </div>
          </div>
        </div>

        {/* Adjacent Segments */}
        <div className="property-section">
          <h4>Adjacent Segments</h4>

          <div className="adjacent-segments">
            <div className={`segment-info ${corner.belongsTo === 'previous' ? 'owner' : ''}`}>
              <div className="segment-header">
                <span className="segment-label">Previous Segment</span>
                {corner.belongsTo === 'previous' && <span className="owner-badge">Owner</span>}
              </div>
              <div className="segment-details">
                <span className="segment-type">{previousSegment.constructionType}</span>
                <span className="segment-thickness">{previousSegment.thickness}mm</span>
                <span className="segment-length">{(previousSegment.insideLength / 1000).toFixed(2)}m</span>
              </div>
            </div>

            <div className={`segment-info ${corner.belongsTo === 'next' ? 'owner' : ''}`}>
              <div className="segment-header">
                <span className="segment-label">Next Segment</span>
                {corner.belongsTo === 'next' && <span className="owner-badge">Owner</span>}
              </div>
              <div className="segment-details">
                <span className="segment-type">{nextSegment.constructionType}</span>
                <span className="segment-thickness">{nextSegment.thickness}mm</span>
                <span className="segment-length">{(nextSegment.insideLength / 1000).toFixed(2)}m</span>
              </div>
            </div>
          </div>
        </div>

        {/* Construction Notes */}
        <div className="property-section">
          <h4>Construction Notes</h4>

          <div className="construction-notes">
            <div className="note-item">
              <span className="note-label">Owner Segment:</span>
              <span className="note-text">
                The {corner.belongsTo} segment will determine how this corner is constructed.
              </span>
            </div>

            {previousSegment.constructionType !== nextSegment.constructionType && (
              <div className="note-item warning">
                <span className="note-label">Mixed Construction:</span>
                <span className="note-text">
                  Adjacent segments use different construction types. Special attention may be needed at this corner.
                </span>
              </div>
            )}

            {Math.abs(previousSegment.thickness - nextSegment.thickness) > 50 && (
              <div className="note-item warning">
                <span className="note-label">Thickness Difference:</span>
                <span className="note-text">
                  Adjacent segments have different thicknesses (
                  {Math.abs(previousSegment.thickness - nextSegment.thickness)}mm difference).
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Parent Wall Information */}
        <div className="property-section">
          <h4>Parent Wall</h4>
          <div className="parent-wall-info">
            <div className="parent-detail">
              <label>Outer Wall ID:</label>
              <span>{outerWallId}</span>
            </div>
            <div className="parent-detail">
              <label>Floor ID:</label>
              <span>{outerWall.floorId}</span>
            </div>
            <div className="parent-detail">
              <label>Position in Wall:</label>
              <span>
                Corner {cornerIndex + 1} of {outerWall.corners.length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
