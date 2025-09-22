import React, { useState, useMemo } from 'react'
import { Dialog, IconButton, Flex, Box, Text, Heading, Card, Callout, SegmentedControl } from '@radix-ui/themes'
import { Cross2Icon, ExclamationTriangleIcon, CrossCircledIcon, CheckCircledIcon } from '@radix-ui/react-icons'
import { usePerimeterById } from '@/model/store'
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
}

function RingBeamConstructionPlanDisplay({ plan }: RingBeamConstructionPlanDisplayProps): React.JSX.Element {
  const perimeter = usePerimeterById(plan.perimeterId)

  const perimeterBounds = boundsFromPoints(perimeter?.corners.map(c => [c.outsidePoint[0], -c.outsidePoint[1]]) ?? [])
  if (!perimeterBounds) return <div>Error: Could not calculate perimeter bounds</div>

  const padding = 100 // padding in SVG units
  const viewBoxWidth = perimeterBounds.max[0] - perimeterBounds.min[0] + padding * 2
  const viewBoxHeight = perimeterBounds.max[1] - perimeterBounds.min[1] + padding * 2
  const viewBoxX = perimeterBounds.min[0] - padding
  const viewBoxY = perimeterBounds.min[1] - padding

  return (
    <div className="w-full h-full bg-gray-50 flex items-center justify-center relative">
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
    </div>
  )
}

interface IssueDescriptionPanelProps {
  errors: { description: string }[]
  warnings: { description: string }[]
}

const IssueDescriptionPanel = ({ errors, warnings }: IssueDescriptionPanelProps) => (
  <Box maxHeight="200px" className="overflow-y-auto border-t border-gray-6">
    <Flex direction="column" gap="2" p="3">
      {errors.length > 0 && (
        <Callout.Root color="red" size="1">
          <Callout.Icon>
            <CrossCircledIcon />
          </Callout.Icon>
          <Flex direction="column" gap="2">
            <Text weight="medium" size="2">
              Errors ({errors.length})
            </Text>
            <Flex direction="column" gap="1">
              {errors.map((error, index) => (
                <Text key={index} size="1">
                  • {error.description}
                </Text>
              ))}
            </Flex>
          </Flex>
        </Callout.Root>
      )}

      {warnings.length > 0 && (
        <Callout.Root color="amber" size="1">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Flex direction="column" gap="2">
            <Text weight="medium" size="2">
              Warnings ({warnings.length})
            </Text>
            <Flex direction="column" gap="1">
              {warnings.map((warning, index) => (
                <Text key={index} size="1">
                  • {warning.description}
                </Text>
              ))}
            </Flex>
          </Flex>
        </Callout.Root>
      )}

      {errors.length === 0 && warnings.length === 0 && (
        <Callout.Root color="green" size="1">
          <Callout.Icon>
            <CheckCircledIcon />
          </Callout.Icon>
          <Flex direction="column" gap="1">
            <Text weight="medium" size="2">
              No Issues Found
            </Text>
            <Text size="1">Construction plan is valid with no errors or warnings.</Text>
          </Flex>
        </Callout.Root>
      )}
    </Flex>
  </Box>
)

export function RingBeamConstructionModal({
  perimeterId,
  position,
  trigger
}: RingBeamConstructionModalProps): React.JSX.Element {
  const [currentPosition, setCurrentPosition] = useState<'base' | 'top'>(position)

  const perimeter = usePerimeterById(perimeterId)
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
      <Dialog.Trigger>{trigger}</Dialog.Trigger>
      <Dialog.Content size="2" width="95%" maxWidth="95%" maxHeight="90vh" className="flex flex-col overflow-hidden">
        <Flex direction="column" gap="3" height="100%" className="overflow-hidden">
          <Dialog.Title>
            <Flex justify="between" align="center">
              Ring Beam Construction
              <Dialog.Close>
                <IconButton variant="ghost" size="1">
                  <Cross2Icon />
                </IconButton>
              </Dialog.Close>
            </Flex>
          </Dialog.Title>

          <Box
            position="relative"
            flexGrow="1"
            minHeight="300px"
            className="overflow-hidden border border-gray-6 rounded-2"
          >
            {currentMethod ? (
              constructionPlan ? (
                <RingBeamConstructionPlanDisplay plan={constructionPlan} />
              ) : (
                <Flex align="center" justify="center" style={{ height: '100%' }}>
                  <Text align="center" color="gray">
                    <Text size="6">⚠</Text>
                    <br />
                    <Text size="2">Failed to generate construction plan</Text>
                  </Text>
                </Flex>
              )
            ) : (
              <Flex align="center" justify="center" style={{ height: '100%' }}>
                <Text align="center" color="gray">
                  <Text size="6">📋</Text>
                  <br />
                  <Text size="2">No {currentPosition} ring beam method selected</Text>
                </Text>
              </Flex>
            )}

            {/* Overlay SegmentedControl in top-left corner */}
            <Box position="absolute" top="3" left="3" p="0S" className="z-10 shadow-md bg-panel rounded-2">
              <SegmentedControl.Root
                value={currentPosition}
                onValueChange={value => setCurrentPosition(value as 'base' | 'top')}
                size="1"
              >
                <SegmentedControl.Item value="base">Base Plate</SegmentedControl.Item>
                <SegmentedControl.Item value="top">Top Plate</SegmentedControl.Item>
              </SegmentedControl.Root>
            </Box>
          </Box>

          <Flex direction="row" gap="3" flexShrink="0">
            {/* Method Info Panel */}
            <Box flexGrow="1">
              {currentMethod && (
                <Card variant="surface" size="1">
                  <Heading size="2" mb="1">
                    {currentMethod.name}
                  </Heading>
                  <Flex direction="column" gap="1">
                    <Text size="1">Type: {currentMethod.config.type}</Text>
                    <Text size="1">Height: {currentMethod.config.height}mm</Text>
                    {currentMethod.config.type === 'full' && (
                      <Text size="1">Width: {currentMethod.config.width}mm</Text>
                    )}
                    {currentMethod.config.type === 'double' && (
                      <Text size="1">Thickness: {currentMethod.config.thickness}mm</Text>
                    )}
                  </Flex>
                </Card>
              )}
            </Box>

            {/* Issues Panel */}
            {constructionPlan && (
              <Box flexGrow="1">
                <IssueDescriptionPanel errors={constructionPlan.errors} warnings={constructionPlan.warnings} />
              </Box>
            )}
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
