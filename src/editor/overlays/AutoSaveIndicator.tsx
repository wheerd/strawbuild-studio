import { CheckIcon, Cross2Icon, UpdateIcon } from '@radix-ui/react-icons'
import { Box, Tooltip } from '@radix-ui/themes'
import React from 'react'

import { usePersistenceStore } from '@/building/store/persistenceStore'

export function AutoSaveIndicator(): React.JSX.Element {
  const isSaving = usePersistenceStore(s => s.isSaving)
  const lastSaved = usePersistenceStore(s => s.lastSaved)
  const saveError = usePersistenceStore(s => s.saveError)

  const getStatusInfo = () => {
    if (saveError) {
      return {
        text: 'Save failed',
        icon: <Cross2Icon />,
        color: 'red' as const
      }
    }

    if (isSaving) {
      return {
        text: 'Saving...',
        icon: <UpdateIcon className="animate-spin" />,
        color: 'blue' as const
      }
    }

    if (lastSaved) {
      const now = new Date()
      const diffMs = now.getTime() - lastSaved.getTime()
      const diffMinutes = Math.floor(diffMs / 60000)

      let timeText: string
      if (diffMinutes < 1) {
        timeText = 'Just now'
      } else if (diffMinutes < 60) {
        timeText = `${diffMinutes}m ago`
      } else {
        const diffHours = Math.floor(diffMinutes / 60)
        timeText = `${diffHours}h ago`
      }

      return {
        text: `Saved ${timeText}`,
        icon: <CheckIcon />,
        color: 'green' as const
      }
    }

    return {
      text: 'Not saved',
      icon: <Cross2Icon />,
      color: 'gray' as const
    }
  }

  const statusInfo = getStatusInfo()

  return (
    <Box top="2" left="2" className="absolute z-10">
      <Tooltip content={statusInfo.text}>
        <Box
          p="1"
          style={{
            color: `var(--${statusInfo.color}-9)`,
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-2)',
            border: '1px solid var(--gray-6)',
            cursor: 'default'
          }}
        >
          {statusInfo.icon}
        </Box>
      </Tooltip>
    </Box>
  )
}
