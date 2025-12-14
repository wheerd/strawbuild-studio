import { Cross2Icon } from '@radix-ui/react-icons'
import { Box, Card, Flex, IconButton, Text } from '@radix-ui/themes'

import { usePlanHighlight } from './context/PlanHighlightContext'

export function PartHighlightPanel() {
  const { highlightedPartId, setHighlightedPartId } = usePlanHighlight()

  if (!highlightedPartId) return null

  return (
    <Box position="absolute" bottom="3" left="3" className="z-10">
      <Card size="1" variant="surface" className="shadow-md">
        <Flex align="center" gap="2">
          <Text size="2">Part highlighted</Text>
          <IconButton size="1" variant="ghost" onClick={() => setHighlightedPartId(null)} title="Clear highlight">
            <Cross2Icon />
          </IconButton>
        </Flex>
      </Card>
    </Box>
  )
}
