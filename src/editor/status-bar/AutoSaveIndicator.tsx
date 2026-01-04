import { CheckIcon, Cross2Icon, DownloadIcon, UpdateIcon, UploadIcon } from '@radix-ui/react-icons'
import { Button, DropdownMenu, Flex, Tooltip } from '@radix-ui/themes'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { usePersistenceStore } from '@/building/store/persistenceStore'
import { clearSelection } from '@/editor/hooks/useSelectionStore'
import { pushTool } from '@/editor/tools/system'
import { SaveIcon } from '@/shared/components/Icons'
import { ProjectImportExportService } from '@/shared/services/ProjectImportExportService'
import { FileInputCancelledError, createBinaryFileInput, createFileInput } from '@/shared/utils/createFileInput'
import { downloadFile } from '@/shared/utils/downloadFile'

export function AutoSaveIndicator(): React.JSX.Element {
  const { t } = useTranslation('common')

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
      setExportError(error instanceof Error ? error.message : t($ => $.autoSave.errors.failedExport))
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
      setExportError(error instanceof Error ? error.message : t($ => $.autoSave.errors.failedIFCExport))
    } finally {
      setIsExporting(false)
    }
  }

  const handleIfcGeometryExport = async () => {
    setIsExporting(true)
    setExportError(null)

    try {
      const { exportConstructionGeometryToIfc } = await import('@/exporters/ifc')
      const { constructModel } = await import('@/construction/storeys/storey')
      const model = constructModel()
      if (!model) {
        setExportError(t($ => $.autoSave.errors.failedGenerateModel))
      } else {
        await exportConstructionGeometryToIfc(model)
      }
    } catch (error) {
      setExportError(error instanceof Error ? error.message : t($ => $.autoSave.errors.failedIFCExport))
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

        if (!result.success) {
          setImportError(result.error)
        } else {
          pushTool('basic.fit-to-view')
        }
      })
    } catch (error) {
      if (!(error instanceof FileInputCancelledError)) {
        setImportError(error instanceof Error ? error.message : t($ => $.autoSave.errors.failedImport))
        console.error(error)
      }
    } finally {
      setIsImporting(false)
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
          throw new Error(result.error ?? t($ => $.autoSave.errors.failedIFCImport))
        } else {
          pushTool('basic.fit-to-view')
        }
      }, '.ifc')
    } catch (error) {
      if (!(error instanceof FileInputCancelledError)) {
        setImportError(error instanceof Error ? error.message : t($ => $.autoSave.errors.failedIFCImport))
      }
    } finally {
      setIsImporting(false)
    }
  }

  const getStatusInfo = () => {
    // Prioritize export/import errors and states
    if (exportError || importError) {
      return {
        text: exportError || importError || t($ => $.autoSave.exportFailed),
        icon: <Cross2Icon />,
        color: 'red' as const
      }
    }

    if (isExporting) {
      return {
        text: t($ => $.autoSave.exporting),
        icon: <UpdateIcon className="animate-spin" />,
        color: 'blue' as const
      }
    }

    if (isImporting) {
      return {
        text: t($ => $.autoSave.importing),
        icon: <UpdateIcon className="animate-spin" />,
        color: 'blue' as const
      }
    }

    // Fall back to auto-save states
    if (saveError) {
      return {
        text: t($ => $.autoSave.autoSaveFailed),
        icon: <Cross2Icon />,
        color: 'red' as const
      }
    }

    if (isSaving) {
      return {
        text: t($ => $.autoSave.autoSaving),
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
        timeText = t($ => $.autoSave.justNow)
      } else if (diffMinutes < 60) {
        timeText = t($ => $.autoSave.minutesAgo, {
          minutes: diffMinutes
        })
      } else {
        const diffHours = Math.floor(diffMinutes / 60)
        timeText = t($ => $.autoSave.hoursAgo, {
          hours: diffHours
        })
      }

      return {
        text: t($ => $.autoSave.autoSaved, {
          time: timeText
        }),
        icon: <CheckIcon />,
        color: 'green' as const
      }
    }

    return {
      text: t($ => $.autoSave.notSaved),
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
        <DropdownMenu.Sub>
          <DropdownMenu.SubTrigger>{t($ => $.autoSave.importExportIfc)}</DropdownMenu.SubTrigger>
          <DropdownMenu.SubContent>
            <DropdownMenu.Item onClick={handleIfcExport} disabled={isExporting || isImporting}>
              <DownloadIcon />
              {t($ => $.autoSave.exportBuildingModel)}
            </DropdownMenu.Item>

            <DropdownMenu.Item onClick={handleIfcGeometryExport} disabled={isExporting || isImporting}>
              <DownloadIcon />
              {t($ => $.autoSave.exportConstructionModel)}
            </DropdownMenu.Item>

            <DropdownMenu.Item onClick={handleIfcImport} disabled={isExporting || isImporting}>
              <UploadIcon />
              {t($ => $.autoSave.import)}
            </DropdownMenu.Item>
          </DropdownMenu.SubContent>
        </DropdownMenu.Sub>
        <DropdownMenu.Item onClick={handleExport} disabled={isExporting || isImporting}>
          <DownloadIcon />
          {t($ => $.autoSave.saveToFile)}
        </DropdownMenu.Item>

        <DropdownMenu.Item onClick={handleImport} disabled={isExporting || isImporting}>
          <UploadIcon />
          {t($ => $.autoSave.loadFromFile)}
        </DropdownMenu.Item>

        <DropdownMenu.Separator />

        <DropdownMenu.Item disabled>{statusInfo.text}</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
}
