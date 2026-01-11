import { Cross2Icon } from '@radix-ui/react-icons'
import { Box, Card, Flex, IconButton, Text } from '@radix-ui/themes'
import { useTranslation } from 'react-i18next'

import { usePlanHighlight } from './PlanHighlightContext'

export function PartHighlightPanel() {
  const { t } = useTranslation('construction')
  const { highlightedPartId, setHighlightedPartId } = usePlanHighlight()

  if (!highlightedPartId) return null

  return (
    <Box position="absolute" bottom="3" left="3" className="z-10">
      <Card size="1" variant="surface" className="shadow-md">
        <Flex align="center" gap="2">
          <Text size="2">{t($ => $.planModal.partHighlight.partHighlighted)}</Text>
          <IconButton
            size="1"
            variant="ghost"
            onClick={() => {
              setHighlightedPartId(null)
            }}
            title={t($ => $.planModal.partHighlight.clearHighlight)}
          >
            <Cross2Icon />
          </IconButton>
        </Flex>
      </Card>
    </Box>
  )
}
