import { TriangleAlert, RefreshCw } from 'lucide-react'
import type React from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Tooltip } from '@/components/ui/tooltip'
import { useConstructionActions, useHasConstructionModel, useIsConstructionOutdated } from '@/construction/store'

export function ConstructionModelRegenerateButton({ compact }: { compact?: boolean }): React.JSX.Element | null {
  const { t } = useTranslation('construction')
  const hasModel = useHasConstructionModel()
  const { rebuildModel } = useConstructionActions()
  const isOutdated = useIsConstructionOutdated()

  const label = hasModel ? t($ => $.modelStatus.regenerate) : t($ => $.modelStatus.rebuilding)
  return (
    <div className="flex items-center gap-2 text-sm">
      {isOutdated && (
        <Tooltip content={t($ => $.modelStatus.outdatedWarning)}>
          <TriangleAlert width={20} height={20} className="text-orange-500" />
        </Tooltip>
      )}
      <Button
        size={compact ? 'icon-sm' : 'sm'}
        variant="secondary"
        onClick={rebuildModel}
        className={
          isOutdated && hasModel ? 'text-destructive-foreground bg-orange-500 hover:bg-orange-500/80' : undefined
        }
        disabled={!hasModel}
        title={compact ? label : undefined}
      >
        {hasModel ? <RefreshCw className="mr-1" /> : <Spinner size="sm" />}
        {!compact && label}
      </Button>
    </div>
  )
}
