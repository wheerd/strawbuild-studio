import { useCallback } from 'react'
import { useGetOuterWallById, useModelStore } from '@/model/store'
import { createLength } from '@/types/geometry'
import type { OpeningId, OuterWallId, WallSegmentId } from '@/types/ids'
import type { OpeningType } from '@/types/model'

interface OpeningInspectorProps {
  outerWallId: OuterWallId
  segmentId: WallSegmentId
  openingId: OpeningId
}

export function OpeningInspector({ outerWallId, segmentId, openingId }: OpeningInspectorProps): React.JSX.Element {
  // Get model store functions
  const modelStore = useModelStore()
  const getOuterWallById = useGetOuterWallById()
  const outerWall = getOuterWallById(outerWallId)
  const segment = outerWall?.segments.find(s => s.id === segmentId)
  const opening = segment?.openings.find(o => o.id === openingId)

  // If opening not found, show error
  if (!opening || !segment || !outerWall || !outerWallId || !segmentId) {
    return (
      <div className="opening-inspector error">
        <h3>Opening Not Found</h3>
        <p>Opening with ID {openingId} could not be found.</p>
      </div>
    )
  }

  // Opening type options
  const openingTypeOptions: { value: OpeningType; label: string }[] = [
    { value: 'door', label: 'Door' },
    { value: 'window', label: 'Window' },
    { value: 'passage', label: 'Passage' }
  ]

  // Event handlers
  const handleTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newType = e.target.value as OpeningType
      modelStore.updateOpening(outerWallId, segmentId, openingId, { type: newType })
    },
    [modelStore, outerWallId, segmentId, openingId]
  )

  const handleWidthChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Math.max(100, Math.min(5000, Number(e.target.value))) // Clamp between 100mm and 5000mm
      modelStore.updateOpening(outerWallId, segmentId, openingId, { width: createLength(value) })
    },
    [modelStore, outerWallId, segmentId, openingId]
  )

  const handleHeightChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Math.max(100, Math.min(4000, Number(e.target.value))) // Clamp between 100mm and 4000mm
      modelStore.updateOpening(outerWallId, segmentId, openingId, { height: createLength(value) })
    },
    [modelStore, outerWallId, segmentId, openingId]
  )

  const handleOffsetChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Math.max(0, Math.min(segment.insideLength - opening.width, Number(e.target.value)))
      modelStore.updateOpening(outerWallId, segmentId, openingId, { offsetFromStart: createLength(value) })
    },
    [modelStore, outerWallId, segmentId, openingId, segment.insideLength, opening.width]
  )

  const handleSillHeightChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Math.max(0, Math.min(2000, Number(e.target.value))) // Clamp between 0mm and 2000mm
      modelStore.updateOpening(outerWallId, segmentId, openingId, {
        sillHeight: value === 0 ? undefined : createLength(value)
      })
    },
    [modelStore, outerWallId, segmentId, openingId]
  )

  const handleRemoveOpening = useCallback(() => {
    if (confirm('Are you sure you want to remove this opening?')) {
      modelStore.removeOpeningFromOuterWall(outerWallId, segmentId, openingId)
    }
  }, [modelStore, outerWallId, segmentId, openingId])

  const area = (opening.width * opening.height) / (1000 * 1000)

  return (
    <div className="opening-inspector">
      <div className="inspector-header">
        <h3>{opening.type.charAt(0).toUpperCase() + opening.type.slice(1)} Properties</h3>
      </div>

      <div className="inspector-content">
        {/* Basic Properties */}
        <div className="property-section">
          <h4>Opening Properties</h4>

          <div className="property-group">
            <label htmlFor="opening-type">Type</label>
            <select id="opening-type" value={opening.type} onChange={handleTypeChange}>
              {openingTypeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="property-group">
            <label htmlFor="opening-width">Width (mm)</label>
            <input
              id="opening-width"
              type="number"
              value={opening.width}
              onChange={handleWidthChange}
              min="100"
              max="5000"
              step="10"
            />
          </div>

          <div className="property-group">
            <label htmlFor="opening-height">Height (mm)</label>
            <input
              id="opening-height"
              type="number"
              value={opening.height}
              onChange={handleHeightChange}
              min="100"
              max="4000"
              step="10"
            />
          </div>

          <div className="property-group">
            <label htmlFor="opening-offset">Offset from Start (mm)</label>
            <input
              id="opening-offset"
              type="number"
              value={opening.offsetFromStart}
              onChange={handleOffsetChange}
              min="0"
              max={segment.insideLength - opening.width}
              step="10"
            />
            <div className="help-text">Distance from the start of the wall segment</div>
          </div>

          {opening.type === 'window' && (
            <div className="property-group">
              <label htmlFor="sill-height">Sill Height (mm)</label>
              <input
                id="sill-height"
                type="number"
                value={opening.sillHeight || 0}
                onChange={handleSillHeightChange}
                min="0"
                max="2000"
                step="10"
              />
              <div className="help-text">Height of window sill above floor level</div>
            </div>
          )}
        </div>

        {/* Measurements */}
        <div className="property-section">
          <div className="measurements-grid">
            <div className="measurement">
              <label>Area:</label>
              <span className="measurement-value">{area.toFixed(2)} m²</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="property-section">
          <h4>Actions</h4>

          <div className="opening-actions">
            <button
              className="action-button danger"
              onClick={handleRemoveOpening}
              title="Remove this opening from the wall segment"
            >
              <span className="action-icon">🗑️</span>
              Remove Opening
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
