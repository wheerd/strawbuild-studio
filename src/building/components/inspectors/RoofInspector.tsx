import { ExclamationTriangleIcon, ReloadIcon, TrashIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import { Box, DataList, Flex, IconButton, Separator, Text, TextField, Tooltip } from '@radix-ui/themes'
import { useCallback, useMemo } from 'react'

import { RoofPreview } from '@/building/components/inspectors/RoofPreview'
import type { RoofId } from '@/building/model/ids'
import type { RoofOverhang } from '@/building/model/model'
import { useModelActions, useRoofById } from '@/building/store'
import { FRONT_VIEW, LEFT_VIEW, TOP_VIEW } from '@/construction/components/ConstructionPlan'
import { ConstructionPlanModal } from '@/construction/components/ConstructionPlanModal'
import { RoofAssemblySelectWithEdit } from '@/construction/config/components/RoofAssemblySelectWithEdit'
import { useDefaultRoofAssemblyId } from '@/construction/config/store'
import { constructRoof } from '@/construction/roof'
import { ConstructionViewer3DModal } from '@/construction/viewer3d/ConstructionViewer3DModal'
import { popSelection } from '@/editor/hooks/useSelectionStore'
import { useViewportActions } from '@/editor/hooks/useViewportStore'
import { ConstructionPlanIcon, FitToViewIcon, Model3DIcon } from '@/shared/components/Icons'
import { LengthField } from '@/shared/components/LengthField'
import {
  Bounds2D,
  type Length,
  calculatePolygonArea,
  degreesToRadians,
  polygonPerimeter,
  radiansToDegrees
} from '@/shared/geometry'
import { formatArea, formatLength } from '@/shared/utils/formatting'

interface RoofInspectorProps {
  roofId: RoofId
}

interface MixedState<T> {
  isMixed: boolean
  value: T | null
}

function detectMixedOverhangs(overhangs: RoofOverhang[]): MixedState<Length> {
  if (overhangs.length === 0) return { isMixed: false, value: null }

  const firstValue = overhangs[0].value
  const allSame = overhangs.every(o => o.value === firstValue)

  return {
    isMixed: !allSame,
    value: allSame ? firstValue : null
  }
}

function MixedStateIndicator() {
  return (
    <Tooltip content="Different values across sides. Changing this will update all sides.">
      <ExclamationTriangleIcon width={14} height={14} style={{ color: 'var(--amber-9)' }} />
    </Tooltip>
  )
}

export function RoofInspector({ roofId }: RoofInspectorProps): React.JSX.Element | null {
  const roof = useRoofById(roofId)
  const { removeRoof, updateRoofProperties, setAllRoofOverhangs, cycleRoofMainSide } = useModelActions()
  const { fitToView } = useViewportActions()
  const defaultAssemblyId = useDefaultRoofAssemblyId()

  const perimeterLength = useMemo(() => {
    if (!roof) return 0
    return polygonPerimeter(roof.overhangPolygon)
  }, [roof])

  const area = useMemo(() => {
    if (!roof) return 0
    return calculatePolygonArea(roof.overhangPolygon)
  }, [roof])

  const overhangState = useMemo(
    () => (roof ? detectMixedOverhangs(roof.overhangs) : { isMixed: false, value: null }),
    [roof?.overhangs]
  )

  const handleFitToView = useCallback(() => {
    if (!roof) return
    const bounds = Bounds2D.fromPoints(roof.overhangPolygon.points)
    fitToView(bounds)
  }, [roof, fitToView])

  const handleSlopeChange = useCallback(
    (value: number) => {
      if (roof && value >= 0 && value <= 90) {
        updateRoofProperties(roof.id, { slope: value })
      }
    },
    [roof, updateRoofProperties]
  )

  const handleVerticalOffsetChange = useCallback(
    (value: number) => {
      if (roof) {
        updateRoofProperties(roof.id, { verticalOffset: value })
      }
    },
    [roof, updateRoofProperties]
  )

  if (!roof) {
    return (
      <Box p="2">
        <Text size="1" color="red" weight="bold">
          Roof not found.
        </Text>
      </Box>
    )
  }

  return (
    <Box p="2">
      <Flex direction="column" gap="3">
        <Flex justify="center">
          <RoofPreview slope={roof.slope} type={roof.type} />
        </Flex>

        {/* Basic Information */}
        <DataList.Root size="1">
          <DataList.Item>
            <DataList.Label>Type</DataList.Label>
            <DataList.Value>{roof.type === 'gable' ? 'Gable' : 'Shed'}</DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label>Perimeter</DataList.Label>
            <DataList.Value>{formatLength(perimeterLength)}</DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label>Area</DataList.Label>
            <DataList.Value>{formatArea(area)}</DataList.Value>
          </DataList.Item>
        </DataList.Root>

        <Separator size="4" />

        {/* Editable Properties */}
        <Flex direction="column" gap="2">
          {/* Assembly */}
          <Flex direction="column" gap="1">
            <Label.Root>
              <Text size="1" weight="medium" color="gray">
                Assembly
              </Text>
            </Label.Root>
            <RoofAssemblySelectWithEdit
              value={roof.assemblyId}
              onValueChange={assemblyId => updateRoofProperties(roof.id, { assemblyId })}
              showDefaultIndicator
              defaultAssemblyId={defaultAssemblyId}
              size="1"
            />
          </Flex>

          {/* Slope */}
          <Flex align="center" gap="2" justify="between">
            <Label.Root htmlFor="roof-slope">
              <Text size="1" weight="medium" color="gray">
                Slope
              </Text>
            </Label.Root>

            <Flex align="center" gap="2">
              <TextField.Root
                id="roof-slope"
                type="number"
                value={roof.slope.toFixed(3).replace(/\.?0+$/, '')}
                onChange={e => {
                  const value = parseFloat(e.target.value)
                  if (!isNaN(value) && value >= 0 && value <= 90) {
                    handleSlopeChange(value)
                  }
                }}
                size="1"
                min={0}
                max={90}
                style={{ width: '6em', textAlign: 'right' }}
              >
                <TextField.Slot side="right">°</TextField.Slot>
              </TextField.Root>

              <TextField.Root
                id="roof-slope"
                type="number"
                value={(Math.tan(degreesToRadians(roof.slope)) * 100).toFixed(3).replace(/\.?0+$/, '')}
                onChange={e => {
                  const value = parseFloat(e.target.value)
                  if (!isNaN(value)) {
                    handleSlopeChange(radiansToDegrees(Math.atan(value / 100)))
                  }
                }}
                size="1"
                min={0}
                max={100}
                step={1}
                style={{ width: '6em', textAlign: 'right' }}
              >
                <TextField.Slot side="right">%</TextField.Slot>
              </TextField.Root>
            </Flex>
          </Flex>

          {/* Vertical Offset */}
          <Flex align="center" gap="2" justify="between">
            <Label.Root htmlFor="vertical-offset">
              <Text size="1" weight="medium" color="gray">
                Vertical Offset
              </Text>
            </Label.Root>
            <LengthField
              id="vertical-offset"
              value={roof.verticalOffset}
              onCommit={handleVerticalOffsetChange}
              min={-10000}
              max={10000}
              size="1"
              unit="cm"
              style={{ width: '7em' }}
            />
          </Flex>

          {/* Global Overhang with MixedState */}
          <Flex align="center" gap="2" justify="between">
            <Label.Root htmlFor="roof-overhang">
              <Flex align="center" gap="1">
                <Text size="1" weight="medium" color="gray">
                  Overhang
                </Text>
                {overhangState.isMixed && <MixedStateIndicator />}
              </Flex>
            </Label.Root>
            <LengthField
              id="roof-overhang"
              value={overhangState.value as Length}
              onCommit={value => setAllRoofOverhangs(roof.id, value)}
              placeholder={overhangState.isMixed ? 'Mixed' : undefined}
              min={0}
              max={2000}
              step={10}
              size="1"
              unit="cm"
              style={{ width: '7em' }}
            />
          </Flex>

          {overhangState.isMixed && (
            <Text size="1" color="gray">
              Select individual overhang sides to edit them separately
            </Text>
          )}
        </Flex>

        <Separator size="4" />

        {/* Construction Views */}
        <Flex direction="row" gap="3" pt="1" align="center" justify="center">
          <ConstructionPlanModal
            title="Roof Construction Plan"
            constructionModelFactory={async () => constructRoof(roof)}
            midCutActiveDefault={false}
            views={[
              { view: TOP_VIEW, label: 'Top' },
              { view: FRONT_VIEW, label: 'Front' },
              { view: LEFT_VIEW, label: 'Left' }
            ]}
            defaultHiddenTags={['roof-layer']}
            refreshKey={roof}
            trigger={
              <IconButton title="View Construction Plan" size="3">
                <ConstructionPlanIcon width={24} height={24} />
              </IconButton>
            }
          />
          <ConstructionViewer3DModal
            constructionModelFactory={async () => constructRoof(roof)}
            refreshKey={roof}
            trigger={
              <IconButton title="View 3D Construction" size="3" variant="outline">
                <Model3DIcon width={24} height={24} />
              </IconButton>
            }
          />
        </Flex>

        <Separator size="4" />

        {/* Action Buttons */}
        <Flex gap="2" justify="end">
          <Tooltip content="Cycle main side (changes roof direction)">
            <IconButton size="2" onClick={() => cycleRoofMainSide(roofId)}>
              <ReloadIcon />
            </IconButton>
          </Tooltip>
          <IconButton size="2" title="Fit to view" onClick={handleFitToView}>
            <FitToViewIcon />
          </IconButton>
          <IconButton
            size="2"
            color="red"
            title="Remove roof"
            onClick={() => {
              removeRoof(roof.id)
              popSelection()
            }}
          >
            <TrashIcon />
          </IconButton>
        </Flex>
      </Flex>
    </Box>
  )
}
