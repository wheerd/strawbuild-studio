import { useCallback } from 'react'
import { useGetOuterWallById, useModelStore } from '@/model/store'
import { createLength } from '@/types/geometry'
import type { WallSegmentId, OuterWallId } from '@/types/ids'
import type { OuterWallConstructionType } from '@/types/model'

interface WallSegmentInspectorProps {
  outerWallId: OuterWallId
  segmentId: WallSegmentId
}

export function WallSegmentInspector({ outerWallId, segmentId }: WallSegmentInspectorProps): React.JSX.Element {
  // Get model store functions
  const modelStore = useModelStore()
  const getOuterWallById = useGetOuterWallById()
  const outerWall = getOuterWallById(outerWallId)
  const segment = outerWall?.segments.find(s => s.id === segmentId)

  // If segment not found, show error
  if (!segment || !outerWall) {
    return (
      <div className="wall-segment-inspector error">
        <h3>Wall Segment Not Found</h3>
        <p>Wall segment with ID {segmentId} could not be found.</p>
      </div>
    )
  }

  // Construction type options
  const constructionTypeOptions: { value: OuterWallConstructionType; label: string }[] = [
    { value: 'cells-under-tension', label: 'CUT' },
    { value: 'infill', label: 'Infill' },
    { value: 'strawhenge', label: 'Strawhenge' },
    { value: 'non-strawbale', label: 'Non-Strawbale' }
  ]

  // Event handlers
  const handleConstructionTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newType = e.target.value as OuterWallConstructionType
      modelStore.updateOuterWallConstructionType(outerWallId, segmentId, newType)
    },
    [modelStore, outerWallId, segmentId]
  )

  const handleThicknessChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Math.max(50, Math.min(1500, Number(e.target.value))) // Clamp between 50mm and 1500mm
      modelStore.updateOuterWallThickness(outerWallId, segmentId, createLength(value))
    },
    [modelStore, outerWallId, segmentId]
  )

  return (
    <div className="wall-segment-inspector">
      <div className="inspector-header">
        <h3>Wall Segment Properties</h3>
      </div>

      <div className="inspector-content">
        {/* Basic Properties */}
        <div className="property-section">
          <h4>Construction Properties</h4>

          <div className="property-group">
            <label htmlFor="construction-type">Construction Type</label>
            <select id="construction-type" value={segment.constructionType} onChange={handleConstructionTypeChange}>
              {constructionTypeOptions.map(option => (
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
              value={segment.thickness}
              onChange={handleThicknessChange}
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
