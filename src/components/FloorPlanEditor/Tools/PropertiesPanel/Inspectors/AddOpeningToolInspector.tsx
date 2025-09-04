import { useCallback } from 'react'
import { createLength } from '@/types/geometry'
import { useDebouncedNumericInput } from '../../../hooks/useDebouncedInput'
import type { OpeningType } from '@/types/model'
import type { ToolInspectorProps } from '../../ToolSystem/types'
import type { AddOpeningTool } from '../../Categories/OuterWallTools/AddOpeningTool'

export function AddOpeningToolInspector({ tool }: ToolInspectorProps<AddOpeningTool>): React.JSX.Element {
  return <AddOpeningToolInspectorImpl tool={tool} />
}

interface AddOpeningToolInspectorImplProps {
  tool: AddOpeningTool
}

// Opening type options
const OPENING_TYPE_OPTIONS: { value: OpeningType; label: string }[] = [
  { value: 'door', label: 'Door' },
  { value: 'window', label: 'Window' },
  { value: 'passage', label: 'Passage' }
]

// Quick preset buttons for common sizes (in mm)
interface PresetConfig {
  label: string
  width: number
  height: number
  sillHeight?: number
}

const OPENING_PRESETS: Record<OpeningType, PresetConfig[]> = {
  door: [
    { label: 'Standard Door', width: 800, height: 2100 },
    { label: 'Wide Door', width: 900, height: 2100 },
    { label: 'Double Door', width: 1600, height: 2100 }
  ],
  window: [
    { label: 'Small Window', width: 800, height: 1200, sillHeight: 800 },
    { label: 'Standard Window', width: 1200, height: 1200, sillHeight: 800 },
    { label: 'Large Window', width: 1600, height: 1400, sillHeight: 600 },
    { label: 'Floor Window', width: 1200, height: 2000, sillHeight: 100 }
  ],
  passage: [
    { label: 'Standard Passage', width: 1000, height: 2200 },
    { label: 'Wide Passage', width: 1500, height: 2200 }
  ]
}

function AddOpeningToolInspectorImpl({ tool }: AddOpeningToolInspectorImplProps): React.JSX.Element {
  const { state } = tool

  // Debounced input handlers for numeric values
  const widthInput = useDebouncedNumericInput(
    state.width,
    useCallback(
      (value: number) => {
        tool.setWidth(createLength(value))
      },
      [tool]
    ),
    {
      debounceMs: 300,
      min: 100,
      max: 5000,
      step: 10
    }
  )

  const heightInput = useDebouncedNumericInput(
    state.height,
    useCallback(
      (value: number) => {
        tool.setHeight(createLength(value))
      },
      [tool]
    ),
    {
      debounceMs: 300,
      min: 100,
      max: 4000,
      step: 10
    }
  )

  const sillHeightInput = useDebouncedNumericInput(
    state.sillHeight || 0,
    useCallback(
      (value: number) => {
        const sillHeight = value === 0 ? undefined : createLength(value)
        tool.setSillHeight(sillHeight)
      },
      [tool]
    ),
    {
      debounceMs: 300,
      min: 0,
      max: 2000,
      step: 10
    }
  )

  // Event handlers with stable references
  const handleTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newType = e.target.value as OpeningType
      tool.setOpeningType(newType)
    },
    [tool]
  )

  const handlePresetClick = useCallback(
    (preset: PresetConfig) => {
      tool.setWidth(createLength(preset.width))
      tool.setHeight(createLength(preset.height))
      if (preset.sillHeight !== undefined) {
        tool.setSillHeight(createLength(preset.sillHeight))
      } else {
        tool.setSillHeight(undefined)
      }
    },
    [tool]
  )

  // Calculate area for display
  const area = (state.width * state.height) / (1000 * 1000) // Convert mm² to m²

  return (
    <div className="add-opening-tool-inspector">
      <div className="inspector-header">
        <h3>Add Opening Tool</h3>
        <div className="tool-status">
          {state.hoveredWallSegment ? (
            <span className="status-ready">{state.canPlace ? '✓ Ready to place' : '⚠️ Invalid position'}</span>
          ) : (
            <span className="status-waiting">Hover over a wall segment</span>
          )}
        </div>
      </div>

      <div className="inspector-content">
        {/* Opening Type */}
        <div className="property-section">
          <h4>Opening Type</h4>

          <div className="property-group">
            <label htmlFor="opening-type">Type</label>
            <select id="opening-type" value={state.openingType} onChange={handleTypeChange}>
              {OPENING_TYPE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Presets */}
          <div className="property-group">
            <label>Quick Presets</label>
            <div className="preset-buttons">
              {OPENING_PRESETS[state.openingType].map((preset: PresetConfig, index: number) => (
                <button
                  key={index}
                  type="button"
                  className="preset-button"
                  onClick={() => handlePresetClick(preset)}
                  title={`${preset.width}×${preset.height}mm${preset.sillHeight ? `, sill: ${preset.sillHeight}mm` : ''}`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dimensions */}
        <div className="property-section">
          <h4>Dimensions</h4>

          <div className="property-group">
            <label htmlFor="opening-width">Width (mm)</label>
            <input
              id="opening-width"
              type="number"
              value={widthInput.value}
              onChange={e => widthInput.handleChange(e.target.value)}
              onBlur={widthInput.handleBlur}
              onKeyDown={widthInput.handleKeyDown}
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
              value={heightInput.value}
              onChange={e => heightInput.handleChange(e.target.value)}
              onBlur={heightInput.handleBlur}
              onKeyDown={heightInput.handleKeyDown}
              min="100"
              max="4000"
              step="10"
            />
          </div>

          {state.openingType === 'window' && (
            <div className="property-group">
              <label htmlFor="sill-height">Sill Height (mm)</label>
              <input
                id="sill-height"
                type="number"
                value={sillHeightInput.value}
                onChange={e => sillHeightInput.handleChange(e.target.value)}
                onBlur={sillHeightInput.handleBlur}
                onKeyDown={sillHeightInput.handleKeyDown}
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
              <label>Opening Area:</label>
              <span className="measurement-value">{area.toFixed(2)} m²</span>
            </div>
            {state.isSnapped && (
              <div className="measurement">
                <label>Position:</label>
                <span className="measurement-value snap-indicator">📍 Snapped</span>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="property-section">
          <h4>Instructions</h4>
          <div className="instruction-text">
            <p>1. Configure the opening type and dimensions above</p>
            <p>2. Hover over a wall segment to see preview</p>
            <p>3. Click to place the opening at the desired position</p>
            <p>4. The tool will automatically snap to valid positions</p>
          </div>
        </div>
      </div>
    </div>
  )
}
