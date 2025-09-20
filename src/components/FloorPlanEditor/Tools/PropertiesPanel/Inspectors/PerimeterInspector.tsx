import React from 'react'
import * as Select from '@radix-ui/react-select'
import { useModelStore } from '@/model/store'
import type { PerimeterId, RingBeamConstructionMethodId } from '@/types/ids'
import { calculatePolygonArea, type Length } from '@/types/geometry'
import { useRingBeamConstructionMethods } from '@/config/store'
import { RingBeamConstructionModal } from '@/components/FloorPlanEditor/RingBeamConstructionModal'
import { formatLength } from '@/utils/formatLength'

interface PerimeterInspectorProps {
  selectedId: PerimeterId
}

export function PerimeterInspector({ selectedId }: PerimeterInspectorProps): React.JSX.Element {
  // Get perimeter data from model store
  const outerWall = useModelStore(state => state.perimeters.get(selectedId))

  // Get ring beam methods from config store
  const allRingBeamMethods = useRingBeamConstructionMethods()

  // Get store actions for updating ring beams
  const setPerimeterBaseRingBeam = useModelStore(state => state.setPerimeterBaseRingBeam)
  const setPerimeterTopRingBeam = useModelStore(state => state.setPerimeterTopRingBeam)
  const removePerimeterBaseRingBeam = useModelStore(state => state.removePerimeterBaseRingBeam)
  const removePerimeterTopRingBeam = useModelStore(state => state.removePerimeterTopRingBeam)

  // If perimeter not found, show error
  if (!outerWall) {
    return (
      <div className="p-2 bg-red-50 border border-red-200 rounded">
        <h3 className="text-xs font-semibold text-red-800">Perimeter Wall Not Found</h3>
        <p className="text-xs text-red-600">Perimeter with ID {selectedId} could not be found.</p>
      </div>
    )
  }

  const totalPerimeter = outerWall.walls.reduce((l, s) => l + s.insideLength, 0)
  const totalArea = calculatePolygonArea({ points: outerWall.corners.map(c => c.insidePoint) })

  return (
    <div className="p-2">
      <div className="space-y-3">
        {/* Basic Information */}
        <div className="space-y-2">
          <div className="space-y-1">
            <div className="flex justify-between items-center py-0.5">
              <span className="text-xs text-gray-600">Total Perimeter:</span>
              <span className="text-xs font-medium text-gray-800">{formatLength(totalPerimeter as Length)}</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-xs text-gray-600">Total Area:</span>
              <span className="text-xs font-medium text-gray-800">{(totalArea / (1000 * 1000)).toFixed(2)} m²</span>
            </div>
          </div>
        </div>

        {/* Ring Beam Configuration */}
        <div className="space-y-2 pt-1 border-t border-gray-200">
          <h5 className="text-sm font-semibold text-gray-800 pb-1">Ring Beams</h5>

          <div className="space-y-1.5">
            {/* Base Ring Beam */}
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-medium text-gray-600 flex-shrink-0">Base Plate</label>
              <Select.Root
                value={outerWall.baseRingBeamMethodId || 'none'}
                onValueChange={value => {
                  if (value === 'none') {
                    removePerimeterBaseRingBeam(selectedId)
                  } else {
                    setPerimeterBaseRingBeam(selectedId, value as RingBeamConstructionMethodId)
                  }
                }}
              >
                <Select.Trigger className="flex-1 min-w-0 flex items-center justify-between px-2 py-1.5 bg-white border border-gray-300 rounded text-xs text-gray-800 hover:border-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-200">
                  <Select.Value placeholder="None" />
                  <Select.Icon className="text-gray-600">⌄</Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="bg-white border border-gray-300 rounded-md shadow-lg z-50 overflow-hidden">
                    <Select.Viewport className="p-1">
                      <Select.Item
                        value="none"
                        className="flex items-center px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100 hover:outline-none cursor-pointer rounded"
                      >
                        <Select.ItemText>None</Select.ItemText>
                      </Select.Item>
                      {allRingBeamMethods.map(method => (
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

            {/* Base Ring Beam View Construction Button */}
            {outerWall.baseRingBeamMethodId && (
              <div className="flex justify-end">
                <RingBeamConstructionModal
                  perimeterId={selectedId}
                  position="base"
                  trigger={
                    <button className="w-full px-3 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 rounded transition-colors">
                      View Construction
                    </button>
                  }
                />
              </div>
            )}

            {/* Top Ring Beam */}
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-medium text-gray-600 flex-shrink-0">Top Plate</label>
              <Select.Root
                value={outerWall.topRingBeamMethodId || 'none'}
                onValueChange={value => {
                  if (value === 'none') {
                    removePerimeterTopRingBeam(selectedId)
                  } else {
                    setPerimeterTopRingBeam(selectedId, value as RingBeamConstructionMethodId)
                  }
                }}
              >
                <Select.Trigger className="flex-1 min-w-0 flex items-center justify-between px-2 py-1.5 bg-white border border-gray-300 rounded text-xs text-gray-800 hover:border-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-200">
                  <Select.Value placeholder="None" />
                  <Select.Icon className="text-gray-600">⌄</Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="bg-white border border-gray-300 rounded-md shadow-lg z-50 overflow-hidden">
                    <Select.Viewport className="p-1">
                      <Select.Item
                        value="none"
                        className="flex items-center px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100 hover:outline-none cursor-pointer rounded"
                      >
                        <Select.ItemText>None</Select.ItemText>
                      </Select.Item>
                      {allRingBeamMethods.map(method => (
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

            {/* Top Ring Beam View Construction Button */}
            {outerWall.topRingBeamMethodId && (
              <div className="flex justify-end">
                <RingBeamConstructionModal
                  perimeterId={selectedId}
                  position="top"
                  trigger={
                    <button className="w-full px-3 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 rounded transition-colors">
                      View Construction
                    </button>
                  }
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
