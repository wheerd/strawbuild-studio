import { ExclamationTriangleIcon, ReloadIcon } from '@radix-ui/react-icons'
import type React from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Tooltip } from '@/components/ui/tooltip'
import { useConstructionActions, useHasConstructionModel, useIsConstructionOutdated } from '@/construction/store'

export function ConstructionModelStatusBanner(): React.JSX.Element | null {
  const { t } = useTranslation('construction')
  const hasModel = useHasConstructionModel()
  const { rebuildModel } = useConstructionActions()
  const isOutdated = useIsConstructionOutdated()

  return (
    <div className="flex items-center gap-2 text-sm">
      {isOutdated && (
        <Tooltip content={t($ => $.modelStatus.outdatedWarning)}>
          <ExclamationTriangleIcon width={20} height={20} className="text-orange-500" />
        </Tooltip>
      )}
      <Button
        size="sm"
        variant="secondary"
        onClick={rebuildModel}
        className={
          isOutdated && hasModel ? 'text-destructive-foreground bg-orange-500 hover:bg-orange-500/80' : undefined
        }
        disabled={!hasModel}
      >
        {hasModel ? <ReloadIcon className="mr-1" /> : <Spinner size="sm" />}
        {hasModel ? t($ => $.modelStatus.regenerate) : t($ => $.modelStatus.rebuilding)}
      </Button>
    </div>
  )
}
