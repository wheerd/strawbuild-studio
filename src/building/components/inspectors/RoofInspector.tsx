import { TrashIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import { Box, DataList, Flex, Grid, IconButton, Separator, Text, TextField } from '@radix-ui/themes'
import { useCallback, useMemo } from 'react'

import type { RoofId } from '@/building/model/ids'
import { useModelActions, useRoofById } from '@/building/store'
import { popSelection } from '@/editor/hooks/useSelectionStore'
import { useViewportActions } from '@/editor/hooks/useViewportStore'
import { FitToViewIcon } from '@/shared/components/Icons'
import { LengthField } from '@/shared/components/LengthField'
import { Bounds2D, calculatePolygonArea, polygonPerimeter } from '@/shared/geometry'
import { formatArea, formatLength } from '@/shared/utils/formatting'

interface RoofInspectorProps {
  roofId: RoofId
}

export function RoofInspector({ roofId }: RoofInspectorProps): React.JSX.Element | null {
  const roof = useRoofById(roofId)
  const { removeRoof, updateRoofProperties, updateRoofOverhang } = useModelActions()
  const { fitToView } = useViewportActions()

  const perimeterLength = useMemo(() => {
    if (!roof) return 0
    return polygonPerimeter(roof.area)
  }, [roof])

  const area = useMemo(() => {
    if (!roof) return 0
    return calculatePolygonArea(roof.area)
  }, [roof])

  const handleFitToView = useCallback(() => {
    if (!roof) return
    const bounds = Bounds2D.fromPoints(roof.area.points)
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
        updateRoofProperties(roof.id, { ridgeHeight: value })
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
          {roof.referencePerimeter && (
            <DataList.Item>
              <DataList.Label>Reference Perimeter</DataList.Label>
              <DataList.Value>{roof.referencePerimeter.slice(0, 8)}...</DataList.Value>
            </DataList.Item>
          )}
        </DataList.Root>

        <Separator size="4" />

        {/* Editable Properties */}
        <Grid columns="auto 1fr" gap="2">
          {/* Slope */}
          <Flex align="center" gap="1">
            <Label.Root htmlFor="roof-slope">
              <Text size="1" weight="medium" color="gray">
                Slope (°)
              </Text>
            </Label.Root>
          </Flex>
          <TextField.Root
            id="roof-slope"
            type="number"
            value={roof.slope.toString()}
            onChange={e => {
              const value = parseFloat(e.target.value)
              if (!isNaN(value)) {
                handleSlopeChange(value)
              }
            }}
            size="1"
            style={{ width: '5rem' }}
          />

          {/* Ridge Height */}
          <Flex align="center" gap="1">
            <Label.Root htmlFor="ridge-height">
              <Text size="1" weight="medium" color="gray">
                Ridge Height
              </Text>
            </Label.Root>
          </Flex>
          <LengthField
            id="ridge-height"
            value={roof.ridgeHeight}
            onCommit={handleRidgeHeightChange}
            min={0}
            max={10000}
            step={10}
            size="1"
            unit="mm"
            style={{ width: '5rem' }}
          />

          {/* Global Overhang */}
          <Flex align="center" gap="1">
            <Label.Root htmlFor="roof-overhang">
              <Text size="1" weight="medium" color="gray">
                Overhang
              </Text>
            </Label.Root>
          </Flex>
          <LengthField
            id="roof-overhang"
            value={averageOverhang}
            onCommit={handleOverhangChange}
            min={0}
            max={2000}
            step={10}
            size="1"
            unit="mm"
            style={{ width: '5rem' }}
          />
        </Grid>

        <Separator size="4" />

        {/* Action Buttons */}
        <Flex gap="2" justify="end">
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
