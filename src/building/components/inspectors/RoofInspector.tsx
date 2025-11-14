import { ReloadIcon, TrashIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import { Box, DataList, Flex, IconButton, Separator, Text, TextField, Tooltip } from '@radix-ui/themes'
import { useCallback, useMemo } from 'react'

import type { RoofId } from '@/building/model/ids'
import { useModelActions, useRoofById } from '@/building/store'
import { popSelection } from '@/editor/hooks/useSelectionStore'
import { useViewportActions } from '@/editor/hooks/useViewportStore'
import { FitToViewIcon } from '@/shared/components/Icons'
import { LengthField } from '@/shared/components/LengthField'
import { Bounds2D, calculatePolygonArea, degreesToRadians, polygonPerimeter, radiansToDegrees } from '@/shared/geometry'
import { formatArea, formatLength } from '@/shared/utils/formatting'

interface RoofInspectorProps {
  roofId: RoofId
}

export function RoofInspector({ roofId }: RoofInspectorProps): React.JSX.Element | null {
  const roof = useRoofById(roofId)
  const { removeRoof, updateRoofProperties, updateRoofOverhang, cycleRoofMainSide } = useModelActions()
  const { fitToView } = useViewportActions()

  const perimeterLength = useMemo(() => {
    if (!roof) return 0
    return polygonPerimeter(roof.overhangPolygon)
  }, [roof])

  const area = useMemo(() => {
    if (!roof) return 0
    return calculatePolygonArea(roof.overhangPolygon)
  }, [roof])

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

  const handleRidgeHeightChange = useCallback(
    (value: number) => {
      if (roof && value >= 0) {
        updateRoofProperties(roof.id, { verticalOffset: value })
      }
    },
    [roof, updateRoofProperties]
  )

  // Calculate average overhang (for display/edit)
  const averageOverhang = useMemo(() => {
    if (!roof) return 0
    return roof.overhang.reduce((sum, val) => sum + val, 0) / roof.overhang.length
  }, [roof])

  const handleOverhangChange = useCallback(
    (value: number) => {
      if (!roof || value < 0) return
      // Update all overhangs to the same value
      for (let i = 0; i < roof.overhang.length; i++) {
        updateRoofOverhang(roof.id, i, value)
      }
    },
    [roof, updateRoofOverhang]
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
          {/* Slope */}
          <Flex align="center" gap="2" justify="between">
            <Label.Root htmlFor="roof-slope">
              <Text size="1" weight="medium" color="gray">
                Slope (°)
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
              onCommit={handleRidgeHeightChange}
              min={0}
              max={10000}
              size="1"
              unit="cm"
              style={{ width: '7em' }}
            />
          </Flex>

          {/* Global Overhang */}
          <Flex align="center" gap="2" justify="between">
            <Label.Root htmlFor="roof-overhang">
              <Text size="1" weight="medium" color="gray">
                Overhang
              </Text>
            </Label.Root>
            <LengthField
              id="roof-overhang"
              value={averageOverhang}
              onCommit={handleOverhangChange}
              min={0}
              max={2000}
              step={10}
              size="1"
              unit="cm"
              style={{ width: '7em' }}
            />
          </Flex>
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
