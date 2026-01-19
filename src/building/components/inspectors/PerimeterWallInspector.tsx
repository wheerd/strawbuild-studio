import { TrashIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import { Card, DataList, Heading, IconButton, Separator } from '@radix-ui/themes'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import type { PerimeterWallId, RingBeamAssemblyId, WallAssemblyId } from '@/building/model/ids'
import { useModelActions, usePerimeterWallById, useWallOpeningsById } from '@/building/store'
import { ConstructionPlanModal } from '@/construction/components/ConstructionPlanModal'
import { BACK_VIEW, FRONT_VIEW, TOP_VIEW } from '@/construction/components/plan/ConstructionPlan'
import { RingBeamAssemblySelectWithEdit } from '@/construction/config/components/RingBeamAssemblySelectWithEdit'
import { WallAssemblySelectWithEdit } from '@/construction/config/components/WallAssemblySelectWithEdit'
import { useWallAssemblyById } from '@/construction/config/store'
import { constructWall } from '@/construction/walls'
import { MeasurementInfo } from '@/editor/components/MeasurementInfo'
import { popSelection } from '@/editor/hooks/useSelectionStore'
import { useViewportActions } from '@/editor/hooks/useViewportStore'
import { pushTool } from '@/editor/tools/system/store'
import { ConstructionPlanIcon, FitToViewIcon, SplitWallIcon } from '@/shared/components/Icons'
import { LengthField } from '@/shared/components/LengthField'
import { Bounds2D } from '@/shared/geometry'
import { useFormatters } from '@/shared/i18n/useFormatters'

export function PerimeterWallInspector({ wallId }: { wallId: PerimeterWallId }): React.JSX.Element {
  const { t } = useTranslation('inspector')
  const { formatLength } = useFormatters()
  const {
    updatePerimeterWallThickness: updateOuterWallThickness,
    updatePerimeterWallAssembly: updateOuterWallAssembly,
    setWallBaseRingBeam,
    setWallTopRingBeam,
    removeWallBaseRingBeam,
    removeWallTopRingBeam,
    removePerimeterWall,
    canRemovePerimeterWall
  } = useModelActions()

  const wall = usePerimeterWallById(wallId)
  const wallAssembly = useWallAssemblyById(wall.wallAssemblyId)
  const viewportActions = useViewportActions()

  const openings = useWallOpeningsById(wallId)

  const handleFitToView = useCallback(() => {
    const points = [wall.insideLine.start, wall.insideLine.end, wall.outsideLine.start, wall.outsideLine.end]
    const bounds = Bounds2D.fromPoints(points)
    viewportActions.fitToView(bounds)
  }, [wall, viewportActions])

  const canDeleteWall = useMemo(() => {
    const result = canRemovePerimeterWall(wallId)
    const reasonKey = result.reason
    return {
      canDelete: result.canRemove,
      reason: reasonKey ? (($ => $.perimeterWall[reasonKey]) as Parameters<typeof t>[0]) : undefined
    }
  }, [canRemovePerimeterWall, wallId])

  const handleDelete = useCallback(() => {
    if (canDeleteWall.canDelete) {
      removePerimeterWall(wallId)
      popSelection()
    }
  }, [removePerimeterWall, wallId, canDeleteWall.canDelete])

  return (
    <div className="flex flex-col gap-4">
      {/* Basic Properties */}
      <div className="grid-cols-[auto_1fr] gap-3">
        {/* Wall Assembly */}
        <div className="flex items-center gap-1">
          <Label.Root>
            <span className="text-sm font-medium text-gray-900">{t($ => $.perimeterWall.wallAssembly)}</span>
          </Label.Root>
          <MeasurementInfo highlightedAssembly="wallAssembly" />
        </div>
        <WallAssemblySelectWithEdit
          value={wall.wallAssemblyId}
          onValueChange={(value: WallAssemblyId) => {
            updateOuterWallAssembly(wallId, value)
          }}
          placeholder={t($ => $.perimeterWall.selectAssemblyPlaceholder)}
          size="1"
        />

        {/* Thickness Input */}
        <div className="flex items-center gap-1">
          <Label.Root htmlFor="wall-thickness">
            <span className="text-sm font-medium text-gray-900">{t($ => $.perimeterWall.thickness)}</span>
          </Label.Root>
          <MeasurementInfo highlightedMeasurement="totalWallThickness" showFinishedSides />
        </div>
        <LengthField
          id="perimeter-thickness"
          value={wall.thickness}
          onCommit={value => {
            updateOuterWallThickness(wallId, value)
          }}
          min={50}
          max={1500}
          step={10}
          size="1"
          unit="cm"
          style={{ width: '5rem' }}
        />

        {/* Base Ring Beam */}
        <Label.Root>
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium text-gray-900">{t($ => $.perimeterWall.basePlate)}</span>
            <MeasurementInfo highlightedPart="basePlate" />
          </div>
        </Label.Root>
        <RingBeamAssemblySelectWithEdit
          value={wall.baseRingBeamAssemblyId}
          onValueChange={(value: RingBeamAssemblyId | undefined) => {
            if (value) {
              setWallBaseRingBeam(wallId, value)
            } else {
              removeWallBaseRingBeam(wallId)
            }
          }}
          placeholder={t($ => $.perimeterWall.nonePlaceholder)}
          size="1"
          allowNone
        />

        {/* Top Ring Beam */}
        <Label.Root>
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium text-gray-900">{t($ => $.perimeterWall.topPlate)}</span>
            <MeasurementInfo highlightedPart="topPlate" />
          </div>
        </Label.Root>
        <RingBeamAssemblySelectWithEdit
          value={wall.topRingBeamAssemblyId}
          onValueChange={(value: RingBeamAssemblyId | undefined) => {
            if (value) {
              setWallTopRingBeam(wallId, value)
            } else {
              removeWallTopRingBeam(wallId)
            }
          }}
          placeholder={t($ => $.perimeterWall.nonePlaceholder)}
          size="1"
          allowNone
        />
      </div>
      <Separator size="4" />
      {/* Measurements */}
      <div className="flex flex-col gap-2">
        <Heading size="2">{t($ => $.perimeterWall.measurements)}</Heading>
        <DataList.Root size="1">
          <DataList.Item>
            <DataList.Label minWidth="88px">{t($ => $.perimeterWall.insideLength)}</DataList.Label>
            <DataList.Value>{formatLength(wall.insideLength)}</DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label minWidth="88px">{t($ => $.perimeterWall.outsideLength)}</DataList.Label>
            <DataList.Value>{formatLength(wall.outsideLength)}</DataList.Value>
          </DataList.Item>
          {wallAssembly ? (
            <>
              <DataList.Item>
                <DataList.Label minWidth="88px">
                  <div className="flex items-center gap-1">
                    {t($ => $.perimeterWall.insideLayersThickness)}
                    <MeasurementInfo highlightedPart="insideLayer" />
                  </div>
                </DataList.Label>
                <DataList.Value>{formatLength(wallAssembly.layers.insideThickness)}</DataList.Value>
              </DataList.Item>
              <DataList.Item>
                <DataList.Label minWidth="88px">
                  <div className="flex items-center gap-1">
                    {t($ => $.perimeterWall.outsideLayersThickness)}
                    <MeasurementInfo highlightedPart="outsideLayer" />
                  </div>
                </DataList.Label>
                <DataList.Value>{formatLength(wallAssembly.layers.outsideThickness)}</DataList.Value>
              </DataList.Item>
              <DataList.Item>
                <DataList.Label minWidth="88px">
                  <div className="flex items-center gap-1">
                    {t($ => $.perimeterWall.constructionThickness)}
                    <MeasurementInfo highlightedPart="wallConstruction" />
                  </div>
                </DataList.Label>
                <DataList.Value>
                  {formatLength(
                    wall.thickness - wallAssembly.layers.outsideThickness - wallAssembly.layers.insideThickness
                  )}
                </DataList.Value>
              </DataList.Item>
            </>
          ) : (
            <></>
          )}
        </DataList.Root>
      </div>
      <Separator size="4" />
      {/* Openings */}
      <div className="flex flex-col gap-2">
        <Heading size="2">{t($ => $.perimeterWall.openings)}</Heading>
        <div className="grid-cols-3 gap-2">
          <Card size="1" variant="surface">
            <div className="flex-col gap-0 m--1">
              <span className="items-center text-base font-bold">
                {openings.filter(o => o.openingType === 'door').length}
              </span>
              <span className="items-center text-sm text-gray-900">{t($ => $.perimeterWall.doors)}</span>
            </div>
          </Card>
          <Card size="1" variant="surface">
            <div className="flex-col gap-0 m--1">
              <span className="items-center text-base font-bold">
                {openings.filter(o => o.openingType === 'window').length}
              </span>
              <span className="items-center text-sm text-gray-900">{t($ => $.perimeterWall.windows)}</span>
            </div>
          </Card>
          <Card size="1" variant="surface">
            <div className="flex-col gap-0 m--1">
              <span className="items-center text-base font-bold">
                {openings.filter(o => o.openingType === 'passage').length}
              </span>
              <span className="items-center text-sm text-gray-900">{t($ => $.perimeterWall.passages)}</span>
            </div>
          </Card>
        </div>
      </div>
      <Separator size="4" />
      {/* Actions */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-end gap-2">
          <ConstructionPlanModal
            title={t($ => $.perimeterWall.constructionPlanTitle)}
            constructionModelFactory={() => Promise.resolve(constructWall(wallId, true))}
            views={[
              { view: FRONT_VIEW, label: t($ => $.perimeterWall.viewOutside) },
              { view: BACK_VIEW, label: t($ => $.perimeterWall.viewInside) },
              { view: TOP_VIEW, label: t($ => $.perimeterWall.viewTop) }
            ]}
            defaultHiddenTags={['wall-layer']}
            refreshKey={[wallId]}
            trigger={
              <IconButton title={t($ => $.perimeterWall.viewConstructionPlan)} size="2">
                <ConstructionPlanIcon width={20} height={20} />
              </IconButton>
            }
          />

          <IconButton
            size="2"
            title={t($ => $.perimeterWall.splitWall)}
            onClick={() => {
              pushTool('perimeter.split-wall')
            }}
          >
            <SplitWallIcon width={20} height={20} />
          </IconButton>
          <IconButton size="2" title={t($ => $.perimeterWall.fitToView)} onClick={handleFitToView}>
            <FitToViewIcon width={20} height={20} />
          </IconButton>
          <IconButton
            size="2"
            color="red"
            title={canDeleteWall.reason ? t(canDeleteWall.reason) : t($ => $.perimeterWall.deleteWall)}
            onClick={handleDelete}
            disabled={!canDeleteWall.canDelete}
          >
            <TrashIcon width={20} height={20} />
          </IconButton>
        </div>
      </div>
    </div>
  )
}
