import React, { useState, useMemo } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Cross2Icon } from '@radix-ui/react-icons'
import { useModelActions, useModelStore } from '@/model/store'
import { useConfigStore } from '@/config/store'
import { constructRingBeam, resolveDefaultMaterial, type RingBeamConstructionPlan } from '@/construction'
import { ConstructionElementShape } from './Shapes/ConstructionElementShape'
import type { PerimeterId } from '@/types/ids'
import { boundsFromPoints } from '@/types/geometry'
import { SVGViewport } from './components/SVGViewport'
import { SvgMeasurementIndicator } from './components/SvgMeasurementIndicator'
import { COLORS } from '@/theme/colors'

export interface RingBeamConstructionModalProps {
  perimeterId: PerimeterId
  position: 'base' | 'top'
  trigger: React.ReactNode
}

interface RingBeamConstructionPlanDisplayProps {
  plan: RingBeamConstructionPlan
  showIssues?: boolean
}

function RingBeamConstructionPlanDisplay({
  plan,
  showIssues = true
}: RingBeamConstructionPlanDisplayProps): React.JSX.Element {
  const { getPerimeterById } = useModelActions()
  const perimeter = getPerimeterById(plan.perimeterId)

  const perimeterBounds = boundsFromPoints(perimeter?.corners.map(c => [c.outsidePoint[0], -c.outsidePoint[1]]) ?? [])!

  const padding = 100 // padding in SVG units
  const viewBoxWidth = perimeterBounds.max[0] - perimeterBounds.min[0] + padding * 2
  const viewBoxHeight = perimeterBounds.max[1] - perimeterBounds.min[1] + padding * 2
  const viewBoxX = perimeterBounds.min[0] - padding
  const viewBoxY = perimeterBounds.min[1] - padding

  return (
    <div className="w-full h-96 border border-gray-300 rounded bg-gray-50 flex items-center justify-center relative">
      <SVGViewport baseViewBox={`${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`} className="w-full h-full">
        {/* Render perimeter outline for reference */}
        {perimeter && (
          <g stroke="#ccc" strokeWidth="1" fill="none">
            {/* Outside perimeter */}
            <polygon
              points={perimeter.corners.map(c => `${c.outsidePoint[0]},${-c.outsidePoint[1]}`).join(' ')}
              stroke="#666"
              strokeWidth={5}
              fill="rgba(0,255,0,0.1)"
            />
            {/* Inside perimeter */}
            <polygon
              points={perimeter.corners.map(c => `${c.insidePoint[0]},${-c.insidePoint[1]}`).join(' ')}
              stroke="#999"
              strokeWidth={5}
              strokeDasharray="5,5"
              fill="rgba(0,0,255,0.1)"
            />
          </g>
        )}

        {/* Render ring beam segments */}
        {plan.segments.map((segment, segmentIndex) => {
          // Convert rotation from radians to degrees
          const baseRotationDeg = (segment.rotation[2] * 180) / Math.PI
          const rotationDeg = baseRotationDeg - 90

          return (
            <g key={`segment-${segmentIndex}`}>
              {/* Segment elements in transformed group */}
              <g transform={`translate(${segment.position[0]} ${-segment.position[1]}) rotate(${rotationDeg})`}>
                {segment.elements.map((element, elementIndex) => (
                  <ConstructionElementShape
                    key={`element-${elementIndex}`}
                    element={element}
                    resolveMaterial={resolveDefaultMaterial}
                    strokeWidth={5}
                  />
                ))}
              </g>

              {/* Render measurements for this segment in global coordinate space */}
              {segment.measurements.map((measurement, measurementIndex) => (
                <SvgMeasurementIndicator
                  key={`measurement-${segmentIndex}-${measurementIndex}`}
                  startPoint={[
                    measurement.startPoint[0],
                    -measurement.startPoint[1] // Y-flip for ring beam
                  ]}
                  endPoint={[
                    measurement.endPoint[0],
                    -measurement.endPoint[1] // Y-flip for ring beam
                  ]}
                  label={measurement.label}
                  offset={measurement.offset}
                  color={COLORS.indicators.main}
                  fontSize={60}
                  strokeWidth={12}
                />
              ))}
            </g>
          )
        })}
      </SVGViewport>

      {/* Issues display */}
      {showIssues && (plan.errors.length > 0 || plan.warnings.length > 0) && (
        <div className="absolute top-4 right-4 bg-white border border-gray-300 rounded-md p-3 shadow-lg max-w-xs">
          <h4 className="text-sm font-semibold mb-2">Issues</h4>
          {plan.errors.map((error, index) => (
            <div key={`error-${index}`} className="text-xs text-red-600 mb-1">
              ⚠ {error.description}
            </div>
          ))}
          {plan.warnings.map((warning, index) => (
            <div key={`warning-${index}`} className="text-xs text-orange-600 mb-1">
              ⚠ {warning.description}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function RingBeamConstructionModal({
  perimeterId,
  position,
  trigger
}: RingBeamConstructionModalProps): React.JSX.Element {
  const [currentPosition, setCurrentPosition] = useState<'base' | 'top'>(position)

  const perimeter = useModelStore(state => state.perimeters.get(perimeterId))
  const getRingBeamMethodById = useConfigStore(state => state.getRingBeamConstructionMethodById)

  const constructionPlan = useMemo(() => {
    if (!perimeter) return null

    const methodId = currentPosition === 'base' ? perimeter.baseRingBeamMethodId : perimeter.topRingBeamMethodId

    if (!methodId) return null

    const method = getRingBeamMethodById(methodId)
    if (!method) return null

    try {
      return constructRingBeam(perimeter, method.config, resolveDefaultMaterial)
    } catch (error) {
      console.error('Failed to generate ring beam construction plan:', error)
      return null
    }
  }, [perimeter, currentPosition, getRingBeamMethodById])

  const currentMethod = useMemo(() => {
    if (!perimeter) return null

    const methodId = currentPosition === 'base' ? perimeter.baseRingBeamMethodId : perimeter.topRingBeamMethodId

    return methodId ? getRingBeamMethodById(methodId) : null
  }, [perimeter, currentPosition, getRingBeamMethodById])

  if (!perimeter) {
    return <>{trigger}</>
  }

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[100]" />
        <Dialog.Content className="fixed inset-4 bg-white rounded-lg shadow-xl z-[100] flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-gray-200">
            <Dialog.Title className="text-base font-medium text-gray-900">Ring Beam Construction</Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Cross2Icon className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 p-2 overflow-hidden">
              <div className="w-full h-full bg-gray-50 rounded-lg border border-gray-200 p-1 overflow-hidden">
                {currentMethod ? (
                  constructionPlan ? (
                    <RingBeamConstructionPlanDisplay plan={constructionPlan} showIssues />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center text-gray-500">
                        <div className="text-lg mb-2">⚠</div>
                        <div className="text-sm">Failed to generate construction plan</div>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <div className="text-lg mb-2">📋</div>
                      <div className="text-sm">No {currentPosition} ring beam method selected</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-shrink-0 flex">
              <div className="flex-1">
                {/* Method Info Panel */}
                {currentMethod && (
                  <div className="p-3 border-t border-gray-200 bg-gray-50">
                    <h3 className="text-sm font-medium text-gray-900 mb-1">{currentMethod.name}</h3>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>Type: {currentMethod.config.type}</div>
                      <div>Height: {currentMethod.config.height}mm</div>
                      {currentMethod.config.type === 'full' && <div>Width: {currentMethod.config.width}mm</div>}
                      {currentMethod.config.type === 'double' && (
                        <div>Thickness: {currentMethod.config.thickness}mm</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center px-4 py-3 border-t border-gray-200">
                <div className="flex bg-gray-100 rounded-md p-1">
                  <button
                    onClick={() => setCurrentPosition('base')}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      currentPosition === 'base'
                        ? 'bg-primary-500 text-white shadow-sm'
                        : 'bg-white text-black hover:text-gray-700'
                    }`}
                  >
                    Base Plate
                  </button>
                  <button
                    onClick={() => setCurrentPosition('top')}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      currentPosition === 'top'
                        ? 'bg-primary-500 text-white shadow-sm'
                        : 'bg-white text-black hover:text-gray-700'
                    }`}
                  >
                    Top Plate
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
