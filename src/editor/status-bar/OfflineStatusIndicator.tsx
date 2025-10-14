import { Tooltip } from '@radix-ui/themes'
import React from 'react'

import { useOfflineStatus } from '@/shared/hooks/useOfflineStatus'

const STATUS_META: Record<
  ReturnType<typeof useOfflineStatus>['status'],
  { label: (args: { total: number; loaded: number }) => string; badge: string; color: string }
> = {
  offline: {
    label: () => 'Offline. Changes will sync once connection returns.',
    badge: 'Offline',
    color: 'var(--red-9)'
  },
  loading: {
    label: ({ loaded, total }) =>
      total > 0 ? `Caching assets (${loaded}/${total})…` : 'Preparing offline experience…',
    badge: 'Caching',
    color: 'var(--amber-9)'
  },
  ready: {
    label: () => 'All assets cached. Ready for offline use.',
    badge: 'Offline Ready',
    color: 'var(--grass-9)'
  }
}

export function OfflineStatusIndicator(): React.JSX.Element {
  const { status, progress } = useOfflineStatus()

  const meta = STATUS_META[status]
  const tooltipText = meta.label(progress)

  return (
    <Tooltip content={tooltipText} side="top" align="start">
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
