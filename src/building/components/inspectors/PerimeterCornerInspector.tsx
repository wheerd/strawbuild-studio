import { ExclamationTriangleIcon, PinLeftIcon, PinRightIcon, TrashIcon } from '@radix-ui/react-icons'
import { Box, Callout, DataList, Flex, Heading, IconButton, Separator, Text } from '@radix-ui/themes'
import { useCallback, useMemo } from 'react'

import type { PerimeterCornerId, PerimeterId } from '@/building/model/ids'
import { useModelActions, usePerimeterById } from '@/building/store'
import { useConfigActions } from '@/construction/config/store'
import { popSelection } from '@/editor/hooks/useSelectionStore'
import { useViewportActions } from '@/editor/hooks/useViewportStore'
import { FitToViewIcon, SplitWallIcon } from '@/shared/components/Icons'
import { type Polygon2D, type Vec2, boundsFromPoints } from '@/shared/geometry'
import { wouldClosingPolygonSelfIntersect } from '@/shared/geometry/polygon'

interface PerimeterCornerInspectorProps {
  perimeterId: PerimeterId
  cornerId: PerimeterCornerId
}

export function PerimeterCornerInspector({ perimeterId, cornerId }: PerimeterCornerInspectorProps): React.JSX.Element {
  // Get model store functions - use specific selectors for stable references
  const { updatePerimeterCornerConstructedByWall: updateCornerConstructedByWall, removePerimeterCorner } =
    useModelActions()
  const { getPerimeterConstructionMethodById } = useConfigActions()
  const viewportActions = useViewportActions()

  // Get perimeter from store
  const outerWall = usePerimeterById(perimeterId)

  // Use useMemo to find corner and its index within the wall object
  const cornerIndex = useMemo(() => {
    return outerWall?.corners.findIndex(c => c.id === cornerId) ?? -1
  }, [outerWall, cornerId])

  const corner = useMemo(() => {
    return cornerIndex !== -1 ? outerWall?.corners[cornerIndex] : null
  }, [outerWall, cornerIndex])

  // If corner not found, show error
  if (!corner || !outerWall || cornerIndex === -1) {
    return (
      <Box p="2">
        <Callout.Root color="red">
          <Callout.Text>
            <Text weight="bold">Corner Not Found</Text>
            <br />
            Corner with ID {cornerId} could not be found.
          </Callout.Text>
        </Callout.Root>
      </Box>
    )
  }

  // Get adjacent walls
  const { previousWall, nextWall } = useMemo(() => {
    const prevIndex = (cornerIndex - 1 + outerWall.walls.length) % outerWall.walls.length
    const nextIndex = cornerIndex % outerWall.walls.length

    return {
      previousWall: outerWall.walls[prevIndex],
      nextWall: outerWall.walls[nextIndex]
    }
  }, [outerWall.walls, cornerIndex])

  // Event handlers with stable references
  const handleToggleConstructedByWall = useCallback(() => {
    const newConstructedByWall = corner.constructedByWall === 'previous' ? 'next' : 'previous'
    updateCornerConstructedByWall(perimeterId, cornerId, newConstructedByWall)
  }, [updateCornerConstructedByWall, perimeterId, cornerId, corner.constructedByWall])

  const handleMergeCorner = useCallback(() => {
    if (removePerimeterCorner(perimeterId, cornerId)) {
      popSelection()
    }
  }, [removePerimeterCorner, perimeterId, cornerId])

  // Check if there are construction notes to display
  const hasConstructionNotes = useMemo(() => {
    if (!previousWall || !nextWall) return false

    const prevMethod = getPerimeterConstructionMethodById(previousWall.constructionMethodId)
    const nextMethod = getPerimeterConstructionMethodById(nextWall.constructionMethodId)
    const hasMixedConstruction = prevMethod?.config.type !== nextMethod?.config.type
    const hasThicknessDifference = Math.abs(previousWall.thickness - nextWall.thickness) > 5

    return hasMixedConstruction || hasThicknessDifference
  }, [previousWall, nextWall, getPerimeterConstructionMethodById])

  const isNonStandardAngle = corner.interiorAngle % 90 !== 0

  const handleFitToView = useCallback(() => {
    if (!corner || !previousWall || !nextWall) return

    // Calculate midpoints of adjacent walls
    const prevMidpoint: Vec2 = [
      (previousWall.insideLine.start[0] + previousWall.insideLine.end[0]) / 2,
      (previousWall.insideLine.start[1] + previousWall.insideLine.end[1]) / 2
    ]
    const nextMidpoint: Vec2 = [
      (nextWall.insideLine.start[0] + nextWall.insideLine.end[0]) / 2,
      (nextWall.insideLine.start[1] + nextWall.insideLine.end[1]) / 2
    ]

    const points = [corner.insidePoint, corner.outsidePoint, prevMidpoint, nextMidpoint]
    const bounds = boundsFromPoints(points)
    viewportActions.fitToView(bounds)
  }, [corner, previousWall, nextWall, viewportActions])

  const canDeleteCorner = useMemo(() => {
    if (!outerWall || !corner) return { canDelete: false, reason: 'Corner not found' }

    // Need at least 4 corners (triangle = 3 corners minimum)
    if (outerWall.corners.length < 4) {
      return { canDelete: false, reason: 'Cannot delete - perimeter needs at least 3 corners' }
    }

    // Check if removal would cause self-intersection
    const newBoundaryPoints: Vec2[] = outerWall.corners.map(c => c.insidePoint)
    newBoundaryPoints.splice(cornerIndex, 1)

    const newBoundary: Polygon2D = { points: newBoundaryPoints }

    if (wouldClosingPolygonSelfIntersect(newBoundary)) {
      return { canDelete: false, reason: 'Cannot delete - would create self-intersecting polygon' }
    }

    return { canDelete: true, reason: '' }
  }, [outerWall, corner, cornerIndex])

  return (
    <Flex direction="column" gap="4">
      {/* Geometry Information */}
      <Flex direction="column" gap="2">
        <Heading size="2">Geometry</Heading>
        <DataList.Root>
          <DataList.Item>
            <DataList.Label minWidth="88px">Interior Angle</DataList.Label>
            <DataList.Value>{corner.interiorAngle}°</DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label minWidth="88px">Exterior Angle</DataList.Label>
            <DataList.Value>{corner.exteriorAngle}°</DataList.Value>
          </DataList.Item>
        </DataList.Root>
      </Flex>

      {/* Non-standard angle warning */}
      {isNonStandardAngle && (
        <Callout.Root color="amber">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>
            <Text weight="bold">Non-right angle</Text>
            <br />
            <Text size="1">
              Corners with angles that are not multiples of 90° are not fully supported yet. Construction details for
              this corner may require manual review and adjustments.
            </Text>
          </Callout.Text>
        </Callout.Root>
      )}

      <Separator size="4" />

      {/* Actions */}
      <Flex direction="column" gap="2">
        <Flex gap="2" justify="end">
          <IconButton size="2" onClick={handleToggleConstructedByWall} title="Switch main wall">
            {corner.constructedByWall === 'next' ? <PinLeftIcon /> : <PinRightIcon />}
          </IconButton>
          <IconButton size="2" title="Fit to view" onClick={handleFitToView}>
            <FitToViewIcon />
          </IconButton>
          <IconButton
            size="2"
            color={corner.interiorAngle === 180 ? undefined : 'red'}
            title={
              !canDeleteCorner.canDelete
                ? canDeleteCorner.reason
                : corner.interiorAngle === 180
                  ? 'Merge split'
                  : 'Delete corner'
            }
            onClick={handleMergeCorner}
            disabled={!canDeleteCorner.canDelete}
          >
            {corner.interiorAngle === 180 ? <SplitWallIcon /> : <TrashIcon />}
          </IconButton>
        </Flex>
      </Flex>

      <Separator size="4" />

      {/* Construction Notes */}
      {hasConstructionNotes && (
        <Flex direction="column" gap="2">
          <Heading size="2">Construction Notes</Heading>

          {(() => {
            const prevMethod = getPerimeterConstructionMethodById(previousWall.constructionMethodId)
            const nextMethod = getPerimeterConstructionMethodById(nextWall.constructionMethodId)
            return prevMethod?.config.type !== nextMethod?.config.type
          })() && (
            <Callout.Root color="amber">
              <Callout.Text>
                <Text weight="bold">Mixed Construction:</Text>
                <br />
                Adjacent walls use different construction types. Special attention may be needed at this corner.
              </Callout.Text>
            </Callout.Root>
          )}

          {Math.abs(previousWall.thickness - nextWall.thickness) > 5 && (
            <Callout.Root color="amber">
              <Callout.Text>
                <Text weight="bold">Thickness Difference:</Text>
                <br />
                Adjacent walls have different thicknesses ({Math.abs(previousWall.thickness - nextWall.thickness)}mm
                difference).
              </Callout.Text>
            </Callout.Root>
          )}
        </Flex>
      )}
    </Flex>
  )
}
