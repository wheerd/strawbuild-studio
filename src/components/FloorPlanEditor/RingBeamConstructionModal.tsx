import React, { useState, useMemo } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Cross2Icon } from '@radix-ui/react-icons'
import { useGetPerimeterById, useModelStore } from '@/model/store'
import { useConfigStore } from '@/config/store'
import {
  constructRingBeam,
  resolveDefaultMaterial,
  type RingBeamConstructionPlan,
  type CutCuboid
} from '@/construction'
import type { PerimeterId } from '@/types/ids'
import { boundsFromPoints } from '@/types/geometry'

export interface RingBeamConstructionModalProps {
  perimeterId: PerimeterId
  position: 'base' | 'top'
  trigger: React.ReactNode
}

interface RingBeamConstructionPlanDisplayProps {
  plan: RingBeamConstructionPlan
  showIssues?: boolean
  showDebugMarkers?: boolean
}

function RingBeamConstructionPlanDisplay({
  plan,
  showIssues = true,
  showDebugMarkers = true
}: RingBeamConstructionPlanDisplayProps): React.JSX.Element {
  const getPerimeterById = useGetPerimeterById()
  const perimeter = getPerimeterById(plan.perimeterId)

  const perimeterBounds = boundsFromPoints(perimeter?.corners.map(c => [c.outsidePoint[0], -c.outsidePoint[1]]) ?? [])!

  const padding = 100 // padding in SVG units
  const viewBoxWidth = perimeterBounds.max[0] - perimeterBounds.min[0] + padding * 2
  const viewBoxHeight = perimeterBounds.max[1] - perimeterBounds.min[1] + padding * 2
  const viewBoxX = perimeterBounds.min[0] - padding
  const viewBoxY = perimeterBounds.min[1] - padding

  return (
    <div className="w-full h-96 border border-gray-300 rounded bg-gray-50 flex items-center justify-center relative">
      <svg
        width="100%"
        height="100%"
        viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`}
        className="overflow-visible"
      >
        {/* Grid background */}
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e0e0e0" strokeWidth="1" />
          </pattern>
          {/* Arrow marker for direction indicators */}
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" fill="red">
            <polygon points="0 0, 10 3, 0 6" />
          </marker>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Render perimeter outline for reference */}
        {perimeter && (
          <g stroke="#ccc" strokeWidth="1" fill="none">
            {/* Inside perimeter */}
            <polygon
              points={perimeter.corners.map(c => `${c.insidePoint[0]},${-c.insidePoint[1]}`).join(' ')}
              stroke="#999"
              strokeDasharray="5,5"
              fill="rgba(0,0,255,0.1)"
            />
            {/* Outside perimeter */}
            <polygon
              points={perimeter.corners.map(c => `${c.outsidePoint[0]},${-c.outsidePoint[1]}`).join(' ')}
              stroke="#666"
              fill="rgba(0,255,0,0.1)"
            />
          </g>
        )}

        {/* Render ring beam segments */}
        {plan.segments.map((segment, segmentIndex) => {
          // Convert rotation from radians to degrees
          const baseRotationDeg = (segment.rotation[2] * 180) / Math.PI
          const rotationDeg = baseRotationDeg - 90

          return (
            <g
              key={`segment-${segmentIndex}`}
              transform={`translate(${segment.position[0]} ${-segment.position[1]}) rotate(${rotationDeg})`}
            >
              {/* Y-axis is flipped: ring beam coordinates (Y+ up) → SVG coordinates (Y+ down) */}
              {/* Visual debug: Show segment origin and direction */}
              {showDebugMarkers && (
                <g>
                  <circle cx="0" cy="0" r="50" fill="red" fillOpacity="0.7" />
                  {/* Direction arrow showing the local X-axis */}
                  <line x1="0" y1="0" x2="500" y2="0" stroke="red" strokeWidth="20" markerEnd="url(#arrow)" />
                </g>
              )}

              {segment.elements.map((element, elementIndex) => {
                const shape = element.shape as CutCuboid

                // Debug logging for development
                if (import.meta.env.DEV) {
                  console.log(`  Element ${elementIndex}:`, {
                    position: shape.position,
                    size: shape.size
                  })
                }

                return (
                  <g key={`element-${elementIndex}`}>
                    <rect
                      x={shape.position[0]}
                      y={-shape.position[1] - shape.size[1]}
                      width={shape.size[0]}
                      height={shape.size[1]}
                      fill="#8B4513"
                      stroke="#654321"
                      strokeWidth="2"
                      rx="2"
                    />
                    {/* Element origin marker */}
                    {showDebugMarkers && <circle cx={shape.position[0]} cy={-shape.position[1]} r="2" fill="blue" />}
                  </g>
                )
              })}
            </g>
          )
        })}
      </svg>

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
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl z-50 w-[90vw] max-w-4xl max-h-[90vh] overflow-auto">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-xl font-semibold text-gray-900">Ring Beam Construction</Dialog.Title>
              <Dialog.Close asChild>
                <button className="text-gray-400 hover:text-gray-600 transition-colors">
                  <Cross2Icon className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>

            {/* Position Toggle */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm font-medium text-gray-700">Position:</span>
              <div className="flex bg-gray-100 rounded-md p-1">
                <button
                  onClick={() => setCurrentPosition('base')}
                  className={`px-3 py-1 text-sm rounded ${
                    currentPosition === 'base'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Base Plate
                </button>
                <button
                  onClick={() => setCurrentPosition('top')}
                  className={`px-3 py-1 text-sm rounded ${
                    currentPosition === 'top' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Top Plate
                </button>
              </div>
            </div>

            {/* Content */}
            {currentMethod ? (
              <div className="space-y-4">
                {/* Method Info */}
                <div className="bg-gray-50 rounded-md p-3">
                  <h3 className="text-sm font-medium text-gray-900 mb-1">{currentMethod.name}</h3>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>Type: {currentMethod.config.type}</div>
                    <div>Height: {currentMethod.config.height}mm</div>
                    {currentMethod.config.type === 'full' && <div>Width: {currentMethod.config.width}mm</div>}
                    {currentMethod.config.type === 'double' && <div>Thickness: {currentMethod.config.thickness}mm</div>}
                  </div>
                </div>

                {/* Construction Plan */}
                {constructionPlan ? (
                  <RingBeamConstructionPlanDisplay plan={constructionPlan} showIssues />
                ) : (
                  <div className="w-full h-96 border border-gray-300 rounded bg-gray-50 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <div className="text-lg mb-2">⚠</div>
                      <div className="text-sm">Failed to generate construction plan</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-96 border border-gray-300 rounded bg-gray-50 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <div className="text-lg mb-2">📋</div>
                  <div className="text-sm">No {currentPosition} ring beam method selected</div>
                </div>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
