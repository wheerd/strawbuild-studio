import { CheckCircledIcon, Cross2Icon, CrossCircledIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons'
import { Box, Callout, Dialog, Flex, IconButton, SegmentedControl, Text } from '@radix-ui/themes'
import React, { useMemo, useState } from 'react'

import { SvgMeasurementIndicator } from '@/construction/components/SvgMeasurementIndicator'
import {
  type ConstructionElement,
  type ConstructionElementId,
  type ConstructionIssue,
  type WallConstructionPlan,
  getElementPosition,
  getElementSize,
  resolveDefaultMaterial
} from '@/construction/walls'
import { SVGViewport } from '@/shared/components/SVGViewport'
import { type Bounds2D, type Vec2, boundsFromPoints, createVec2 } from '@/shared/geometry'
import { elementSizeRef } from '@/shared/hooks/useElementSize'
import { COLORS } from '@/shared/theme/colors'
import { type ViewType, convertConstructionToSvg, convertPointToSvg } from '@/shared/utils/constructionCoordinates'

interface WallConstructionPlanDisplayProps {
  plan: WallConstructionPlan
  view?: ViewType
  showIssues?: boolean
  containerSize: { width: number; height: number }
}

interface IssueHighlight {
  bounds: Bounds2D
  type: 'error' | 'warning'
  description: string
  elementIds: ConstructionElementId[]
}

const calculateIssueBounds = (
  issueElementIds: ConstructionElementId[],
  elements: ConstructionElement[],
  wallHeight: number,
  wallLength: number,
  view: ViewType
): Bounds2D | null => {
  // Find affected elements
  const affectedElements = elements.filter(el => issueElementIds.includes(el.id))

  if (affectedElements.length === 0) return null

  // Convert all element corners to SVG coordinate Vec2 points
  const allPoints: Vec2[] = []

  for (const element of affectedElements) {
    const elementPosition = getElementPosition(element)
    const elementSize = getElementSize(element)
    const { position, size } = convertConstructionToSvg(elementPosition, elementSize, wallHeight, wallLength, view)

    // Add all 4 corners of the rectangle
    allPoints.push(
      createVec2(position.x, position.y), // top-left
      createVec2(position.x + size.x, position.y), // top-right
      createVec2(position.x, position.y + size.y), // bottom-left
      createVec2(position.x + size.x, position.y + size.y) // bottom-right
    )
  }

  // Use existing utility to create bounding box
  const bounds = boundsFromPoints(allPoints)

  // Add padding around the bounding box for visual clarity
  if (bounds) {
    const padding = 10 // pixels
    return {
      min: createVec2(bounds.min[0] - padding, bounds.min[1] - padding),
      max: createVec2(bounds.max[0] + padding, bounds.max[1] + padding)
    }
  }

  return null
}

const getIssueColors = (type: 'error' | 'warning') => {
  if (type === 'error') {
    return {
      stroke: COLORS.ui.danger,
      fill: `${COLORS.ui.danger}AA`,
      strokeWidth: 50,
      dashArray: '100,100'
    }
  } else {
    return {
      stroke: COLORS.ui.warning,
      fill: `${COLORS.ui.warning}88`,
      strokeWidth: 30,
      dashArray: '100,100'
    }
  }
}

const renderIssueBounds = (bounds: Bounds2D, issueType: 'error' | 'warning', index: number) => {
  const width = bounds.max[0] - bounds.min[0]
  const height = bounds.max[1] - bounds.min[1]
  const colors = getIssueColors(issueType)

  return (
    <rect
      key={`${issueType}-${index}`}
      x={bounds.min[0]}
      y={bounds.min[1]}
      width={width}
      height={height}
      stroke={colors.stroke}
      strokeWidth={colors.strokeWidth}
      fill={colors.fill}
      strokeDasharray={colors.dashArray}
    />
  )
}

export function WallConstructionPlanDisplay({
  plan,
  view = 'outside',
  showIssues = true,
  containerSize
}: WallConstructionPlanDisplayProps): React.JSX.Element {
  const { length: wallLength, height: wallHeight } = plan.wallDimensions
  const elements = plan.segments.flatMap(s => s.elements)

  // Sort elements by depth (y-axis in construction coordinates) for proper z-ordering
  const sortedElements = elements.sort((a, b) => {
    const aPos = getElementPosition(a)
    const bPos = getElementPosition(b)
    // For outside view: elements with smaller y (closer to inside) render first (behind)
    // For inside view: elements with larger y (closer to outside) render first (behind)
    return view === 'outside' ? aPos[1] - bPos[1] : bPos[1] - aPos[1]
  })

  // Calculate issue highlights using Bounds2D
  const issueHighlights: IssueHighlight[] = useMemo(() => {
    if (!showIssues) return []

    const highlights: IssueHighlight[] = []

    // Process warnings
    plan.warnings.forEach(warning => {
      const bounds = calculateIssueBounds(warning.elements, elements, wallHeight, wallLength, view)
      if (bounds) {
        highlights.push({
          bounds,
          type: 'warning',
          description: warning.description,
          elementIds: warning.elements
        })
      }
    })

    // Process errors
    plan.errors.forEach(error => {
      const bounds = calculateIssueBounds(error.elements, elements, wallHeight, wallLength, view)
      if (bounds) {
        highlights.push({
          bounds,
          type: 'error',
          description: error.description,
          elementIds: error.elements
        })
      }
    })

    return highlights
  }, [plan.errors, plan.warnings, elements, wallHeight, wallLength, view, showIssues])

  // Calculate content bounds to include issue highlights and measurements
  const contentBounds = useMemo(() => {
    let minX = 0
    let minY = 0
    let maxX = wallLength as number
    let maxY = wallHeight as number

    // Include issue highlights if enabled
    if (showIssues && issueHighlights.length > 0) {
      issueHighlights.forEach(highlight => {
        minX = Math.min(minX, highlight.bounds.min[0])
        minY = Math.min(minY, highlight.bounds.min[1])
        maxX = Math.max(maxX, highlight.bounds.max[0])
        maxY = Math.max(maxY, highlight.bounds.max[1])
      })
    }

    // Include measurements bounds
    if (plan.measurements && plan.measurements.length > 0) {
      plan.measurements.forEach(measurement => {
        const svgStart = convertPointToSvg(
          measurement.startPoint[0],
          measurement.startPoint[1],
          wallHeight,
          wallLength,
          view
        )
        const svgEnd = convertPointToSvg(measurement.endPoint[0], measurement.endPoint[1], wallHeight, wallLength, view)

        // Account for offset and text/marker space
        const offset = measurement.offset || 0
        const extraSpace = 60 // Space for text and markers

        const startWithOffset = [svgStart[0], svgStart[1] + offset]
        const endWithOffset = [svgEnd[0], svgEnd[1] + offset]

        minX = Math.min(minX, startWithOffset[0] - extraSpace, endWithOffset[0] - extraSpace)
        minY = Math.min(minY, startWithOffset[1] - extraSpace, endWithOffset[1] - extraSpace)
        maxX = Math.max(maxX, startWithOffset[0] + extraSpace, endWithOffset[0] + extraSpace)
        maxY = Math.max(maxY, startWithOffset[1] + extraSpace, endWithOffset[1] + extraSpace)
      })
    }

    return {
      min: createVec2(minX, minY),
      max: createVec2(maxX, maxY)
    }
  }, [wallLength, wallHeight, showIssues, issueHighlights, plan.measurements, view])

  return (
    <SVGViewport
      contentBounds={contentBounds}
      padding={0.05} // 5% padding for wall construction
      className="w-full h-full"
      resetButtonPosition="top-right"
      svgSize={containerSize}
    >
      {/* Construction elements */}
      {sortedElements
        .filter(e => e.shape.type === 'cuboid')
        .map(element => {
          const elementPosition = getElementPosition(element)
          const elementSize = getElementSize(element)
          const { position, size } = convertConstructionToSvg(
            elementPosition,
            elementSize,
            wallHeight,
            wallLength,
            view
          )

          return (
            <rect
              key={element.id}
              x={position.x}
              y={position.y}
              width={size.x}
              height={size.y}
              fill={resolveDefaultMaterial(element.material)?.color}
              stroke="#000000"
              strokeWidth="5"
            />
          )
        })}

      {/* Issue highlights using Bounds2D */}
      {showIssues &&
        issueHighlights.map((highlight, index) => renderIssueBounds(highlight.bounds, highlight.type, index))}

      {/* Corner areas */}
      {plan.cornerInfo.startCorner &&
        (() => {
          // Calculate display position for start corner based on constructedByWallThisWall
          const xOffset = plan.cornerInfo.startCorner.constructedByThisWall
            ? 0 // Overlap: starts at wall beginning
            : -plan.cornerInfo.startCorner.extensionDistance // Adjacent: before wall

          const { position, size } = convertConstructionToSvg(
            [xOffset, 0, 0], // Start corner is at z=0
            [plan.cornerInfo.startCorner.extensionDistance, 0, wallHeight],
            wallHeight,
            wallLength,
            view
          )

          return (
            <rect
              key="start-corner"
              x={position.x}
              y={position.y}
              width={size.x}
              height={size.y}
              fill="none"
              stroke={plan.cornerInfo.startCorner.constructedByThisWall ? '#666666' : '#cccccc'}
              strokeWidth={plan.cornerInfo.startCorner.constructedByThisWall ? '20' : '10'}
              strokeDasharray={plan.cornerInfo.startCorner.constructedByThisWall ? '200,100' : '100,50'}
              opacity={plan.cornerInfo.startCorner.constructedByThisWall ? 0.7 : 0.4}
            />
          )
        })()}

      {plan.cornerInfo.endCorner &&
        (() => {
          // Calculate display position for end corner based on constructedByWallThisWall
          const xOffset = plan.cornerInfo.endCorner.constructedByThisWall
            ? wallLength - plan.cornerInfo.endCorner.extensionDistance // Overlap: extends backward from wall end
            : wallLength // Adjacent: after wall end

          const { position, size } = convertConstructionToSvg(
            [xOffset, 0, 0], // End corner is at z=0
            [plan.cornerInfo.endCorner.extensionDistance, 0, wallHeight],
            wallHeight,
            wallLength,
            view
          )

          return (
            <rect
              key="end-corner"
              x={position.x}
              y={position.y}
              width={size.x}
              height={size.y}
              fill="none"
              stroke={plan.cornerInfo.endCorner.constructedByThisWall ? '#666666' : '#cccccc'}
              strokeWidth={plan.cornerInfo.endCorner.constructedByThisWall ? '30' : '20'}
              strokeDasharray={plan.cornerInfo.endCorner.constructedByThisWall ? '200,100' : '100,50'}
              opacity={plan.cornerInfo.endCorner.constructedByThisWall ? 0.7 : 0.4}
            />
          )
        })()}

      {/* Measurements */}
      {plan.measurements?.map((measurement, index) => {
        // Transform construction coordinates to SVG coordinates
        const svgStartPoint = convertPointToSvg(
          measurement.startPoint[0],
          measurement.startPoint[1],
          wallHeight,
          wallLength,
          view
        )
        const svgEndPoint = convertPointToSvg(
          measurement.endPoint[0],
          measurement.endPoint[1],
          wallHeight,
          wallLength,
          view
        )

        // Calculate offset direction based on view
        const offsetDirection = view === 'inside' ? -1 : 1
        const adjustedOffset = (measurement.offset || 0) * offsetDirection

        return (
          <SvgMeasurementIndicator
            key={`${measurement.type}-${index}`}
            startPoint={svgStartPoint}
            endPoint={svgEndPoint}
            label={measurement.label}
            offset={adjustedOffset}
            color={COLORS.indicators.main}
            fontSize={60}
            strokeWidth={10}
          />
        )
      })}
    </SVGViewport>
  )
}

interface IssueDescriptionPanelProps {
  errors: ConstructionIssue[]
  warnings: ConstructionIssue[]
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

interface WallConstructionPlanModalProps {
  plan: WallConstructionPlan
  children: React.ReactNode
}

export function WallConstructionPlanModal({ plan, children }: WallConstructionPlanModalProps): React.JSX.Element {
  const [view, setView] = useState<ViewType>('outside')
  const [containerSize, containerRef] = elementSizeRef()

  return (
    <Dialog.Root>
      <Dialog.Trigger>{children}</Dialog.Trigger>
      <Dialog.Content size="2" width="95%" maxWidth="95%" maxHeight="90vh" className="flex flex-col overflow-hidden">
        <Flex direction="column" gap="3" height="100%" className="overflow-hidden">
          <Dialog.Title>
            <Flex justify="between" align="center">
              Wall Construction Plan
              <Dialog.Close>
                <IconButton variant="ghost" size="1">
                  <Cross2Icon />
                </IconButton>
              </Dialog.Close>
            </Flex>
          </Dialog.Title>

          <div
            ref={containerRef}
            className="relative grow min-h-[300px] overflow-hidden border border-gray-6 rounded-2"
          >
            <WallConstructionPlanDisplay plan={plan} view={view} containerSize={containerSize} showIssues />

            {/* Overlay SegmentedControl in top-left corner */}
            <Box position="absolute" top="3" left="3" p="1" className="z-10 shadow-md bg-panel rounded-2">
              <SegmentedControl.Root value={view} onValueChange={value => setView(value as ViewType)} size="1">
                <SegmentedControl.Item value="outside">Outside</SegmentedControl.Item>
                <SegmentedControl.Item value="inside">Inside</SegmentedControl.Item>
              </SegmentedControl.Root>
            </Box>
          </div>

          <Box flexShrink="0">
            <IssueDescriptionPanel errors={plan.errors} warnings={plan.warnings} />
          </Box>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
