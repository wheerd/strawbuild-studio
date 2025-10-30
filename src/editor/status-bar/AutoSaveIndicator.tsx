import { CheckIcon, Cross2Icon, DownloadIcon, UpdateIcon, UploadIcon } from '@radix-ui/react-icons'
import { Button, DropdownMenu, Flex, Tooltip } from '@radix-ui/themes'
import React, { useState } from 'react'

import { usePersistenceStore } from '@/building/store/persistenceStore'
import { clearSelection } from '@/editor/hooks/useSelectionStore'
import { SaveIcon } from '@/shared/components/Icons'
import { ProjectImportExportService } from '@/shared/services/ProjectImportExportService'
import { createBinaryFileInput, createFileInput } from '@/shared/utils/createFileInput'
import { downloadFile } from '@/shared/utils/downloadFile'

export function AutoSaveIndicator(): React.JSX.Element {
  // Auto-save state from persistence store
  const isSaving = usePersistenceStore(s => s.isSaving)
  const lastSaved = usePersistenceStore(s => s.lastSaved)
  const saveError = usePersistenceStore(s => s.saveError)

  // Local state for export/import operations
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  const handleExport = async () => {
    setIsExporting(true)
    setExportError(null)

    try {
      const result = await ProjectImportExportService.exportToString()
      if (!result.success) {
        setExportError(result.error)
      } else {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
        const filename = `strawbaler-project-${timestamp}.json`
        downloadFile(result.content, filename)
      }
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Failed to export project')
    } finally {
      setIsExporting(false)
    }
  }

  const handleIfcExport = async () => {
    setIsExporting(true)
    setExportError(null)

    try {
      const { exportCurrentModelToIfc } = await import('@/exporters/ifc')
      await exportCurrentModelToIfc()
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Failed to export IFC')
    } finally {
      setIsExporting(false)
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

  const handleIfcImport = async () => {
    setIsImporting(true)
    setImportError(null)

    try {
      await createBinaryFileInput(async (content: ArrayBuffer) => {
        clearSelection()
        const { importIfcIntoModel } = await import('@/importers/ifc/importService')
        const result = await importIfcIntoModel(content)
        if (!result.success) {
          throw new Error(result.error ?? 'Failed to import IFC file')
        }
      }, '.ifc')
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Failed to import IFC file')
    } finally {
      setIsImporting(false)
    }
  }

  const getStatusInfo = () => {
    // Prioritize export/import errors and states
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
        <DropdownMenu.Item onClick={handleExport} disabled={isExporting || isImporting}>
          <DownloadIcon />
          Save to File
        </DropdownMenu.Item>

        <DropdownMenu.Item onClick={handleIfcExport} disabled={isExporting || isImporting}>
          <DownloadIcon />
          Export IFC
        </DropdownMenu.Item>

        <DropdownMenu.Item onClick={handleImport} disabled={isExporting || isImporting}>
          <UploadIcon />
          Load from File
        </DropdownMenu.Item>

        <DropdownMenu.Item onClick={handleIfcImport} disabled={isExporting || isImporting}>
          <UploadIcon />
          Import IFC
        </DropdownMenu.Item>

        <DropdownMenu.Separator />

        <DropdownMenu.Item disabled>{statusInfo.text}</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
}
