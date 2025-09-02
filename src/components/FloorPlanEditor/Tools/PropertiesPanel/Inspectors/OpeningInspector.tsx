import { useCallback, useState, useEffect, useMemo } from 'react'
import { useModelStore } from '@/model/store'
import { createLength } from '@/types/geometry'
import type { OpeningId, OuterWallId, WallSegmentId } from '@/types/ids'
import type { OpeningType } from '@/types/model'

interface OpeningInspectorProps {
  outerWallId: OuterWallId
  segmentId: WallSegmentId
  openingId: OpeningId
}

// Opening type options - moved outside component to avoid recreation
const OPENING_TYPE_OPTIONS: { value: OpeningType; label: string }[] = [
  { value: 'door', label: 'Door' },
  { value: 'window', label: 'Window' },
  { value: 'passage', label: 'Passage' }
]

export function OpeningInspector({ outerWallId, segmentId, openingId }: OpeningInspectorProps): React.JSX.Element {
  // Get model store functions - use specific selectors for stable references
  const updateOpening = useModelStore(state => state.updateOpening)
  const removeOpeningFromOuterWall = useModelStore(state => state.removeOpeningFromOuterWall)

  // Get outer wall from store
  const outerWall = useModelStore(state => state.outerWalls.get(outerWallId))

  // Use useMemo to find segment and opening within the wall object
  const segment = useMemo(() => {
    return outerWall?.segments.find(s => s.id === segmentId)
  }, [outerWall, segmentId])

  const opening = useMemo(() => {
    return segment?.openings.find(o => o.id === openingId)
  }, [segment, openingId])

  // Local state for inputs to prevent unfocus on store updates
  const [localWidth, setLocalWidth] = useState<string>('')
  const [localHeight, setLocalHeight] = useState<string>('')
  const [localOffset, setLocalOffset] = useState<string>('')
  const [localSillHeight, setLocalSillHeight] = useState<string>('')

  // Sync local state with store data
  useEffect(() => {
    if (opening) {
      setLocalWidth(String(opening.width))
      setLocalHeight(String(opening.height))
      setLocalOffset(String(opening.offsetFromStart))
      setLocalSillHeight(String(opening.sillHeight || 0))
    }
  }, [opening?.width, opening?.height, opening?.offsetFromStart, opening?.sillHeight])

  // If opening not found, show error
  if (!opening || !segment || !outerWall || !outerWallId || !segmentId) {
    return (
      <div className="opening-inspector error">
        <h3>Opening Not Found</h3>
        <p>Opening with ID {openingId} could not be found.</p>
      </div>
    )
  }

  // Event handlers with stable references
  const handleTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newType = e.target.value as OpeningType
      // Selects can update immediately since they don't have focus issues
      updateOpening(outerWallId, segmentId, openingId, { type: newType })
    },
    [updateOpening, outerWallId, segmentId, openingId]
  )

  // Width handlers - local state + blur
  const handleWidthChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalWidth(e.target.value)
  }, [])

  const handleWidthBlur = useCallback(() => {
    const value = Math.max(100, Math.min(5000, Number(localWidth))) // Clamp between 100mm and 5000mm
    updateOpening(outerWallId, segmentId, openingId, { width: createLength(value) })
    setLocalWidth(String(value))
  }, [localWidth, updateOpening, outerWallId, segmentId, openingId])

  // Height handlers - local state + blur
  const handleHeightChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalHeight(e.target.value)
  }, [])

  const handleHeightBlur = useCallback(() => {
    const value = Math.max(100, Math.min(4000, Number(localHeight))) // Clamp between 100mm and 4000mm
    updateOpening(outerWallId, segmentId, openingId, { height: createLength(value) })
    setLocalHeight(String(value))
  }, [localHeight, updateOpening, outerWallId, segmentId, openingId])

  // Offset handlers - local state + blur
  const handleOffsetChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalOffset(e.target.value)
  }, [])

  const handleOffsetBlur = useCallback(() => {
    if (!segment || !opening) return
    const value = Math.max(0, Math.min(segment.insideLength - opening.width, Number(localOffset)))
    updateOpening(outerWallId, segmentId, openingId, { offsetFromStart: createLength(value) })
    setLocalOffset(String(value))
  }, [localOffset, updateOpening, outerWallId, segmentId, openingId, segment?.insideLength, opening?.width])

  // Sill height handlers - local state + blur
  const handleSillHeightChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSillHeight(e.target.value)
  }, [])

  const handleSillHeightBlur = useCallback(() => {
    const value = Math.max(0, Math.min(2000, Number(localSillHeight))) // Clamp between 0mm and 2000mm
    updateOpening(outerWallId, segmentId, openingId, {
      sillHeight: value === 0 ? undefined : createLength(value)
    })
    setLocalSillHeight(String(value))
  }, [localSillHeight, updateOpening, outerWallId, segmentId, openingId])

  const handleRemoveOpening = useCallback(() => {
    if (confirm('Are you sure you want to remove this opening?')) {
      removeOpeningFromOuterWall(outerWallId, segmentId, openingId)
    }
  }, [removeOpeningFromOuterWall, outerWallId, segmentId, openingId])

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
              {OPENING_TYPE_OPTIONS.map(option => (
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
              value={localWidth}
              onChange={handleWidthChange}
              onBlur={handleWidthBlur}
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
              value={localHeight}
              onChange={handleHeightChange}
              onBlur={handleHeightBlur}
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
              value={localOffset}
              onChange={handleOffsetChange}
              onBlur={handleOffsetBlur}
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
                value={localSillHeight}
                onChange={handleSillHeightChange}
                onBlur={handleSillHeightBlur}
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
