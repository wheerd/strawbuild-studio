import { CheckIcon, Cross2Icon, DownloadIcon, FileIcon, UpdateIcon, UploadIcon } from '@radix-ui/react-icons'
import { Button, DropdownMenu, Flex, Tooltip } from '@radix-ui/themes'
import React, { useState } from 'react'

import { usePersistenceStore } from '@/building/store/persistenceStore'
import { clearSelection } from '@/editor/hooks/useSelectionStore'
import { SaveIcon } from '@/shared/components/Icons'
import { ProjectImportExportService } from '@/shared/services/ProjectImportExportService'
import { extractFromDxf } from '@/shared/services/floorplan_extract'
import { createFileInput } from '@/shared/utils/createFileInput'
import { downloadFile } from '@/shared/utils/downloadFile'

export function AutoSaveIndicator(): React.JSX.Element {
  // Auto-save state from persistence store
  const isSaving = usePersistenceStore(s => s.isSaving)
  const lastSaved = usePersistenceStore(s => s.lastSaved)
  const saveError = usePersistenceStore(s => s.saveError)

  // Local state for export/import operations
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isProcessingDxf, setIsProcessingDxf] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [dxfError, setDxfError] = useState<string | null>(null)

  const handleExport = async () => {
    setIsExporting(true)
    setExportError(null)

    const result = await ProjectImportExportService.exportToString()

    setIsExporting(false)
    if (!result.success) {
      setExportError(result.error)
    } else {
      // Generate filename in UI component
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
      const filename = `strawbaler-project-${timestamp}.json`
      downloadFile(result.content, filename)
    }
  }

  const handleImport = async () => {
    setIsImporting(true)
    setImportError(null)

    try {
      await createFileInput(async (content: string) => {
        clearSelection()
        const result = await ProjectImportExportService.importFromString(content)

        setIsImporting(false)
        if (!result.success) {
          setImportError(result.error)
        }
      })
    } catch (error) {
      setIsImporting(false)
      setImportError(error instanceof Error ? error.message : 'Failed to import file')
    }
  }

  const handleDxfImport = async () => {
    setIsProcessingDxf(true)
    setDxfError(null)

    try {
      await createFileInput(
        async (content: string) => {
          try {
            const result = await extractFromDxf(content, {})
            console.info('DXF extraction result', result)
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to process DXF file'
            console.error('DXF extraction error', error)
            setDxfError(message)
          } finally {
            setIsProcessingDxf(false)
          }
        },
        '.dxf,.DXF'
      )
    } catch (error) {
      setIsProcessingDxf(false)
      if (error instanceof Error && error.message === 'File selection cancelled') {
        return
      }
      const message = error instanceof Error ? error.message : 'Failed to open DXF file'
      setDxfError(message)
      console.error('DXF selection error', error)
    }
  }

  const getStatusInfo = () => {
    // Prioritize export/import errors and states
    if (exportError || importError || dxfError) {
      return {
        text: exportError || importError || dxfError || 'Export/Import failed',
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

    if (isProcessingDxf) {
      return {
        text: 'Processing DXF...',
        icon: <UpdateIcon className="animate-spin" />,
        color: 'blue' as const
      }
    }

    // Fall back to auto-save states
    if (saveError) {
      return {
        text: 'Auto-save failed',
        icon: <Cross2Icon />,
        color: 'red' as const
      }
    }

    if (isSaving) {
      return {
        text: 'Auto-saving...',
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
        text: `Auto-saved ${timeText}`,
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
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Button size="1" variant="soft" color={statusInfo.color}>
          <Tooltip content={statusInfo.text}>
            <Flex gap="1">
              <SaveIcon />
              {statusInfo.icon}
            </Flex>
          </Tooltip>
        </Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content>
        <DropdownMenu.Item onClick={handleExport} disabled={isExporting || isImporting || isProcessingDxf}>
          <DownloadIcon />
          Save to File
        </DropdownMenu.Item>

        <DropdownMenu.Item onClick={handleImport} disabled={isExporting || isImporting || isProcessingDxf}>
          <UploadIcon />
          Load from File
        </DropdownMenu.Item>

        <DropdownMenu.Item onClick={handleDxfImport} disabled={isExporting || isImporting || isProcessingDxf}>
          <FileIcon />
          Load DXF
        </DropdownMenu.Item>

        <DropdownMenu.Separator />

        <DropdownMenu.Item disabled>{statusInfo.text}</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
}
