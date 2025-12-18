import { CursorArrowIcon } from '@radix-ui/react-icons'
import { Code, Flex } from '@radix-ui/themes'
import React from 'react'

import { usePointerWorldPosition } from '@/editor/hooks/usePointerPosition'
import { formatLength } from '@/shared/utils/formatting'

export function PointerPositionDisplay(): React.JSX.Element {
  const pointer = usePointerWorldPosition()
  return (
    <Flex align="center" gap="2">
      <CursorArrowIcon />
      <Code size="1" variant="ghost">
        {pointer ? `${formatLength(pointer[0])},${formatLength(pointer[1])}` : '--'}
      </Code>
    </Flex>
  )
}
