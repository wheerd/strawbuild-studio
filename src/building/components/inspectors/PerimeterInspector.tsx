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
import { useTranslation } from 'react-i18next'

import type { PerimeterReferenceSide, PerimeterWallWithGeometry, RoofType } from '@/building/model'
import type { PerimeterId, RingBeamAssemblyId, WallAssemblyId } from '@/building/model/ids'
import { useModelActions, usePerimeterById, useRoofsOfActiveStorey } from '@/building/store'
import TopDownPlanModal from '@/construction/components/TopDownPlanModal'
import { useDefaultRoofAssemblyId } from '@/construction/config'
import { RingBeamAssemblySelectWithEdit } from '@/construction/config/components/RingBeamAssemblySelectWithEdit'
import { WallAssemblySelectWithEdit } from '@/construction/config/components/WallAssemblySelectWithEdit'
import { constructPerimeter } from '@/construction/perimeters/perimeter'
import { ConstructionViewer3DModal } from '@/construction/viewer3d/ConstructionViewer3DModal'
import { MeasurementInfo } from '@/editor/components/MeasurementInfo'
import { popSelection, replaceSelection } from '@/editor/hooks/useSelectionStore'
import { useViewModeActions } from '@/editor/hooks/useViewMode'
import { useViewportActions } from '@/editor/hooks/useViewportStore'
import { ConstructionPlanIcon, FitToViewIcon, Model3DIcon, RoofIcon } from '@/shared/components/Icons'
import { LengthField } from '@/shared/components/LengthField'
import { Bounds2D, type Length, calculatePolygonArea } from '@/shared/geometry'
import { useFormatters } from '@/shared/i18n/useFormatters'

interface PerimeterInspectorProps {
  selectedId: PerimeterId
}

interface MixedState<T> {
  isMixed: boolean
  value: T | null
}

function detectMixedAssemblies(walls: PerimeterWallWithGeometry[]): MixedState<WallAssemblyId> {
  if (walls.length === 0) return { isMixed: false, value: null }

  const firstAssembly = walls[0].wallAssemblyId
  const allSame = walls.every(wall => wall.wallAssemblyId === firstAssembly)

  return {
    isMixed: !allSame,
    value: allSame ? firstAssembly : null
  }
}

function detectMixedThickness(walls: PerimeterWallWithGeometry[]): MixedState<Length> {
  if (walls.length === 0) return { isMixed: false, value: null }

  const firstThickness = walls[0].thickness
  const allSame = walls.every(wall => wall.thickness === firstThickness)

  return {
    isMixed: !allSame,
    value: allSame ? firstThickness : null
  }
}

function detectMixedRingBeams(
  walls: PerimeterWallWithGeometry[],
  type: 'base' | 'top'
): MixedState<RingBeamAssemblyId> {
  if (walls.length === 0) return { isMixed: false, value: null }

  const firstAssembly = type === 'base' ? walls[0].baseRingBeamAssemblyId : walls[0].topRingBeamAssemblyId

  const allSame = walls.every(wall => {
    const assemblyId = type === 'base' ? wall.baseRingBeamAssemblyId : wall.topRingBeamAssemblyId
    return assemblyId === firstAssembly
  })

  return {
    isMixed: !allSame,
    value: allSame ? (firstAssembly ?? null) : null
  }
}

function MixedStateIndicator({ tooltip }: { tooltip: string }) {
  return (
    <Tooltip content={tooltip}>
      <ExclamationTriangleIcon width={14} height={14} style={{ color: 'var(--amber-9)' }} />
    </Tooltip>
  )
}

export function PerimeterInspector({ selectedId }: PerimeterInspectorProps): React.JSX.Element {
  const { t } = useTranslation('inspector')
  // Get perimeter data from model store
  const {
    setAllWallsBaseRingBeam,
    setAllWallsTopRingBeam,
    removeAllWallsBaseRingBeam,
    removeAllWallsTopRingBeam,
    updateAllPerimeterWallsAssembly,
    updateAllPerimeterWallsThickness,
    removePerimeter,
    setPerimeterReferenceSide,
    addRoof
  } = useModelActions()
  const roofAssemblyId = useDefaultRoofAssemblyId()
  const perimeter = usePerimeterById(selectedId)
  const viewportActions = useViewportActions()
  const { setMode } = useViewModeActions()
  const roofsOfStorey = useRoofsOfActiveStorey()
  const { formatArea, formatLength } = useFormatters()

  // Find roof associated with this perimeter
  const associatedRoof = useMemo(
    () => roofsOfStorey.find(roof => roof.referencePerimeter === selectedId) ?? null,
    [roofsOfStorey, selectedId]
  )

  // Mixed state detection
  const wallAssemblyState = useMemo(
    () => (perimeter ? detectMixedAssemblies(perimeter.walls) : { isMixed: false, value: null }),
    [perimeter?.walls]
  )

  const thicknessState = useMemo(
    () => (perimeter ? detectMixedThickness(perimeter.walls) : { isMixed: false, value: null }),
    [perimeter?.walls]
  )

  const baseRingBeamState = useMemo(
    () => (perimeter ? detectMixedRingBeams(perimeter.walls, 'base') : { isMixed: false, value: null }),
    [perimeter?.walls]
  )

  const topRingBeamState = useMemo(
    () => (perimeter ? detectMixedRingBeams(perimeter.walls, 'top') : { isMixed: false, value: null }),
    [perimeter?.walls]
  )

  // If perimeter not found, show error
  if (!perimeter) {
    return (
      <Box p="2">
        <Callout.Root color="red">
          <Callout.Text>
            <Text weight="bold">{t($ => $.perimeter.notFound)}</Text>
            <br />
            {t($ => $.perimeter.notFoundMessage, {
              id: selectedId
            })}
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

  const handleNavigateToRoof = useCallback(() => {
    if (!associatedRoof) return
    setMode('roofs')
    replaceSelection([associatedRoof.id])
  }, [associatedRoof, setMode])

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
      const slope = roofType === 'shed' ? 5 : 25
      const verticalOffset = 0 // mm
      const overhang = 300 // mm

      const newRoof = addRoof(
        perimeter.storeyId,
        roofType,
        polygon,
        mainSideIndex,
        slope,
        verticalOffset,
        overhang,
        roofAssemblyId,
        selectedId
      )

      if (newRoof) {
        setMode('roofs')
        replaceSelection([newRoof.id])
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
            <DataList.Label minWidth="88px">{t($ => $.perimeter.totalInnerPerimeter)}</DataList.Label>
            <DataList.Value>{formatLength(totalInnerPerimeter)}</DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label minWidth="88px">{t($ => $.perimeter.totalInsideArea)}</DataList.Label>
            <DataList.Value>{formatArea(totalInnerArea)}</DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label minWidth="88px">{t($ => $.perimeter.totalOuterPerimeter)}</DataList.Label>
            <DataList.Value>{formatLength(totalOuterPerimeter)}</DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label minWidth="88px">{t($ => $.perimeter.totalOverbuiltArea)}</DataList.Label>
            <DataList.Value>{formatArea(totalOuterArea)}</DataList.Value>
          </DataList.Item>
        </DataList.Root>

        <Flex align="center" gap="2">
          <Text size="1" color="gray" weight="medium">
            {t($ => $.perimeter.referenceSide)}
          </Text>
          <SegmentedControl.Root
            size="1"
            value={perimeter.referenceSide}
            onValueChange={value => setPerimeterReferenceSide(perimeter.id, value as PerimeterReferenceSide)}
          >
            <SegmentedControl.Item value="inside">{t($ => $.perimeter.referenceSideInside)}</SegmentedControl.Item>
            <SegmentedControl.Item value="outside">{t($ => $.perimeter.referenceSideOutside)}</SegmentedControl.Item>
          </SegmentedControl.Root>
        </Flex>

        {/* Non-standard angle warning */}
        {hasNonStandardAngles && (
          <Callout.Root color="amber">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>
              <Text weight="bold">{t($ => $.perimeter.nonRightAnglesWarning)}</Text>
              <br />
              <Text size="1">{t($ => $.perimeter.nonRightAnglesDescription)}</Text>
            </Callout.Text>
          </Callout.Root>
        )}

        <Flex direction="row" gap="3" pt="1" align="center" justify="center">
          <TopDownPlanModal
            title={t($ => $.perimeter.constructionPlanTitle)}
            factory={async () => constructPerimeter(perimeter)}
            refreshKey={perimeter}
            trigger={
              <IconButton title={t($ => $.perimeter.viewConstructionPlan)} size="3">
                <ConstructionPlanIcon width={24} height={24} />
              </IconButton>
            }
          />
          <ConstructionViewer3DModal
            constructionModelFactory={async () => constructPerimeter(perimeter)}
            refreshKey={perimeter}
            trigger={
              <IconButton title={t($ => $.perimeter.view3DConstruction)} size="3" variant="outline">
                <Model3DIcon width={24} height={24} />
              </IconButton>
            }
          />
        </Flex>

        {/* Wall Configuration */}
        <Box pt="1" style={{ borderTop: '1px solid var(--gray-6)' }}>
          <Heading size="2" mb="2">
            {t($ => $.perimeter.wallConfiguration)}
          </Heading>

          <Flex direction="column" gap="2">
            {/* Wall Assembly */}
            <Flex align="center" justify="between" gap="3">
              <Flex align="center" gap="1">
                <Label.Root htmlFor="wall-assembly">
                  <Flex align="center" gap="2">
                    <Text size="1" weight="medium" color="gray">
                      {t($ => $.perimeter.wallAssembly)}
                    </Text>
                    <MeasurementInfo highlightedAssembly="wallAssembly" />
                    {wallAssemblyState.isMixed && (
                      <MixedStateIndicator tooltip={t($ => $.perimeter.mixedValuesTooltip)} />
                    )}
                  </Flex>
                </Label.Root>
              </Flex>
              <WallAssemblySelectWithEdit
                value={wallAssemblyState.isMixed ? undefined : (wallAssemblyState.value as WallAssemblyId | undefined)}
                onValueChange={(value: WallAssemblyId) => {
                  updateAllPerimeterWallsAssembly(selectedId, value)
                }}
                placeholder={
                  wallAssemblyState.isMixed
                    ? t($ => $.perimeter.mixedPlaceholder)
                    : t($ => $.perimeter.selectAssemblyPlaceholder)
                }
                size="1"
              />
            </Flex>

            {/* Thickness Input */}
            <Flex align="center" justify="between" gap="3">
              <Flex align="center" gap="1">
                <Label.Root htmlFor="perimeter-thickness">
                  <Flex align="center" gap="2">
                    <Text size="1" weight="medium" color="gray">
                      {t($ => $.perimeter.wallThickness)}
                    </Text>
                    <MeasurementInfo highlightedMeasurement="totalWallThickness" showFinishedSides />
                    {thicknessState.isMixed && <MixedStateIndicator tooltip={t($ => $.perimeter.mixedValuesTooltip)} />}
                  </Flex>
                </Label.Root>
              </Flex>
              <LengthField
                id="perimeter-thickness"
                value={thicknessState.value as Length}
                placeholder={thicknessState.isMixed ? t($ => $.perimeter.mixedPlaceholder) : undefined}
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
            {t($ => $.perimeter.ringBeams)}
          </Heading>

          <Flex direction="column" gap="2">
            {/* Base Ring Beam */}
            <Flex align="center" justify="between" gap="3">
              <Flex align="center" gap="1">
                <Label.Root htmlFor="base-ring-beam">
                  <Flex align="center" gap="2">
                    <Text size="1" weight="medium" color="gray">
                      {t($ => $.perimeter.basePlate)}
                    </Text>
                    <MeasurementInfo highlightedPart="basePlate" />
                    {baseRingBeamState.isMixed && (
                      <MixedStateIndicator tooltip={t($ => $.perimeter.mixedValuesTooltip)} />
                    )}
                  </Flex>
                </Label.Root>
              </Flex>
              <RingBeamAssemblySelectWithEdit
                value={
                  baseRingBeamState.isMixed
                    ? ('' as RingBeamAssemblyId)
                    : (baseRingBeamState.value as RingBeamAssemblyId | undefined)
                }
                onValueChange={value => {
                  if (value === undefined) {
                    removeAllWallsBaseRingBeam(selectedId)
                  } else {
                    setAllWallsBaseRingBeam(selectedId, value)
                  }
                }}
                placeholder={
                  baseRingBeamState.isMixed ? t($ => $.perimeter.mixedPlaceholder) : t($ => $.perimeter.nonePlaceholder)
                }
                size="1"
                allowNone
              />
            </Flex>

            {/* Top Ring Beam */}
            <Flex align="center" justify="between" gap="3">
              <Flex align="center" gap="1">
                <Label.Root htmlFor="top-ring-beam">
                  <Flex align="center" gap="2">
                    <Text size="1" weight="medium" color="gray">
                      {t($ => $.perimeter.topPlate)}
                    </Text>
                    <MeasurementInfo highlightedPart="topPlate" />
                    {topRingBeamState.isMixed && (
                      <MixedStateIndicator tooltip={t($ => $.perimeter.mixedValuesTooltip)} />
                    )}
                  </Flex>
                </Label.Root>
              </Flex>
              <RingBeamAssemblySelectWithEdit
                value={
                  topRingBeamState.isMixed
                    ? ('' as RingBeamAssemblyId)
                    : (topRingBeamState.value as RingBeamAssemblyId | undefined)
                }
                onValueChange={value => {
                  if (value === undefined) {
                    removeAllWallsTopRingBeam(selectedId)
                  } else {
                    setAllWallsTopRingBeam(selectedId, value)
                  }
                }}
                placeholder={
                  topRingBeamState.isMixed ? t($ => $.perimeter.mixedPlaceholder) : t($ => $.perimeter.nonePlaceholder)
                }
                size="1"
                allowNone
              />
            </Flex>
          </Flex>
        </Box>

        <Separator size="4" />

        {/* Action Buttons */}
        <Flex gap="2" justify="end">
          {associatedRoof ? (
            <IconButton size="2" title={t($ => $.perimeter.viewAssociatedRoof)} onClick={handleNavigateToRoof}>
              <RoofIcon />
            </IconButton>
          ) : (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                <IconButton size="2" title={t($ => $.perimeter.addRoofBasedOnPerimeter)}>
                  <RoofIcon />
                </IconButton>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.Item onClick={() => handleAddRoof('gable')}>
                  {t($ => $.perimeter.addGableRoof)}
                </DropdownMenu.Item>
                <DropdownMenu.Item onClick={() => handleAddRoof('shed')}>
                  {t($ => $.perimeter.addShedRoof)}
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          )}
          <IconButton size="2" title={t($ => $.perimeter.fitToView)} onClick={handleFitToView}>
            <FitToViewIcon />
          </IconButton>
          <IconButton size="2" color="red" title={t($ => $.perimeter.deletePerimeter)} onClick={handleDelete}>
            <TrashIcon />
          </IconButton>
        </Flex>
      </Flex>
    </Box>
  )
}
