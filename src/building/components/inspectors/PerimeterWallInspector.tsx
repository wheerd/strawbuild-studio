import { TrashIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import { Callout, Card, DataList, Flex, Grid, Heading, IconButton, Separator, Text } from '@radix-ui/themes'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import type { PerimeterId, PerimeterWallId, RingBeamAssemblyId, WallAssemblyId } from '@/building/model/ids'
import { useModelActions, usePerimeterById } from '@/building/store'
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
import { Bounds2D, type Polygon2D, type Vec2, copyVec2 } from '@/shared/geometry'
import { wouldClosingPolygonSelfIntersect } from '@/shared/geometry/polygon'
import { useFormatters } from '@/shared/i18n/useFormatters'

interface PerimeterWallInspectorProps {
  perimeterId: PerimeterId
  wallId: PerimeterWallId
}

export function PerimeterWallInspector({ perimeterId, wallId }: PerimeterWallInspectorProps): React.JSX.Element {
  const { t } = useTranslation('inspector')
  const { formatLength } = useFormatters()
  const {
    updatePerimeterWallThickness: updateOuterWallThickness,
    updatePerimeterWallAssembly: updateOuterWallAssembly,
    setWallBaseRingBeam,
    setWallTopRingBeam,
    removeWallBaseRingBeam,
    removeWallTopRingBeam,
    removePerimeterWall
  } = useModelActions()

  const outerWall = usePerimeterById(perimeterId)
  const viewportActions = useViewportActions()

  // Use useMemo to find wall within the wall object
  const wall = useMemo(() => {
    return outerWall?.walls.find(s => s.id === wallId)
  }, [outerWall, wallId])

  // If wall not found, show error
  if (!wall || !outerWall) {
    return (
      <Callout.Root color="red">
        <Callout.Text>
          <Text weight="bold">{t('perimeterWall.notFound')}</Text>
          <br />
          {t('perimeterWall.notFoundMessage', { id: wallId })}
        </Callout.Text>
      </Callout.Root>
    )
  }

  // Get assembly for this wall
  const wallAssembly = wall?.wallAssemblyId ? useWallAssemblyById(wall.wallAssemblyId) : null

  const handleFitToView = useCallback(() => {
    if (!wall) return
    const points = [wall.insideLine.start, wall.insideLine.end, wall.outsideLine.start, wall.outsideLine.end]
    const bounds = Bounds2D.fromPoints(points)
    viewportActions.fitToView(bounds)
  }, [wall, viewportActions])

  const canDeleteWall = useMemo(() => {
    if (!outerWall || !wall) return { canDelete: false, reason: 'Wall not found' }

    // Need at least 5 walls (triangle = 3 walls, removing 1 and merging = min 3 walls remaining, needs 5 to start)
    if (outerWall.walls.length < 5) {
      return { canDelete: false, reason: 'Cannot delete - perimeter needs at least 3 walls' }
    }

    // Check if removal would cause self-intersection
    const wallIndex = outerWall.walls.findIndex(w => w.id === wallId)
    if (wallIndex === -1) return { canDelete: false, reason: 'Wall not found' }

    const newBoundaryPoints: Vec2[] = outerWall.referencePolygon.map(point => copyVec2(point))
    const cornerIndex1 = wallIndex
    const cornerIndex2 = (wallIndex + 1) % outerWall.corners.length

    // Remove corners to test for self-intersection
    if (cornerIndex2 > cornerIndex1) {
      newBoundaryPoints.splice(cornerIndex2, 1)
      newBoundaryPoints.splice(cornerIndex1, 1)
    } else {
      newBoundaryPoints.splice(cornerIndex1, 1)
      newBoundaryPoints.splice(cornerIndex2, 1)
    }

    const newBoundaryPolygon: Polygon2D = { points: newBoundaryPoints }

    if (wouldClosingPolygonSelfIntersect(newBoundaryPolygon)) {
      return { canDelete: false, reason: 'Cannot delete - would create self-intersecting polygon' }
    }

    return { canDelete: true, reason: '' }
  }, [outerWall, wall, wallId])

  const handleDelete = useCallback(() => {
    if (canDeleteWall.canDelete) {
      removePerimeterWall(perimeterId, wallId)
      popSelection()
    }
  }, [removePerimeterWall, perimeterId, wallId, canDeleteWall.canDelete])

  return (
    <Flex direction="column" gap="4">
      {/* Basic Properties */}
      <Grid columns="auto 1fr" gap="3">
        {/* Wall Assembly */}
        <Flex align="center" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              {t('perimeterWall.wallAssembly')}
            </Text>
          </Label.Root>
          <MeasurementInfo highlightedAssembly="wallAssembly" />
        </Flex>
        <WallAssemblySelectWithEdit
          value={wall.wallAssemblyId}
          onValueChange={(value: WallAssemblyId) => {
            updateOuterWallAssembly(perimeterId, wallId, value)
          }}
          placeholder={t('perimeterWall.selectAssemblyPlaceholder')}
          size="1"
        />

        {/* Thickness Input */}
        <Flex align="center" gap="1">
          <Label.Root htmlFor="wall-thickness">
            <Text size="1" weight="medium" color="gray">
              {t('perimeterWall.thickness')}
            </Text>
          </Label.Root>
          <MeasurementInfo highlightedMeasurement="totalWallThickness" showFinishedSides />
        </Flex>
        <LengthField
          id="perimeter-thickness"
          value={wall.thickness}
          onCommit={value => updateOuterWallThickness(perimeterId, wallId, value)}
          min={50}
          max={1500}
          step={10}
          size="1"
          unit="cm"
          style={{ width: '5rem' }}
        />

        {/* Base Ring Beam */}
        <Label.Root>
          <Flex align="center" gap="1">
            <Text size="1" weight="medium" color="gray">
              {t('perimeterWall.basePlate')}
            </Text>
            <MeasurementInfo highlightedPart="basePlate" />
          </Flex>
        </Label.Root>
        <RingBeamAssemblySelectWithEdit
          value={wall.baseRingBeamAssemblyId}
          onValueChange={(value: RingBeamAssemblyId | undefined) => {
            if (value) {
              setWallBaseRingBeam(perimeterId, wallId, value)
            } else {
              removeWallBaseRingBeam(perimeterId, wallId)
            }
          }}
          placeholder={t('perimeterWall.nonePlaceholder')}
          size="1"
          allowNone
        />

        {/* Top Ring Beam */}
        <Label.Root>
          <Flex align="center" gap="1">
            <Text size="1" weight="medium" color="gray">
              {t('perimeterWall.topPlate')}
            </Text>
            <MeasurementInfo highlightedPart="topPlate" />
          </Flex>
        </Label.Root>
        <RingBeamAssemblySelectWithEdit
          value={wall.topRingBeamAssemblyId}
          onValueChange={(value: RingBeamAssemblyId | undefined) => {
            if (value) {
              setWallTopRingBeam(perimeterId, wallId, value)
            } else {
              removeWallTopRingBeam(perimeterId, wallId)
            }
          }}
          placeholder={t('perimeterWall.nonePlaceholder')}
          size="1"
          allowNone
        />
      </Grid>

      <Separator size="4" />

      {/* Measurements */}
      <Flex direction="column" gap="2">
        <Heading size="2">{t('perimeterWall.measurements')}</Heading>
        <DataList.Root size="1">
          <DataList.Item>
            <DataList.Label minWidth="88px">{t('perimeterWall.insideLength')}</DataList.Label>
            <DataList.Value>{formatLength(wall.insideLength)}</DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label minWidth="88px">{t('perimeterWall.outsideLength')}</DataList.Label>
            <DataList.Value>{formatLength(wall.outsideLength)}</DataList.Value>
          </DataList.Item>
          {wallAssembly ? (
            <>
              <DataList.Item>
                <DataList.Label minWidth="88px">
                  <Flex align="center" gap="1">
                    {t('perimeterWall.insideLayersThickness')}
                    <MeasurementInfo highlightedPart="insideLayer" />
                  </Flex>
                </DataList.Label>
                <DataList.Value>{formatLength(wallAssembly.layers.insideThickness)}</DataList.Value>
              </DataList.Item>
              <DataList.Item>
                <DataList.Label minWidth="88px">
                  <Flex align="center" gap="1">
                    {t('perimeterWall.outsideLayersThickness')}
                    <MeasurementInfo highlightedPart="outsideLayer" />
                  </Flex>
                </DataList.Label>
                <DataList.Value>{formatLength(wallAssembly.layers.outsideThickness)}</DataList.Value>
              </DataList.Item>
              <DataList.Item>
                <DataList.Label minWidth="88px">
                  <Flex align="center" gap="1">
                    {t('perimeterWall.constructionThickness')}
                    <MeasurementInfo highlightedPart="wallConstruction" />
                  </Flex>
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
      </Flex>

      <Separator size="4" />

      {/* Openings */}
      <Flex direction="column" gap="2">
        <Heading size="2">{t('perimeterWall.openings')}</Heading>
        <Grid columns="3" gap="2">
          <Card size="1" variant="surface">
            <Flex direction="column" gap="0" m="-1">
              <Text align="center" size="2" weight="bold">
                {wall.openings.filter(o => o.type === 'door').length}
              </Text>
              <Text align="center" size="1" color="gray">
                {t('perimeterWall.doors')}
              </Text>
            </Flex>
          </Card>
          <Card size="1" variant="surface">
            <Flex direction="column" gap="0" m="-1">
              <Text align="center" size="2" weight="bold">
                {wall.openings.filter(o => o.type === 'window').length}
              </Text>
              <Text align="center" size="1" color="gray">
                {t('perimeterWall.windows')}
              </Text>
            </Flex>
          </Card>
          <Card size="1" variant="surface">
            <Flex direction="column" gap="0" m="-1">
              <Text align="center" size="2" weight="bold">
                {wall.openings.filter(o => o.type === 'passage').length}
              </Text>
              <Text align="center" size="1" color="gray">
                {t('perimeterWall.passages')}
              </Text>
            </Flex>
          </Card>
        </Grid>
      </Flex>

      <Separator size="4" />

      {/* Actions */}
      <Flex direction="column" gap="2">
        <Flex gap="2" justify="end">
          <ConstructionPlanModal
            title={t('perimeterWall.constructionPlanTitle')}
            constructionModelFactory={async () => constructWall(perimeterId, wallId, true)}
            views={[
              { view: FRONT_VIEW, label: t('perimeterWall.viewOutside') },
              { view: BACK_VIEW, label: t('perimeterWall.viewInside') },
              { view: TOP_VIEW, label: t('perimeterWall.viewTop') }
            ]}
            defaultHiddenTags={['wall-layer']}
            refreshKey={[perimeterId, wallId]}
            trigger={
              <IconButton title={t('perimeterWall.viewConstructionPlan')} size="2">
                <ConstructionPlanIcon width={20} height={20} />
              </IconButton>
            }
          />

          <IconButton size="2" title={t('perimeterWall.splitWall')} onClick={() => pushTool('perimeter.split-wall')}>
            <SplitWallIcon width={20} height={20} />
          </IconButton>
          <IconButton size="2" title={t('perimeterWall.fitToView')} onClick={handleFitToView}>
            <FitToViewIcon width={20} height={20} />
          </IconButton>
          <IconButton
            size="2"
            color="red"
            title={canDeleteWall.canDelete ? t('perimeterWall.deleteWall') : canDeleteWall.reason}
            onClick={handleDelete}
            disabled={!canDeleteWall.canDelete}
          >
            <TrashIcon width={20} height={20} />
          </IconButton>
        </Flex>
      </Flex>
    </Flex>
  )
}
