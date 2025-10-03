import { CheckIcon, Cross2Icon, DownloadIcon, UpdateIcon, UploadIcon } from '@radix-ui/react-icons'
import { Box, Button, DropdownMenu, IconButton, Tooltip } from '@radix-ui/themes'
import React from 'react'

import { usePersistenceStore } from '@/building/store/persistenceStore'

export function AutoSaveIndicator(): React.JSX.Element {
  const isSaving = usePersistenceStore(s => s.isSaving)
  const lastSaved = usePersistenceStore(s => s.lastSaved)
  const saveError = usePersistenceStore(s => s.saveError)
  const isExporting = usePersistenceStore(s => s.isExporting)
  const isImporting = usePersistenceStore(s => s.isImporting)
  const exportError = usePersistenceStore(s => s.exportError)
  const importError = usePersistenceStore(s => s.importError)
  const exportProject = usePersistenceStore(s => s.exportProject)
  const importProject = usePersistenceStore(s => s.importProject)

  const getStatusInfo = () => {
    if (exportError || importError) {
      return {
        text: exportError || importError || 'Export/Import failed',
        icon: <Cross2Icon />,
        color: 'red' as const
      }
    }

    if (isExporting) {
      return {
        text: 'Exporting...',
        icon: <UpdateIcon className="animate-spin" />,
        color: 'blue' as const
      }
    }

    if (isImporting) {
      return {
        text: 'Importing...',
        icon: <UpdateIcon className="animate-spin" />,
        color: 'blue' as const
      }
    }

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
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <IconButton variant="surface" color={statusInfo.color}>
            <Tooltip content={statusInfo.text}>
              <Box p="1">{statusInfo.icon}</Box>
            </Tooltip>
          </IconButton>
        </DropdownMenu.Trigger>

        <DropdownMenu.Content>
          <DropdownMenu.Item onClick={exportProject} disabled={isExporting || isImporting}>
            <DownloadIcon />
            Save to File
          </DropdownMenu.Item>

          <DropdownMenu.Item onClick={importProject} disabled={isExporting || isImporting}>
            <UploadIcon />
            Load from File
          </DropdownMenu.Item>

          <DropdownMenu.Separator />

          <DropdownMenu.Item disabled>{statusInfo.text}</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </Box>
  )
}
