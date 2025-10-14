import { ExclamationTriangleIcon, TrashIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import { Box, Callout, DataList, Flex, Heading, IconButton, Separator, Text, Tooltip } from '@radix-ui/themes'
import React, { useCallback, useMemo } from 'react'

import type { PerimeterConstructionMethodId, PerimeterId } from '@/building/model/ids'
import type { PerimeterWall } from '@/building/model/model'
import { useModelActions, usePerimeterById } from '@/building/store'
import { TOP_VIEW } from '@/construction/components/ConstructionPlan'
import { ConstructionPlanModal } from '@/construction/components/ConstructionPlanModal'
import { RingBeamConstructionPlanModal } from '@/construction/components/RingBeamConstructionPlan'
import { PerimeterMethodSelectWithEdit } from '@/construction/config/components/PerimeterMethodSelectWithEdit'
import { RingBeamMethodSelectWithEdit } from '@/construction/config/components/RingBeamMethodSelectWithEdit'
import { constructPerimeter } from '@/construction/perimeter'
import { ConstructionViewer3DModal } from '@/construction/viewer3d/ConstructionViewer3DModal'
import { popSelection } from '@/editor/hooks/useSelectionStore'
import { useViewportActions } from '@/editor/hooks/useViewportStore'
import { ConstructionPlanIcon, FitToViewIcon, Model3DIcon } from '@/shared/components/Icons'
import { LengthField } from '@/shared/components/LengthField'
import { type Length, boundsFromPoints, calculatePolygonArea } from '@/shared/geometry'
import { formatLength } from '@/shared/utils/formatLength'

interface PerimeterInspectorProps {
  selectedId: PerimeterId
}

interface MixedState<T> {
  isMixed: boolean
  value: T | null
}

function detectMixedConstructionMethod(walls: PerimeterWall[]): MixedState<PerimeterConstructionMethodId> {
  if (walls.length === 0) return { isMixed: false, value: null }

  const firstMethod = walls[0].constructionMethodId
  const allSame = walls.every(wall => wall.constructionMethodId === firstMethod)

  return {
    isMixed: !allSame,
    value: allSame ? firstMethod : null
  }
}

function detectMixedThickness(walls: PerimeterWall[]): MixedState<Length> {
  if (walls.length === 0) return { isMixed: false, value: null }

  const firstThickness = walls[0].thickness
  const allSame = walls.every(wall => wall.thickness === firstThickness)

  return {
    isMixed: !allSame,
    value: allSame ? firstThickness : null
  }
}

interface MixedStateIndicatorProps {
  children: React.ReactNode
}

function MixedStateIndicator({ children }: MixedStateIndicatorProps) {
  return (
    <Flex align="center" gap="2">
      {children}
      <Tooltip content="Different values across walls. Changing this will update all walls.">
        <ExclamationTriangleIcon width={14} height={14} style={{ color: 'var(--amber-9)' }} />
      </Tooltip>
    </Flex>
  )
}

export function PerimeterInspector({ selectedId }: PerimeterInspectorProps): React.JSX.Element {
  // Get perimeter data from model store
  const {
    setPerimeterBaseRingBeam,
    setPerimeterTopRingBeam,
    removePerimeterBaseRingBeam,
    removePerimeterTopRingBeam,
    updateAllPerimeterWallsConstructionMethod,
    updateAllPerimeterWallsThickness,
    removePerimeter
  } = useModelActions()
  const perimeter = usePerimeterById(selectedId)
  const viewportActions = useViewportActions()

  // Mixed state detection
  const constructionMethodState = useMemo(
    () => (perimeter ? detectMixedConstructionMethod(perimeter.walls) : { isMixed: false, value: null }),
    [perimeter?.walls]
  )

  const thicknessState = useMemo(
    () => (perimeter ? detectMixedThickness(perimeter.walls) : { isMixed: false, value: null }),
    [perimeter?.walls]
  )

  // If perimeter not found, show error
  if (!perimeter) {
    return (
      <Box p="2">
        <Callout.Root color="red">
          <Callout.Text>
            <Text weight="bold">Perimeter Not Found</Text>
            <br />
            Perimeter with ID {selectedId} could not be found.
          </Callout.Text>
        </Callout.Root>
      </Box>
    )
  }

  const totalInnerPerimeter = perimeter.walls.reduce((l, s) => l + s.insideLength, 0)
  const totalOuterPerimeter = perimeter.walls.reduce((l, s) => l + s.outsideLength, 0)
  const totalInnerArea = calculatePolygonArea({ points: perimeter.corners.map(c => c.insidePoint) })
  const totalOuterArea = calculatePolygonArea({ points: perimeter.corners.map(c => c.outsidePoint) })

  const hasNonStandardAngles = perimeter.corners.some(corner => corner.interiorAngle % 90 !== 0)

  const handleFitToView = useCallback(() => {
    if (!perimeter) return
    const points = perimeter.corners.map(c => c.outsidePoint)
    const bounds = boundsFromPoints(points)
    viewportActions.fitToView(bounds)
  }, [perimeter, viewportActions])

  const handleDelete = useCallback(() => {
    removePerimeter(selectedId)
    popSelection()
  }, [removePerimeter, selectedId])

  return (
    <Box p="2">
      <Flex direction="column" gap="3">
        {/* Basic Information */}
        <DataList.Root size="1">
          <DataList.Item>
            <DataList.Label minWidth="88px">Total Inner Perimeter</DataList.Label>
            <DataList.Value>{formatLength(totalInnerPerimeter as Length)}</DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label minWidth="88px">Total Inside Area</DataList.Label>
            <DataList.Value>{(totalInnerArea / (1000 * 1000)).toFixed(2)} m²</DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label minWidth="88px">Total Outer Perimeter</DataList.Label>
            <DataList.Value>{formatLength(totalOuterPerimeter as Length)}</DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label minWidth="88px">Total Overbuilt Area</DataList.Label>
            <DataList.Value>{(totalOuterArea / (1000 * 1000)).toFixed(2)} m²</DataList.Value>
          </DataList.Item>
        </DataList.Root>

        {/* Non-standard angle warning */}
        {hasNonStandardAngles && (
          <Callout.Root color="amber">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>
              <Text weight="bold">Non-right angles detected</Text>
              <br />
              <Text size="1">
                This perimeter contains corners with angles that are not multiples of 90°. Construction planning for
                such corners is not fully supported yet.
              </Text>
            </Callout.Text>
          </Callout.Root>
        )}

        <Flex direction="row" gap="3" pt="1" align="center" justify="center">
          <ConstructionPlanModal
            title="Perimeter Construction Plan"
            constructionModelFactory={async () => constructPerimeter(perimeter)}
            views={[{ view: TOP_VIEW, label: 'Top' }]}
            refreshKey={perimeter}
            trigger={
              <IconButton title="View Construction Plan" size="3">
                <ConstructionPlanIcon width={24} height={24} />
              </IconButton>
            }
          />
          <ConstructionViewer3DModal
            constructionModelFactory={async () => {
              if (!perimeter) return null
              return constructPerimeter(perimeter)
            }}
            refreshKey={perimeter}
            trigger={
              <IconButton title="View 3D Construction" size="3" variant="outline">
                <Model3DIcon width={24} height={24} />
              </IconButton>
            }
          />
        </Flex>

        {/* Wall Configuration */}
        <Box pt="1" style={{ borderTop: '1px solid var(--gray-6)' }}>
          <Heading size="2" mb="2">
            Wall Configuration
          </Heading>

          <Flex direction="column" gap="2">
            {/* Construction Method */}
            <Flex align="center" justify="between" gap="3">
              <Label.Root htmlFor="perimeter-construction-method">
                {constructionMethodState.isMixed ? (
                  <MixedStateIndicator>
                    <Text size="1" weight="medium" color="gray">
                      Construction Method
                    </Text>
                  </MixedStateIndicator>
                ) : (
                  <Text size="1" weight="medium" color="gray">
                    Construction Method
                  </Text>
                )}
              </Label.Root>
              <PerimeterMethodSelectWithEdit
                value={
                  constructionMethodState.isMixed
                    ? undefined
                    : (constructionMethodState.value as PerimeterConstructionMethodId | undefined)
                }
                onValueChange={(value: PerimeterConstructionMethodId) => {
                  updateAllPerimeterWallsConstructionMethod(selectedId, value)
                }}
                placeholder={constructionMethodState.isMixed ? 'Mixed' : 'Select method'}
                size="1"
              />
            </Flex>

            {/* Thickness Input */}
            <Flex align="center" justify="between" gap="3">
              <Label.Root htmlFor="perimeter-thickness">
                {thicknessState.isMixed ? (
                  <MixedStateIndicator>
                    <Text size="1" weight="medium" color="gray">
                      Wall Thickness
                    </Text>
                  </MixedStateIndicator>
                ) : (
                  <Text size="1" weight="medium" color="gray">
                    Wall Thickness
                  </Text>
                )}
              </Label.Root>
              <LengthField
                id="perimeter-thickness"
                value={thicknessState.value as Length}
                placeholder={thicknessState.isMixed ? 'Mixed' : undefined}
                onCommit={value => updateAllPerimeterWallsThickness(selectedId, value)}
                min={50 as Length}
                max={1500 as Length}
                step={10 as Length}
                size="1"
                unit="cm"
                style={{ width: '5rem' }}
              />
            </Flex>
          </Flex>
        </Box>

        {/* Ring Beam Configuration */}
        <Box pt="1" style={{ borderTop: '1px solid var(--gray-6)' }}>
          <Heading size="2" mb="2">
            Ring Beams
          </Heading>

          <Flex direction="column" gap="2">
            {/* Base Ring Beam */}
            <Flex align="center" justify="between" gap="3">
              <Label.Root htmlFor="base-ring-beam">
                <Text size="1" weight="medium" color="gray">
                  Base Plate
                </Text>
              </Label.Root>
              <RingBeamMethodSelectWithEdit
                value={perimeter.baseRingBeamMethodId}
                onValueChange={value => {
                  if (value === undefined) {
                    removePerimeterBaseRingBeam(selectedId)
                  } else {
                    setPerimeterBaseRingBeam(selectedId, value)
                  }
                }}
                placeholder="None"
                size="1"
                allowNone
              />
            </Flex>

            {/* Top Ring Beam */}
            <Flex align="center" justify="between" gap="3">
              <Label.Root htmlFor="top-ring-beam">
                <Text size="1" weight="medium" color="gray">
                  Top Plate
                </Text>
              </Label.Root>
              <RingBeamMethodSelectWithEdit
                value={perimeter.topRingBeamMethodId}
                onValueChange={value => {
                  if (value === undefined) {
                    removePerimeterTopRingBeam(selectedId)
                  } else {
                    setPerimeterTopRingBeam(selectedId, value)
                  }
                }}
                placeholder="None"
                size="1"
                allowNone
              />
            </Flex>

            {/* Ring Beam View Construction Button */}
            {(perimeter.topRingBeamMethodId || perimeter.baseRingBeamMethodId) && (
              <Flex justify="center">
                <RingBeamConstructionPlanModal
                  perimeterId={selectedId}
                  trigger={
                    <IconButton title="View Ring Beam Construction" size="2">
                      <ConstructionPlanIcon width={20} height={20} />
                    </IconButton>
                  }
                />
              </Flex>
            )}
          </Flex>
        </Box>

        <Separator size="4" />

        {/* Action Buttons */}
        <Flex gap="2" justify="end">
          <IconButton size="2" title="Fit to view" onClick={handleFitToView}>
            <FitToViewIcon />
          </IconButton>
          <IconButton size="2" color="red" title="Delete perimeter" onClick={handleDelete}>
            <TrashIcon />
          </IconButton>
        </Flex>
      </Flex>
    </Box>
  )
}
