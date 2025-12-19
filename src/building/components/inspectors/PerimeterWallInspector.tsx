import { TrashIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import { Callout, Card, DataList, Flex, Grid, Heading, IconButton, Separator, Text } from '@radix-ui/themes'
import { useCallback, useMemo } from 'react'

import type { PerimeterId, PerimeterWallId, RingBeamAssemblyId, WallAssemblyId } from '@/building/model/ids'
import { useModelActions, usePerimeterById } from '@/building/store'
import { BACK_VIEW, FRONT_VIEW, TOP_VIEW } from '@/construction/components/ConstructionPlan'
import { ConstructionPlanModal } from '@/construction/components/ConstructionPlanModal'
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
import { formatLength } from '@/shared/utils/formatting'

interface PerimeterWallInspectorProps {
  perimeterId: PerimeterId
  wallId: PerimeterWallId
}

export function PerimeterWallInspector({ perimeterId, wallId }: PerimeterWallInspectorProps): React.JSX.Element {
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
          <Text weight="bold">Wall Not Found</Text>
          <br />
          Wall with ID {wallId} could not be found.
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
              Wall Assembly
            </Text>
          </Label.Root>
          <MeasurementInfo highlightedAssembly="wallAssembly" />
        </Flex>
        <WallAssemblySelectWithEdit
          value={wall.wallAssemblyId}
          onValueChange={(value: WallAssemblyId) => {
            updateOuterWallAssembly(perimeterId, wallId, value)
          }}
          placeholder="Select wall assembly"
          size="1"
        />

        {/* Thickness Input */}
        <Flex align="center" gap="1">
          <Label.Root htmlFor="wall-thickness">
            <Text size="1" weight="medium" color="gray">
              Thickness
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
              Base Plate
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
          placeholder="None"
          size="1"
          allowNone
        />

        {/* Top Ring Beam */}
        <Label.Root>
          <Flex align="center" gap="1">
            <Text size="1" weight="medium" color="gray">
              Top Plate
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
          placeholder="None"
          size="1"
          allowNone
        />
      </Grid>

      <Separator size="4" />

      {/* Measurements */}
      <Flex direction="column" gap="2">
        <Heading size="2">Measurements</Heading>
        <DataList.Root size="1">
          <DataList.Item>
            <DataList.Label minWidth="88px">Inside Length</DataList.Label>
            <DataList.Value>{formatLength(wall.insideLength)}</DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label minWidth="88px">Outside Length</DataList.Label>
            <DataList.Value>{formatLength(wall.outsideLength)}</DataList.Value>
          </DataList.Item>
          {wallAssembly ? (
            <>
              <DataList.Item>
                <DataList.Label minWidth="88px">
                  <Flex align="center" gap="1">
                    Inside Layers Thickness
                    <MeasurementInfo highlightedPart="insideLayer" />
                  </Flex>
                </DataList.Label>
                <DataList.Value>{formatLength(wallAssembly.layers.insideThickness)}</DataList.Value>
              </DataList.Item>
              <DataList.Item>
                <DataList.Label minWidth="88px">
                  <Flex align="center" gap="1">
                    Outside Layers Thickness
                    <MeasurementInfo highlightedPart="outsideLayer" />
                  </Flex>
                </DataList.Label>
                <DataList.Value>{formatLength(wallAssembly.layers.outsideThickness)}</DataList.Value>
              </DataList.Item>
              <DataList.Item>
                <DataList.Label minWidth="88px">
                  <Flex align="center" gap="1">
                    Construction Thickness
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
        <Heading size="2">Openings</Heading>
        <Grid columns="3" gap="2">
          <Card size="1" variant="surface">
            <Flex direction="column" gap="0" m="-1">
              <Text align="center" size="2" weight="bold">
                {wall.openings.filter(o => o.type === 'door').length}
              </Text>
              <Text align="center" size="1" color="gray">
                Doors
              </Text>
            </Flex>
          </Card>
          <Card size="1" variant="surface">
            <Flex direction="column" gap="0" m="-1">
              <Text align="center" size="2" weight="bold">
                {wall.openings.filter(o => o.type === 'window').length}
              </Text>
              <Text align="center" size="1" color="gray">
                Windows
              </Text>
            </Flex>
          </Card>
          <Card size="1" variant="surface">
            <Flex direction="column" gap="0" m="-1">
              <Text align="center" size="2" weight="bold">
                {wall.openings.filter(o => o.type === 'passage').length}
              </Text>
              <Text align="center" size="1" color="gray">
                Passages
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
            title="Wall Construction Plan"
            constructionModelFactory={async () => constructWall(perimeterId, wallId, true)}
            views={[
              { view: FRONT_VIEW, label: 'Outside' },
              { view: BACK_VIEW, label: 'Inside' },
              { view: TOP_VIEW, label: 'Top' }
            ]}
            defaultHiddenTags={['wall-layer']}
            refreshKey={[perimeterId, wallId]}
            trigger={
              <IconButton title="View Construction Plan" size="2">
                <ConstructionPlanIcon width={20} height={20} />
              </IconButton>
            }
          />

          <IconButton size="2" title="Split Wall" onClick={() => pushTool('perimeter.split-wall')}>
            <SplitWallIcon width={20} height={20} />
          </IconButton>
          <IconButton size="2" title="Fit to View" onClick={handleFitToView}>
            <FitToViewIcon width={20} height={20} />
          </IconButton>
          <IconButton
            size="2"
            color="red"
            title={canDeleteWall.canDelete ? 'Delete Wall' : canDeleteWall.reason}
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
