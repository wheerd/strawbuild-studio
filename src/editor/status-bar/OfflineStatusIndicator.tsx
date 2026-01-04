import { Tooltip } from '@radix-ui/themes'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { useOfflineStatus } from '@/shared/hooks/useOfflineStatus'

export function OfflineStatusIndicator(): React.JSX.Element {
  const { t } = useTranslation('toolbar')
  const { status, progress } = useOfflineStatus()

  const getStatusMeta = () => {
    switch (status) {
      case 'offline':
        return {
          label: t($ => $.offlineStatus.offline),
          color: 'var(--red-9)'
        }
      case 'loading':
        return {
          label:
            progress.total > 0
              ? t($ => $.offlineStatus.loading, { loaded: progress.loaded, total: progress.total })
              : t($ => $.offlineStatus.loadingUnknown),
          color: 'var(--amber-9)'
        }
      case 'ready':
        return {
          label: t($ => $.offlineStatus.ready),
          color: 'var(--grass-9)'
        }
    }
  }

  const meta = getStatusMeta()

  return (
    <Tooltip content={meta.label} side="top" align="start">
      <span
        aria-hidden="true"
        className="m-1"
        style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: meta.color,
          boxShadow: '0 0 0 1px var(--gray-4)'
        }}
      />
    </Tooltip>
  )
}
