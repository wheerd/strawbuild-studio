import { TrashIcon } from '@radix-ui/react-icons'
import { Box, DataList, Flex, IconButton, Separator, Text } from '@radix-ui/themes'
import { useCallback, useMemo } from 'react'

import type { FloorAreaId } from '@/building/model/ids'
import { useFloorAreaById, useModelActions } from '@/building/store'
import { popSelection } from '@/editor/hooks/useSelectionStore'
import { useViewportActions } from '@/editor/hooks/useViewportStore'
import { FitToViewIcon } from '@/shared/components/Icons'
import { Bounds2D, calculatePolygonArea, polygonPerimeter } from '@/shared/geometry'
import { formatArea, formatLength } from '@/shared/utils/formatting'

interface FloorAreaInspectorProps {
  floorAreaId: FloorAreaId
}

export function FloorAreaInspector({ floorAreaId }: FloorAreaInspectorProps): React.JSX.Element | null {
  const floorArea = useFloorAreaById(floorAreaId)
  const { removeFloorArea } = useModelActions()
  const { fitToView } = useViewportActions()

  const perimeterLength = useMemo(() => {
    if (!floorArea) return 0
    return polygonPerimeter(floorArea.area)
  }, [floorArea])

  const area = useMemo(() => {
    if (!floorArea) return 0
    return calculatePolygonArea(floorArea.area)
  }, [floorArea])

  const handleFitToView = useCallback(() => {
    if (!floorArea) return
    const bounds = Bounds2D.fromPoints(floorArea.area.points)
    fitToView(bounds)
  }, [floorArea, fitToView])

  if (!floorArea) {
    return (
      <Box p="2">
        <Text size="1" color="red" weight="bold">
          Floor area not found.
        </Text>
      </Box>
    )
  }

  return (
    <Box p="2">
      <Flex direction="column" gap="3">
        <DataList.Root size="1">
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

        <Flex gap="2" justify="end">
          <IconButton size="2" title="Fit to view" onClick={handleFitToView}>
            <FitToViewIcon />
          </IconButton>
          <IconButton
            size="2"
            color="red"
            title="Remove floor area"
            onClick={() => {
              removeFloorArea(floorArea.id)
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
