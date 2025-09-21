import { useCallback, useMemo } from 'react'
import * as Select from '@radix-ui/react-select'
import { useModelStore, useModelActions } from '@/model/store'
import { createLength } from '@/types/geometry'
import { useDebouncedNumericInput } from '@/components/FloorPlanEditor/hooks/useDebouncedInput'
import { useSelectionStore } from '@/components/FloorPlanEditor/hooks/useSelectionStore'
import type { PerimeterWallId, PerimeterId, OpeningId } from '@/types/ids'
import type { OpeningType } from '@/types/model'

interface OpeningInspectorProps {
  perimeterId: PerimeterId
  wallId: PerimeterWallId
  openingId: OpeningId
}

// Opening type options - moved outside component to avoid recreation
const OPENING_TYPE_OPTIONS: { value: OpeningType; label: string }[] = [
  { value: 'door', label: 'Door' },
  { value: 'window', label: 'Window' },
  { value: 'passage', label: 'Passage' }
]

export function OpeningInspector({ perimeterId, wallId, openingId }: OpeningInspectorProps): React.JSX.Element {
  // Get model store functions - use specific selectors for stable references
  const select = useSelectionStore()
  const { updatePerimeterWallOpening: updateOpening, removePerimeterWallOpening: removeOpeningFromOuterWall } =
    useModelActions()

  // Get perimeter from store
  const perimeter = useModelStore(state => state.perimeters.get(perimeterId))

  // Use useMemo to find wall and opening within the wall object
  const wall = useMemo(() => {
    return perimeter?.walls.find(w => w.id === wallId)
  }, [perimeter, wallId])

  const opening = useMemo(() => {
    return wall?.openings.find(o => o.id === openingId)
  }, [wall, openingId])

  // Debounced input handlers for numeric values
  const widthInput = useDebouncedNumericInput(
    opening?.width || 0,
    useCallback(
      (value: number) => {
        updateOpening(perimeterId, wallId, openingId, { width: createLength(value) })
      },
      [updateOpening, perimeterId, wallId, openingId]
    ),
    {
      debounceMs: 300,
      min: 100,
      max: 5000,
      step: 10
    }
  )

  const heightInput = useDebouncedNumericInput(
    opening?.height || 0,
    useCallback(
      (value: number) => {
        updateOpening(perimeterId, wallId, openingId, { height: createLength(value) })
      },
      [updateOpening, perimeterId, wallId, openingId]
    ),
    {
      debounceMs: 300,
      min: 100,
      max: 4000,
      step: 10
    }
  )

  const offsetInput = useDebouncedNumericInput(
    opening?.offsetFromStart || 0,
    useCallback(
      (value: number) => {
        updateOpening(perimeterId, wallId, openingId, { offsetFromStart: createLength(value) })
      },
      [updateOpening, perimeterId, wallId, openingId]
    ),
    {
      debounceMs: 300,
      min: 0,
      max: (wall?.wallLength || 0) - (opening?.width || 0),
      step: 10
    }
  )

  const sillHeightInput = useDebouncedNumericInput(
    opening?.sillHeight || 0,
    useCallback(
      (value: number) => {
        updateOpening(perimeterId, wallId, openingId, {
          sillHeight: value === 0 ? undefined : createLength(value)
        })
      },
      [updateOpening, perimeterId, wallId, openingId]
    ),
    {
      debounceMs: 300,
      min: 0,
      max: 2000,
      step: 10
    }
  )

  // If opening not found, show error
  if (!opening || !wall || !perimeter || !perimeterId || !wallId) {
    return (
      <div className="p-2 bg-red-50 border border-red-200 rounded">
        <h3 className="text-xs font-semibold text-red-800">Opening Not Found</h3>
        <p className="text-xs text-red-600">Opening with ID {openingId} could not be found.</p>
      </div>
    )
  }

  // Event handlers with stable references
  const handleTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newType = e.target.value as OpeningType
      // Selects can update immediately since they don't have focus issues
      updateOpening(perimeterId, wallId, openingId, { type: newType })
    },
    [updateOpening, perimeterId, wallId, openingId]
  )

  const handleRemoveOpening = useCallback(() => {
    if (confirm('Are you sure you want to remove this opening?')) {
      select.popSelection()
      removeOpeningFromOuterWall(perimeterId, wallId, openingId)
    }
  }, [removeOpeningFromOuterWall, perimeterId, wallId, openingId])

  const area = (opening.width * opening.height) / (1000 * 1000)

  return (
    <div className="p-2">
      <div className="space-y-4">
        {/* Basic Properties */}
        <div className="space-y-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-medium text-gray-600 flex-shrink-0">Type</label>
              <Select.Root
                value={opening.type}
                onValueChange={(value: OpeningType) =>
                  handleTypeChange({ target: { value } } as React.ChangeEvent<HTMLSelectElement>)
                }
              >
                <Select.Trigger className="flex-1 min-w-0 flex items-center justify-between px-2 py-1.5 bg-white border border-gray-300 rounded text-xs text-gray-800 hover:border-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-200">
                  <Select.Value />
                  <Select.Icon className="text-gray-600">⌄</Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="bg-white border border-gray-300 rounded-md shadow-lg z-50 overflow-hidden">
                    <Select.Viewport className="p-1">
                      {OPENING_TYPE_OPTIONS.map(option => (
                        <Select.Item
                          key={option.value}
                          value={option.value}
                          className="flex items-center px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100 hover:outline-none cursor-pointer rounded"
                        >
                          <Select.ItemText>{option.label}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>

            <div className="flex items-center justify-between gap-3">
              <label htmlFor="opening-width" className="text-xs font-medium text-gray-600 flex-shrink-0">
                Width
              </label>
              <div className="relative flex-1 max-w-24">
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
                  className="unit-input w-full pl-2 py-1.5 pr-8 bg-white border border-gray-300 rounded text-xs text-right hover:border-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-200"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">
                  mm
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <label htmlFor="opening-height" className="text-xs font-medium text-gray-600 flex-shrink-0">
                Height
              </label>
              <div className="relative flex-1 max-w-24">
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
                  className="unit-input w-full pl-2 py-1.5 pr-8 bg-white border border-gray-300 rounded text-xs text-right hover:border-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-200"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">
                  mm
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="opening-offset" className="text-xs font-medium text-gray-600 flex-shrink-0">
                  Offset from Start
                </label>
                <div className="relative flex-1 max-w-24">
                  <input
                    id="opening-offset"
                    type="number"
                    value={offsetInput.value}
                    onChange={e => offsetInput.handleChange(e.target.value)}
                    onBlur={offsetInput.handleBlur}
                    onKeyDown={offsetInput.handleKeyDown}
                    min="0"
                    max={wall.wallLength - opening.width}
                    step="10"
                    className="unit-input w-full pl-2 py-1.5 pr-8 bg-white border border-gray-300 rounded text-xs text-right hover:border-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-200"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">
                    mm
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-500">Distance from the start of the wall wall</div>
            </div>

            {opening.type === 'window' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="sill-height" className="text-xs font-medium text-gray-600 flex-shrink-0">
                    Sill Height
                  </label>
                  <div className="relative flex-1 max-w-24">
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
                      className="unit-input w-full pl-2 py-1.5 pr-8 bg-white border border-gray-300 rounded text-xs text-right hover:border-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-200"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">
                      mm
                    </span>
                  </div>
                </div>
                <div className="text-xs text-gray-500">Height of window sill above floor level</div>
              </div>
            )}
          </div>
        </div>

        {/* Measurements */}
        <div className="space-y-2 pt-1 border-t border-gray-200">
          <h5 className="text-sm font-semibold text-gray-800 pb-1">Measurements</h5>
          <div className="flex justify-between items-center py-0.5">
            <span className="text-xs text-gray-600">Area:</span>
            <span className="text-xs font-medium text-gray-800">{area.toFixed(2)} m²</span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-1 border-t border-gray-200">
          <h5 className="text-sm font-semibold text-gray-800 pb-1">Actions</h5>
          <button
            className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600 focus:outline-none focus:ring-1 focus:ring-red-500"
            onClick={handleRemoveOpening}
            title="Remove this opening from the wall wall"
          >
            <span>🗑️</span>
            Remove Opening
          </button>
        </div>
      </div>
    </div>
  )
}
