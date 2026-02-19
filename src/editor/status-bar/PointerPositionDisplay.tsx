import { MousePointer } from 'lucide-react'
import React from 'react'

import { usePointerWorldPosition } from '@/editor/hooks/usePointerPosition'
import { useFormatters } from '@/shared/i18n/useFormatters'

export function PointerPositionDisplay(): React.JSX.Element {
  const { formatLength } = useFormatters()
  const pointer = usePointerWorldPosition()
  return (
    <div className="flex items-center gap-2">
      <MousePointer className="h-4 w-4" />
      <span className="text-muted-foreground font-mono text-xs">
        {pointer ? `${formatLength(pointer[0])},${formatLength(pointer[1])}` : '--'}
      </span>
    </div>
  )
}
