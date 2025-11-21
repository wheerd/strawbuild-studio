import { ExclamationTriangleIcon, TrashIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import {
  Box,
  Callout,
  DataList,
  DropdownMenu,
  Flex,
  Heading,
  IconButton,
  SegmentedControl,
  Separator,
  Text,
  Tooltip
} from '@radix-ui/themes'
import React, { useCallback, useMemo } from 'react'

import type { PerimeterId, RoofAssemblyId, WallAssemblyId } from '@/building/model/ids'
import type { PerimeterReferenceSide, PerimeterWall, RoofType } from '@/building/model/model'
import { useModelActions, usePerimeterById } from '@/building/store'
import { TOP_VIEW } from '@/construction/components/ConstructionPlan'
import { ConstructionPlanModal } from '@/construction/components/ConstructionPlanModal'
import { RingBeamAssemblySelectWithEdit } from '@/construction/config/components/RingBeamAssemblySelectWithEdit'
import { WallAssemblySelectWithEdit } from '@/construction/config/components/WallAssemblySelectWithEdit'
import { constructPerimeter } from '@/construction/perimeter'
import { TAG_BASE_PLATE, TAG_TOP_PLATE, TAG_WALLS } from '@/construction/tags'
import { ConstructionViewer3DModal } from '@/construction/viewer3d/ConstructionViewer3DModal'
import { MeasurementInfo } from '@/editor/components/MeasurementInfo'
import { popSelection, pushSelection } from '@/editor/hooks/useSelectionStore'
import { useViewModeActions } from '@/editor/hooks/useViewMode'
import { useViewportActions } from '@/editor/hooks/useViewportStore'
import {
  BasePlateIcon,
  ConstructionPlanIcon,
  FitToViewIcon,
  FloorLayersIcon,
  Model3DIcon,
  RoofIcon,
  TopPlateIcon,
  WallLayersIcon,
  WallToggleIcon
} from '@/shared/components/Icons'
import { LengthField } from '@/shared/components/LengthField'
import { Bounds2D, type Length, calculatePolygonArea } from '@/shared/geometry'
import { formatArea, formatLength } from '@/shared/utils/formatting'

interface PerimeterInspectorProps {
  selectedId: PerimeterId
}

interface MixedState<T> {
  isMixed: boolean
  value: T | null
}

function detectMixedAssemblies(walls: PerimeterWall[]): MixedState<WallAssemblyId> {
  if (walls.length === 0) return { isMixed: false, value: null }

  const firstAssembly = walls[0].wallAssemblyId
  const allSame = walls.every(wall => wall.wallAssemblyId === firstAssembly)

  return {
    isMixed: !allSame,
    value: allSame ? firstAssembly : null
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

function MixedStateIndicator() {
  return (
    <Tooltip content="Different values across walls. Changing this will update all walls.">
      <ExclamationTriangleIcon width={14} height={14} style={{ color: 'var(--amber-9)' }} />
    </Tooltip>
  )
}

export function PerimeterInspector({ selectedId }: PerimeterInspectorProps): React.JSX.Element {
  // Get perimeter data from model store
  const {
    setPerimeterBaseRingBeam,
    setPerimeterTopRingBeam,
    removePerimeterBaseRingBeam,
    removePerimeterTopRingBeam,
    updateAllPerimeterWallsAssembly,
    updateAllPerimeterWallsThickness,
    removePerimeter,
    setPerimeterReferenceSide,
    addRoof
  } = useModelActions()
  const perimeter = usePerimeterById(selectedId)
  const viewportActions = useViewportActions()
  const { setMode } = useViewModeActions()

  // Mixed state detection
  const wallAssemblyState = useMemo(
    () => (perimeter ? detectMixedAssemblies(perimeter.walls) : { isMixed: false, value: null }),
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
    const bounds = Bounds2D.fromPoints(points)
    viewportActions.fitToView(bounds)
  }, [perimeter, viewportActions])

  const handleDelete = useCallback(() => {
    removePerimeter(selectedId)
    popSelection()
  }, [removePerimeter, selectedId])

  const handleAddRoof = useCallback(
    (roofType: RoofType) => {
      if (!perimeter) return

      // Create polygon from perimeter outer points
      const polygon = {
        points: perimeter.corners.map(corner => corner.outsidePoint)
      }

      // Calculate direction perpendicular to first edge
      if (polygon.points.length < 2) {
        console.error('Perimeter must have at least 2 points')
        return
      }

      // Use first side (index 0) as main side for direction
      const mainSideIndex = 0

      // Default values for new roof
      const slope = 30 // degrees
      const verticalOffset = 0 // mm
      const overhang = 300 // mm
      const assemblyId = '' as RoofAssemblyId // placeholder

      const newRoof = addRoof(
        perimeter.storeyId,
        roofType,
        polygon,
        mainSideIndex,
        slope,
        verticalOffset,
        overhang,
        assemblyId,
        selectedId
      )

      if (newRoof) {
        setMode('roofs')
        pushSelection(newRoof.id)
      }
    },
    [perimeter, selectedId, addRoof, setMode]
  )

  return (
    <Box p="2">
      <Flex direction="column" gap="3">
        {/* Basic Information */}
        <DataList.Root size="1">
          <DataList.Item>
            <DataList.Label minWidth="88px">Total Inner Perimeter</DataList.Label>
            <DataList.Value>{formatLength(totalInnerPerimeter)}</DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label minWidth="88px">Total Inside Area</DataList.Label>
            <DataList.Value>{formatArea(totalInnerArea)}</DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label minWidth="88px">Total Outer Perimeter</DataList.Label>
            <DataList.Value>{formatLength(totalOuterPerimeter)}</DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label minWidth="88px">Total Overbuilt Area</DataList.Label>
            <DataList.Value>{formatArea(totalOuterArea)}</DataList.Value>
          </DataList.Item>
        </DataList.Root>

        <Flex align="center" gap="2">
          <Text size="1" color="gray" weight="medium">
            Reference Side
          </Text>
          <SegmentedControl.Root
            size="1"
            value={perimeter.referenceSide}
            onValueChange={value => setPerimeterReferenceSide(perimeter.id, value as PerimeterReferenceSide)}
          >
            <SegmentedControl.Item value="inside">Inside</SegmentedControl.Item>
            <SegmentedControl.Item value="outside">Outside</SegmentedControl.Item>
          </SegmentedControl.Root>
        </Flex>

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
            visibilityToggles={[
              { icon: TopPlateIcon, title: 'Top Plate', tags: [TAG_TOP_PLATE.id] },
              { icon: BasePlateIcon, title: 'Base Plate', tags: [TAG_BASE_PLATE.id] },
              { icon: WallToggleIcon, title: 'Wall', tags: [TAG_WALLS.id] },
              {
                icon: WallLayersIcon,
                title: 'Wall Layers',
                tags: ['wall-layer']
              },
              {
                icon: FloorLayersIcon,
                title: 'Floor/Ceiling Layers',
                tags: ['floor-layer']
              }
            ]}
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
            {/* Wall Assembly */}
            <Flex align="center" justify="between" gap="3">
              <Flex align="center" gap="1">
                <Label.Root htmlFor="wall-assembly">
                  <Flex align="center" gap="2">
                    <Text size="1" weight="medium" color="gray">
                      Wall Assembly
                    </Text>
                    <MeasurementInfo highlightedAssembly="wallAssembly" />
                    {wallAssemblyState.isMixed && <MixedStateIndicator />}
                  </Flex>
                </Label.Root>
              </Flex>
              <WallAssemblySelectWithEdit
                value={wallAssemblyState.isMixed ? undefined : (wallAssemblyState.value as WallAssemblyId | undefined)}
                onValueChange={(value: WallAssemblyId) => {
                  updateAllPerimeterWallsAssembly(selectedId, value)
                }}
                placeholder={wallAssemblyState.isMixed ? 'Mixed' : 'Select assembly'}
                size="1"
              />
            </Flex>

            {/* Thickness Input */}
            <Flex align="center" justify="between" gap="3">
              <Flex align="center" gap="1">
                <Label.Root htmlFor="perimeter-thickness">
                  <Flex align="center" gap="2">
                    <Text size="1" weight="medium" color="gray">
                      Wall Thickness
                    </Text>
                    <MeasurementInfo highlightedMeasurement="totalWallThickness" showFinishedSides />
                    {thicknessState.isMixed && <MixedStateIndicator />}
                  </Flex>
                </Label.Root>
              </Flex>
              <LengthField
                id="perimeter-thickness"
                value={thicknessState.value as Length}
                placeholder={thicknessState.isMixed ? 'Mixed' : undefined}
                onCommit={value => updateAllPerimeterWallsThickness(selectedId, value)}
                min={50}
                max={1500}
                step={10}
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
              <Flex align="center" gap="1">
                <Label.Root htmlFor="base-ring-beam">
                  <Text size="1" weight="medium" color="gray">
                    Base Plate
                  </Text>
                </Label.Root>
                <MeasurementInfo highlightedPart="basePlate" />
              </Flex>
              <RingBeamAssemblySelectWithEdit
                value={perimeter.baseRingBeamAssemblyId}
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
              <Flex align="center" gap="1">
                <Label.Root htmlFor="top-ring-beam">
                  <Text size="1" weight="medium" color="gray">
                    Top Plate
                  </Text>
                </Label.Root>
                <MeasurementInfo highlightedPart="topPlate" />
              </Flex>
              <RingBeamAssemblySelectWithEdit
                value={perimeter.topRingBeamAssemblyId}
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
          </Flex>
        </Box>

        <Separator size="4" />

        {/* Action Buttons */}
        <Flex gap="2" justify="end">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <IconButton size="2" title="Add roof based on perimeter">
                <RoofIcon />
              </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item onClick={() => handleAddRoof('gable')}>Gable Roof</DropdownMenu.Item>
              <DropdownMenu.Item onClick={() => handleAddRoof('shed')}>Shed Roof</DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
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
