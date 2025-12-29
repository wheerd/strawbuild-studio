import { Box, Card, Flex, SegmentedControl } from '@radix-ui/themes'
import { useTranslation } from 'react-i18next'

import { useViewMode, useViewModeActions } from '@/editor/hooks/useViewMode'

export function ViewModeToggle(): React.JSX.Element {
  const { t } = useTranslation('common')
  const mode = useViewMode()
  const { setMode } = useViewModeActions()

  return (
    <Box position="absolute" top="2" left="2" className="z-10" data-testid="viewmode-toggle">
      <Card size="1" variant="surface" className="shadow-md">
        <Flex m="-2">
          <SegmentedControl.Root
            size="1"
            value={mode}
            onValueChange={value => {
              setMode(value as 'walls' | 'floors' | 'roofs')
            }}
          >
            <SegmentedControl.Item value="walls">{t($ => $.viewMode.walls)}</SegmentedControl.Item>
            <SegmentedControl.Item value="floors">{t($ => $.viewMode.floors)}</SegmentedControl.Item>
            <SegmentedControl.Item value="roofs">{t($ => $.viewMode.roofs)}</SegmentedControl.Item>
          </SegmentedControl.Root>
        </Flex>
      </Card>
    </Box>
  )
}
