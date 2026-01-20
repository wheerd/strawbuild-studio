import { ExclamationTriangleIcon, TrashIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import React, { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import type { PerimeterReferenceSide, PerimeterWallWithGeometry, RoofType } from '@/building/model'
import type { PerimeterId, RingBeamAssemblyId, WallAssemblyId } from '@/building/model/ids'
import {
  useModelActions,
  usePerimeterById,
  usePerimeterCornersById,
  usePerimeterWallsById,
  useRoofsOfActiveStorey
} from '@/building/store'
import { Button } from '@/components/ui/button'
import { Callout, CalloutIcon, CalloutText } from '@/components/ui/callout'
import { DataList } from '@/components/ui/data-list'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip } from '@/components/ui/tooltip'
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
import { Bounds2D, type Length, calculatePolygonArea, polygonPerimeter } from '@/shared/geometry'
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
      <ExclamationTriangleIcon className="text-orange-900" width={14} height={14} />
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
  const walls = usePerimeterWallsById(selectedId)
  const corners = usePerimeterCornersById(selectedId)
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
  const wallAssemblyState = useMemo(() => detectMixedAssemblies(walls), [walls])
  const thicknessState = useMemo(() => detectMixedThickness(walls), [walls])
  const baseRingBeamState = useMemo(() => detectMixedRingBeams(walls, 'base'), [walls])
  const topRingBeamState = useMemo(() => detectMixedRingBeams(walls, 'top'), [walls])

  const totalInnerPerimeter = polygonPerimeter(perimeter.innerPolygon)
  const totalOuterPerimeter = polygonPerimeter(perimeter.outerPolygon)
  const totalInnerArea = calculatePolygonArea(perimeter.innerPolygon)
  const totalOuterArea = calculatePolygonArea(perimeter.outerPolygon)

  const hasNonStandardAngles = corners.some(corner => corner.interiorAngle % 90 !== 0)

  const handleFitToView = useCallback(() => {
    const bounds = Bounds2D.fromPoints(perimeter.outerPolygon.points)
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
      // Create polygon from perimeter outer points
      const polygon = perimeter.outerPolygon

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

      setMode('roofs')
      replaceSelection([newRoof.id])
    },
    [perimeter, selectedId, addRoof, setMode]
  )

  return (
    <div className="flex flex-col gap-3">
      {/* Basic Information */}
      <DataList.Root>
        <DataList.Item>
          <DataList.Label>{t($ => $.perimeter.totalInnerPerimeter)}</DataList.Label>
          <DataList.Value>{formatLength(totalInnerPerimeter)}</DataList.Value>
        </DataList.Item>
        <DataList.Item>
          <DataList.Label>{t($ => $.perimeter.totalInsideArea)}</DataList.Label>
          <DataList.Value>{formatArea(totalInnerArea)}</DataList.Value>
        </DataList.Item>
        <DataList.Item>
          <DataList.Label>{t($ => $.perimeter.totalOuterPerimeter)}</DataList.Label>
          <DataList.Value>{formatLength(totalOuterPerimeter)}</DataList.Value>
        </DataList.Item>
        <DataList.Item>
          <DataList.Label>{t($ => $.perimeter.totalOverbuiltArea)}</DataList.Label>
          <DataList.Value>{formatArea(totalOuterArea)}</DataList.Value>
        </DataList.Item>
      </DataList.Root>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{t($ => $.perimeter.referenceSide)}</span>
        <ToggleGroup
          type="single"
          size="sm"
          value={perimeter.referenceSide}
          onValueChange={value => {
            if (value) {
              setPerimeterReferenceSide(perimeter.id, value as PerimeterReferenceSide)
            }
          }}
          variant="outline"
        >
          <ToggleGroupItem value="inside">{t($ => $.perimeter.referenceSideInside)}</ToggleGroupItem>
          <ToggleGroupItem value="outside">{t($ => $.perimeter.referenceSideOutside)}</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Non-standard angle warning */}
      {hasNonStandardAngles && (
        <Callout color="orange">
          <CalloutIcon>
            <ExclamationTriangleIcon />
          </CalloutIcon>
          <CalloutText>
            <span className="font-bold">{t($ => $.perimeter.nonRightAnglesWarning)}</span>
            <br />
            <span className="text-sm">{t($ => $.perimeter.nonRightAnglesDescription)}</span>
          </CalloutText>
        </Callout>
      )}

      <div className="flex flex-row items-center justify-center gap-3 pt-1">
        <TopDownPlanModal
          title={t($ => $.perimeter.constructionPlanTitle)}
          factory={() => Promise.resolve(constructPerimeter(perimeter))}
          refreshKey={perimeter}
          trigger={
            <Button size="icon" title={t($ => $.perimeter.viewConstructionPlan)}>
              <ConstructionPlanIcon width={24} height={24} />
            </Button>
          }
        />
        <ConstructionViewer3DModal
          constructionModelFactory={() => Promise.resolve(constructPerimeter(perimeter))}
          refreshKey={perimeter}
          trigger={
            <Button size="icon" title={t($ => $.perimeter.view3DConstruction)} variant="outline">
              <Model3DIcon width={24} height={24} />
            </Button>
          }
        />
      </div>

      <Separator />

      {/* Wall Configuration */}
      <div className="flex flex-col gap-2">
        <h4>{t($ => $.perimeter.wallConfiguration)}</h4>

        {/* Wall Assembly */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Label.Root htmlFor="wall-assembly">
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium">{t($ => $.perimeter.wallAssembly)}</span>
                <MeasurementInfo highlightedAssembly="wallAssembly" />
                {wallAssemblyState.isMixed && <MixedStateIndicator tooltip={t($ => $.perimeter.mixedValuesTooltip)} />}
              </div>
            </Label.Root>
          </div>
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
            size="sm"
          />
        </div>

        {/* Thickness Input */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Label.Root htmlFor="perimeter-thickness">
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium">{t($ => $.perimeter.wallThickness)}</span>
                <MeasurementInfo highlightedMeasurement="totalWallThickness" showFinishedSides />
                {thicknessState.isMixed && <MixedStateIndicator tooltip={t($ => $.perimeter.mixedValuesTooltip)} />}
              </div>
            </Label.Root>
          </div>
          <LengthField
            id="perimeter-thickness"
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            value={thicknessState.value!}
            placeholder={thicknessState.isMixed ? t($ => $.perimeter.mixedPlaceholder) : undefined}
            onCommit={value => {
              updateAllPerimeterWallsThickness(selectedId, value)
            }}
            min={50}
            max={1500}
            step={10}
            size="sm"
            unit="cm"
            className="w-[5rem]"
          />
        </div>
      </div>

      <Separator />

      {/* Ring Beam Configuration */}
      <div className="flex flex-col gap-2">
        <h2>{t($ => $.perimeter.ringBeams)}</h2>

        {/* Base Ring Beam */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Label.Root htmlFor="base-ring-beam">
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium">{t($ => $.perimeter.basePlate)}</span>
                <MeasurementInfo highlightedPart="basePlate" />
                {baseRingBeamState.isMixed && <MixedStateIndicator tooltip={t($ => $.perimeter.mixedValuesTooltip)} />}
              </div>
            </Label.Root>
          </div>
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
            size="sm"
            allowNone
          />
        </div>

        {/* Top Ring Beam */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Label.Root htmlFor="top-ring-beam">
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium">{t($ => $.perimeter.topPlate)}</span>
                <MeasurementInfo highlightedPart="topPlate" />
                {topRingBeamState.isMixed && <MixedStateIndicator tooltip={t($ => $.perimeter.mixedValuesTooltip)} />}
              </div>
            </Label.Root>
          </div>
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
            size="sm"
            allowNone
          />
        </div>
      </div>

      <Separator />

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        {associatedRoof ? (
          <Button size="icon-sm" title={t($ => $.perimeter.viewAssociatedRoof)} onClick={handleNavigateToRoof}>
            <RoofIcon />
          </Button>
        ) : (
          <DropdownMenu>
            <DropdownMenu.Trigger asChild>
              <Button size="icon-sm" title={t($ => $.perimeter.addRoofBasedOnPerimeter)}>
                <RoofIcon />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item
                onClick={() => {
                  handleAddRoof('gable')
                }}
              >
                {t($ => $.perimeter.addGableRoof)}
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onClick={() => {
                  handleAddRoof('shed')
                }}
              >
                {t($ => $.perimeter.addShedRoof)}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu>
        )}
        <Button size="icon-sm" title={t($ => $.perimeter.fitToView)} onClick={handleFitToView}>
          <FitToViewIcon />
        </Button>
        <Button variant="destructive" size="icon-sm" title={t($ => $.perimeter.deletePerimeter)} onClick={handleDelete}>
          <TrashIcon />
        </Button>
      </div>
    </div>
  )
}
