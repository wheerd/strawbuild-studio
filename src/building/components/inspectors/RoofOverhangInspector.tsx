import * as Label from '@radix-ui/react-label'
import { Box, Callout, Flex, IconButton, Separator, Text } from '@radix-ui/themes'
import { useCallback } from 'react'

import type { RoofId, RoofOverhangId } from '@/building/model/ids'
import { useModelActions, useRoofById } from '@/building/store'
import { useViewportActions } from '@/editor/hooks/useViewportStore'
import { FitToViewIcon } from '@/shared/components/Icons'
import { LengthField } from '@/shared/components/LengthField'
import { Bounds2D } from '@/shared/geometry'

interface RoofOverhangInspectorProps {
  roofId: RoofId
  overhangId: RoofOverhangId
}

export function RoofOverhangInspector({ roofId, overhangId }: RoofOverhangInspectorProps): React.JSX.Element {
  const roof = useRoofById(roofId)
  const { updateRoofOverhangById } = useModelActions()
  const { fitToView } = useViewportActions()

  const overhang = roof?.overhangs.find(o => o.id === overhangId)

  const handleFitToView = useCallback(() => {
    if (!overhang) return
    const bounds = Bounds2D.fromPoints(overhang.area.points)
    fitToView(bounds)
  }, [overhang, fitToView])

  if (!roof || !overhang) {
    return (
      <Box p="2">
        <Callout.Root color="red">
          <Callout.Text>
            <Text weight="bold">Overhang Not Found</Text>
          </Callout.Text>
        </Callout.Root>
      </Box>
    )
  }

  return (
    <Box p="2">
      <Flex direction="column" gap="3">
        <Text size="2" weight="bold">
          Roof Overhang - Side {overhang.sideIndex + 1}
        </Text>

        <Separator size="4" />

        {/* Overhang Value */}
        <Flex align="center" gap="2" justify="between">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              Overhang
            </Text>
          </Label.Root>
          <LengthField
            value={overhang.value}
            onCommit={value => updateRoofOverhangById(roof.id, overhang.id, value)}
            min={0}
            max={2000}
            step={10}
            size="1"
            unit="cm"
            style={{ width: '7em' }}
          />
        </Flex>

        <Separator size="4" />

        {/* Actions */}
        <Flex gap="2" justify="end">
          <IconButton size="2" title="Fit to view" onClick={handleFitToView}>
            <FitToViewIcon />
          </IconButton>
        </Flex>
      </Flex>
    </Box>
  )
}
