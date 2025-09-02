import { useCallback, useState, useEffect, useMemo } from 'react'
import { useModelStore } from '@/model/store'
import { createLength } from '@/types/geometry'
import type { WallSegmentId, OuterWallId } from '@/types/ids'
import type { OuterWallConstructionType } from '@/types/model'

interface WallSegmentInspectorProps {
  outerWallId: OuterWallId
  segmentId: WallSegmentId
}

// Construction type options - moved outside component to avoid recreation
const CONSTRUCTION_TYPE_OPTIONS: { value: OuterWallConstructionType; label: string }[] = [
  { value: 'cells-under-tension', label: 'CUT' },
  { value: 'infill', label: 'Infill' },
  { value: 'strawhenge', label: 'Strawhenge' },
  { value: 'non-strawbale', label: 'Non-Strawbale' }
]

export function WallSegmentInspector({ outerWallId, segmentId }: WallSegmentInspectorProps): React.JSX.Element {
  // Get model store functions - use specific selectors for stable references
  const updateOuterWallConstructionType = useModelStore(state => state.updateOuterWallConstructionType)
  const updateOuterWallThickness = useModelStore(state => state.updateOuterWallThickness)

  // Get outer wall from store
  const outerWall = useModelStore(state => state.outerWalls.get(outerWallId))

  // Use useMemo to find segment within the wall object
  const segment = useMemo(() => {
    return outerWall?.segments.find(s => s.id === segmentId)
  }, [outerWall, segmentId])

  // Local state for inputs to prevent unfocus on store updates
  const [localThickness, setLocalThickness] = useState<string>('')

  // Sync local state with store data
  useEffect(() => {
    if (segment) {
      setLocalThickness(String(segment.thickness))
    }
  }, [segment?.thickness])

  // Event handlers with stable references
  const handleConstructionTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newType = e.target.value as OuterWallConstructionType
      // Selects can update immediately since they don't have focus issues
      updateOuterWallConstructionType(outerWallId, segmentId, newType)
    },
    [updateOuterWallConstructionType, outerWallId, segmentId]
  )

  // Handle thickness input changes - update local state immediately
  const handleThicknessChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalThickness(e.target.value)
  }, [])

  // Handle thickness blur - update store when user finishes editing
  const handleThicknessBlur = useCallback(() => {
    const value = Math.max(50, Math.min(1500, Number(localThickness))) // Clamp between 50mm and 1500mm
    updateOuterWallThickness(outerWallId, segmentId, createLength(value))
    // Update local state to reflect the clamped value
    setLocalThickness(String(value))
  }, [localThickness, updateOuterWallThickness, outerWallId, segmentId])

  // If segment not found, show error
  if (!segment || !outerWall) {
    return (
      <div className="wall-segment-inspector error">
        <h3>Wall Segment Not Found</h3>
        <p>Wall segment with ID {segmentId} could not be found.</p>
      </div>
    )
  }

  return (
    <div className="wall-segment-inspector">
      <div className="inspector-content">
        {/* Basic Properties */}
        <div className="property-section">
          <h4>Construction Properties</h4>

          <div className="property-group">
            <label htmlFor="construction-type">Construction Type</label>
            <select id="construction-type" value={segment.constructionType} onChange={handleConstructionTypeChange}>
              {CONSTRUCTION_TYPE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="property-group">
            <label htmlFor="segment-thickness">Thickness (mm)</label>
            <input
              id="segment-thickness"
              type="number"
              value={localThickness}
              onChange={handleThicknessChange}
              onBlur={handleThicknessBlur}
              min="50"
              max="1500"
              step="10"
            />
          </div>
        </div>

        {/* Measurements */}
        <div className="property-section">
          <h4>Measurements</h4>

          <div className="measurements-grid">
            <div className="measurement">
              <label>Inside Length:</label>
              <span className="measurement-value">{(segment.insideLength / 1000).toFixed(3)} m</span>
            </div>
            <div className="measurement">
              <label>Outside Length:</label>
              <span className="measurement-value">{(segment.outsideLength / 1000).toFixed(3)} m</span>
            </div>
          </div>
        </div>

        {/* Openings */}
        <div className="property-section">
          <h4>Openings</h4>

          <div className="measurements-grid">
            <div className="measurement">
              <label>Doors:</label>
              <span className="measurement-value">{segment.openings.filter(o => o.type === 'door').length}</span>
            </div>
            <div className="measurement">
              <label>Windows:</label>
              <span className="measurement-value">{segment.openings.filter(o => o.type === 'window').length}</span>
            </div>
            <div className="measurement">
              <label>Passages:</label>
              <span className="measurement-value">{segment.openings.filter(o => o.type === 'passage').length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
