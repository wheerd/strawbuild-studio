import { useCallback, useMemo } from 'react'
import * as Select from '@radix-ui/react-select'
import { useModelActions, useModelStore } from '@/model/store'
import { createLength } from '@/types/geometry'
import { useDebouncedNumericInput } from '@/components/FloorPlanEditor/hooks/useDebouncedInput'
import { formatLength } from '@/utils/formatLength'
import type { PerimeterWallId, PerimeterId, PerimeterConstructionMethodId } from '@/types/ids'
import { usePerimeterConstructionMethods, usePerimeterConstructionMethodById } from '@/config/store'
import { WallConstructionPlanModal } from '@/components/FloorPlanEditor/WallConstructionPlan'
import { constructInfillWall, type InfillConstructionConfig } from '@/construction'

interface PerimeterWallInspectorProps {
  perimeterId: PerimeterId
  wallId: PerimeterWallId
}

export function PerimeterWallInspector({ perimeterId, wallId }: PerimeterWallInspectorProps): React.JSX.Element {
  const allPerimeterMethods = usePerimeterConstructionMethods()
  const outerWall = useModelStore(state => state.perimeters.get(perimeterId))

  const {
    getStoreyById,
    updatePerimeterWallThickness: updateOuterWallThickness,
    updatePerimeterWallConstructionMethod: updateOuterWallConstructionMethod
  } = useModelActions()

  // Use useMemo to find wall within the wall object
  const wall = useMemo(() => {
    return outerWall?.walls.find(s => s.id === wallId)
  }, [outerWall, wallId])

  // Debounced thickness input handler
  const thicknessInput = useDebouncedNumericInput(
    wall?.thickness || 0,
    useCallback(
      (value: number) => {
        updateOuterWallThickness(perimeterId, wallId, createLength(value))
      },
      [updateOuterWallThickness, perimeterId, wallId]
    ),
    {
      debounceMs: 300,
      min: 50,
      max: 1500,
      step: 10
    }
  )

  // If wall not found, show error
  if (!wall || !outerWall) {
    return (
      <div className="perimeter-wall-inspector error">
        <h3>Wall Wall Not Found</h3>
        <p>Wall wall with ID {wallId} could not be found.</p>
      </div>
    )
  }

  const storey = getStoreyById(outerWall.storeyId)

  // Get construction method for this wall
  const constructionMethod = wall?.constructionMethodId
    ? usePerimeterConstructionMethodById(wall.constructionMethodId)
    : null

  const constructionPlan = useMemo(() => {
    if (!outerWall || !wall || !storey || !constructionMethod) return null

    // For now, only support infill construction until other types are implemented
    if (constructionMethod.config.type === 'infill') {
      return constructInfillWall(wall, outerWall, storey.height, constructionMethod.config as InfillConstructionConfig)
    }

    // TODO: Add support for other construction types
    return null
  }, [wall, outerWall, storey, constructionMethod])

  return (
    <div className="p-2">
      <div className="space-y-4">
        {/* Basic Properties */}
        <div className="space-y-2">
          <div className="space-y-1.5">
            {/* Construction Method */}
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-medium text-gray-600 flex-shrink-0">Construction Method</label>
              <Select.Root
                value={wall.constructionMethodId || ''}
                onValueChange={(value: PerimeterConstructionMethodId) => {
                  updateOuterWallConstructionMethod(perimeterId, wallId, value)
                }}
              >
                <Select.Trigger className="flex-1 min-w-0 flex items-center justify-between px-2 py-1.5 bg-white border border-gray-300 rounded text-xs text-gray-800 hover:border-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-200">
                  <Select.Value placeholder="Select method" />
                  <Select.Icon className="text-gray-600">⌄</Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="bg-white border border-gray-300 rounded-md shadow-lg z-50 overflow-hidden">
                    <Select.Viewport className="p-1">
                      {allPerimeterMethods.map(method => (
                        <Select.Item
                          key={method.id}
                          value={method.id}
                          className="flex items-center px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100 hover:outline-none cursor-pointer rounded"
                        >
                          <Select.ItemText>{method.name}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>

            {/* Thickness Input */}
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="wall-thickness" className="text-xs font-medium text-gray-600 flex-shrink-0">
                Thickness
              </label>
              <div className="relative flex-1 max-w-24">
                <input
                  id="wall-thickness"
                  type="number"
                  value={thicknessInput.value}
                  onChange={e => thicknessInput.handleChange(e.target.value)}
                  onBlur={thicknessInput.handleBlur}
                  onKeyDown={thicknessInput.handleKeyDown}
                  min="50"
                  max="1500"
                  step="10"
                  className="unit-input w-full pl-2 py-1.5 pr-8 bg-white border border-gray-300 rounded text-xs text-right hover:border-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-200"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">
                  mm
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Measurements */}
        <div className="space-y-2 pt-1 border-t border-gray-200">
          <h5 className="text-sm font-semibold text-gray-800 pb-1">Measurements</h5>

          <div className="space-y-1">
            <div className="flex justify-between items-center py-0.5">
              <span className="text-xs text-gray-600">Inside Length:</span>
              <span className="text-xs font-medium text-gray-800">{formatLength(wall.insideLength)}</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-xs text-gray-600">Outside Length:</span>
              <span className="text-xs font-medium text-gray-800">{formatLength(wall.outsideLength)}</span>
            </div>
          </div>
        </div>

        {/* Openings */}
        <div className="space-y-2 pt-1 border-t border-gray-200">
          <h5 className="text-sm font-semibold text-gray-800 pb-1">Openings</h5>

          <div className="grid grid-cols-3 gap-1.5">
            <div className="text-center p-1.5 bg-gray-50 rounded">
              <div className="text-sm font-semibold text-gray-800">
                {wall.openings.filter(o => o.type === 'door').length}
              </div>
              <div className="text-xs text-gray-600">Doors</div>
            </div>
            <div className="text-center p-1.5 bg-gray-50 rounded">
              <div className="text-sm font-semibold text-gray-800">
                {wall.openings.filter(o => o.type === 'window').length}
              </div>
              <div className="text-xs text-gray-600">Windows</div>
            </div>
            <div className="text-center p-1.5 bg-gray-50 rounded">
              <div className="text-sm font-semibold text-gray-800">
                {wall.openings.filter(o => o.type === 'passage').length}
              </div>
              <div className="text-xs text-gray-600">Passages</div>
            </div>
          </div>
        </div>

        {/* Construction Plan */}
        <div className="pt-2 border-t border-gray-200">
          {constructionPlan && (
            <WallConstructionPlanModal plan={constructionPlan}>
              <button className="w-full px-3 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 rounded transition-colors">
                View Construction Plan
              </button>
            </WallConstructionPlanModal>
          )}
        </div>
      </div>
    </div>
  )
}
