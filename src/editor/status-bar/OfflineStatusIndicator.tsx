import React from 'react'
import { useTranslation } from 'react-i18next'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useOfflineStatus } from '@/shared/hooks/useOfflineStatus'

export function OfflineStatusIndicator(): React.JSX.Element {
  const { t } = useTranslation('toolbar')
  const { status, progress } = useOfflineStatus()

  const getStatusMeta = () => {
    switch (status) {
      case 'offline':
        return {
          label: t($ => $.offlineStatus.offline),
          colorClass: 'bg-red-500'
        }
      case 'loading':
        return {
          label:
            progress.total > 0
              ? t($ => $.offlineStatus.loading, { loaded: progress.loaded, total: progress.total })
              : t($ => $.offlineStatus.loadingUnknown),
          colorClass: 'bg-amber-500'
        }
      case 'ready':
        return {
          label: t($ => $.offlineStatus.ready),
          colorClass: 'bg-green-500'
        }
    }
  }

  const meta = getStatusMeta()

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          aria-hidden="true"
          className={`m-1 w-3 h-3 rounded-full shadow-[0_0_0_1px] shadow-border ${meta.colorClass}`}
        />
      </TooltipTrigger>
      <TooltipContent side="top" items-start>
        {meta.label}
      </TooltipContent>
    </Tooltip>
  )
}
