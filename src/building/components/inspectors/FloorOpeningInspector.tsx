import { TrashIcon } from '@radix-ui/react-icons'
import { Box, DataList, Flex, IconButton, Separator, Text } from '@radix-ui/themes'
import { useCallback, useMemo } from 'react'

import type { FloorOpeningId } from '@/building/model/ids'
import { useFloorOpeningById, useModelActions } from '@/building/store'
import { popSelection } from '@/editor/hooks/useSelectionStore'
import { useViewportActions } from '@/editor/hooks/useViewportStore'
import { FitToViewIcon } from '@/shared/components/Icons'
import { boundsFromPoints, calculatePolygonArea, polygonPerimeter } from '@/shared/geometry'
import { formatLength } from '@/shared/utils/formatLength'

interface FloorOpeningInspectorProps {
  floorOpeningId: FloorOpeningId
}

export function FloorOpeningInspector({ floorOpeningId }: FloorOpeningInspectorProps): React.JSX.Element | null {
  const opening = useFloorOpeningById(floorOpeningId)
  const { removeFloorOpening } = useModelActions()
  const { fitToView } = useViewportActions()

  const perimeterLength = useMemo(() => {
    if (!opening) return 0
    return polygonPerimeter(opening.area)
  }, [opening])

  const areaSquareMeters = useMemo(() => {
    if (!opening) return 0
    return calculatePolygonArea(opening.area) / 1_000_000
  }, [opening])

  const handleFitToView = useCallback(() => {
    if (!opening) return
    const bounds = boundsFromPoints(opening.area.points)
    fitToView(bounds)
  }, [opening, fitToView])

  if (!opening) {
    return (
      <Box p="2">
        <Text size="1" color="red" weight="bold">
          Floor opening not found.
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
            <DataList.Value>{areaSquareMeters.toFixed(2)} m²</DataList.Value>
          </DataList.Item>
        </DataList.Root>

        <Separator size="4" />

        <Flex gap="2" justify="end">
          <IconButton size="2" title="Fit to view" onClick={handleFitToView}>
            <FitToViewIcon />
          </IconButton>
          <IconButton
            color="red"
            title="Remove floor opening"
            onClick={() => {
              removeFloorOpening(opening.id)
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
