import { FrameIcon } from '@radix-ui/react-icons'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useGridActions, useGridSize, useShowGrid } from '@/editor/hooks/useGrid'
import { useFormatters } from '@/shared/i18n/useFormatters'

export function GridSizeDisplay(): React.JSX.Element {
  const { t } = useTranslation('toolbar')
  const { formatLength } = useFormatters()
  const showGrid = useShowGrid()
  const gridSize = useGridSize()
  const { setShowGrid } = useGridActions()

  return (
    <Button
      title={showGrid ? t($ => $.gridSizeDisplay.hideGrid) : t($ => $.gridSizeDisplay.showGrid)}
      variant={showGrid ? 'secondary' : 'outline'}
      size="sm"
      className="h-7 min-w-[6em]"
      onClick={() => {
        setShowGrid(!showGrid)
      }}
    >
      <span className="flex items-center justify-end gap-2">
        <span className="text-xs">{showGrid ? formatLength(gridSize) : t($ => $.gridSizeDisplay.off)}</span>
        <FrameIcon className="h-4 w-4" />
      </span>
    </Button>
  )
}
