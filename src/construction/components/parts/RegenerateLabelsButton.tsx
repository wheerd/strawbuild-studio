import { RefreshCw, TriangleAlert } from 'lucide-react'
import type React from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { useHasUnusedLabels, usePartActions } from '@/construction/parts'

interface RegenerateLabelsButtonProps {
  groupId?: string
  compact?: boolean
}

export function RegenerateLabelsButton({ groupId, compact }: RegenerateLabelsButtonProps): React.JSX.Element {
  const { t } = useTranslation('construction')
  const actions = usePartActions()
  const hasUnusedLabels = useHasUnusedLabels(groupId)

  const label = t($ => $.partsList.actions.regenerateLabels)
  const tooltipContent = hasUnusedLabels
    ? t($ => $.partsList.actions.unusedLabelsWarning)
    : t($ => $.partsList.actions.regenerateLabelsHint)

  return (
    <div className="flex items-center gap-2 text-sm">
      {hasUnusedLabels && (
        <Tooltip content={tooltipContent}>
          <TriangleAlert width={18} height={18} className="text-yellow-500" />
        </Tooltip>
      )}
      <Tooltip content={compact ? tooltipContent : undefined}>
        <Button
          size={compact ? 'icon-sm' : 'sm'}
          variant="secondary"
          onClick={() => {
            actions.resetLabels(groupId)
          }}
          className={hasUnusedLabels ? 'text-destructive-foreground bg-yellow-500 hover:bg-yellow-500/80' : undefined}
          title={compact ? label : undefined}
        >
          <RefreshCw className={compact ? '' : 'mr-1'} />
          {!compact && label}
        </Button>
      </Tooltip>
    </div>
  )
}
