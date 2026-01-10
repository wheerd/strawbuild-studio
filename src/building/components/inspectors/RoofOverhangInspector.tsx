import * as Label from '@radix-ui/react-label'
import { Box, Callout, Flex, IconButton, Separator, Text } from '@radix-ui/themes'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import type { RoofOverhangId } from '@/building/model/ids'
import { useModelActions, useRoofOverhangById } from '@/building/store'
import { useViewportActions } from '@/editor/hooks/useViewportStore'
import { FitToViewIcon } from '@/shared/components/Icons'
import { LengthField } from '@/shared/components/LengthField'
import { Bounds2D } from '@/shared/geometry'

export function RoofOverhangInspector({ overhangId }: { overhangId: RoofOverhangId }): React.JSX.Element {
  const { t } = useTranslation('inspector')
  const overhang = useRoofOverhangById(overhangId)
  const { updateRoofOverhangById } = useModelActions()
  const { fitToView } = useViewportActions()

  const handleFitToView = useCallback(() => {
    if (!overhang) return
    const bounds = Bounds2D.fromPoints(overhang.area.points)
    fitToView(bounds)
  }, [overhang, fitToView])

  if (!overhang) {
    return (
      <Box p="2">
        <Callout.Root color="red">
          <Callout.Text>
            <Text weight="bold">{t($ => $.roofOverhang.notFound)}</Text>
          </Callout.Text>
        </Callout.Root>
      </Box>
    )
  }

  return (
    <Box p="2">
      <Flex direction="column" gap="3">
        <Text size="2" weight="bold">
          {t($ => $.roofOverhang.title, {
            side: overhang.sideIndex + 1
          })}
        </Text>

        <Separator size="4" />

        {/* Overhang Value */}
        <Flex align="center" gap="2" justify="between">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              {t($ => $.roofOverhang.overhang)}
            </Text>
          </Label.Root>
          <LengthField
            value={overhang.value}
            onCommit={value => updateRoofOverhangById(overhang.id, value)}
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
          <IconButton size="2" title={t($ => $.roofOverhang.fitToView)} onClick={handleFitToView}>
            <FitToViewIcon />
          </IconButton>
        </Flex>
      </Flex>
    </Box>
  )
}
