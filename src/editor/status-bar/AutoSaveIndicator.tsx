import { CheckIcon, Cross2Icon, DownloadIcon, UpdateIcon, UploadIcon } from '@radix-ui/react-icons'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { usePersistenceStore } from '@/building/store/persistenceStore'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { ConstructionModel } from '@/construction/model'
import { clearSelection } from '@/editor/hooks/useSelectionStore'
import { pushTool } from '@/editor/tools/system'
import { cn } from '@/lib/utils'
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
      const { getConstructionModel } = await import('@/construction/store')
      let model: ConstructionModel
      try {
        model = getConstructionModel()
      } catch {
        setExportError(t($ => $.autoSave.errors.failedGenerateModel))
        return
      }
      await exportConstructionGeometryToIfc(model)
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
      const content = await createFileInput()
      clearSelection()
      const result = await ProjectImportExportService.importFromString(content)

      if (!result.success) {
        setImportError(result.error)
      } else {
        pushTool('basic.fit-to-view')
      }
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
        text: exportError ?? importError ?? t($ => $.autoSave.exportFailed),
        icon: <Cross2Icon className="h-3 w-3" />,
        colorClass: 'text-red-600 dark:text-red-400'
      }
    }

    if (isExporting) {
      return {
        text: t($ => $.autoSave.exporting),
        icon: <UpdateIcon className="h-3 w-3 animate-spin" />,
        colorClass: 'text-blue-600 dark:text-blue-400'
      }
    }

    if (isImporting) {
      return {
        text: t($ => $.autoSave.importing),
        icon: <UpdateIcon className="h-3 w-3 animate-spin" />,
        colorClass: 'text-blue-600 dark:text-blue-400'
      }
    }

    // Fall back to auto-save states
    if (saveError) {
      return {
        text: t($ => $.autoSave.autoSaveFailed),
        icon: <Cross2Icon className="h-3 w-3" />,
        colorClass: 'text-red-600 dark:text-red-400'
      }
    }

    if (isSaving) {
      return {
        text: t($ => $.autoSave.autoSaving),
        icon: <UpdateIcon className="h-3 w-3 animate-spin" />,
        colorClass: 'text-blue-600 dark:text-blue-400'
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
        icon: <CheckIcon className="h-3 w-3" />,
        colorClass: 'text-green-600 dark:text-green-400'
      }
    }

    return {
      text: t($ => $.autoSave.notSaved),
      icon: <Cross2Icon className="h-3 w-3" />,
      colorClass: 'text-muted-foreground'
    }
  }

  const statusInfo = getStatusInfo()

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="secondary" className={cn('h-7 gap-1', statusInfo.colorClass)}>
              <SaveIcon />
              {statusInfo.icon}
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{statusInfo.text}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>{t($ => $.autoSave.importExportIfc)}</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem
              onClick={() => {
                void handleIfcExport()
              }}
              disabled={isExporting || isImporting}
            >
              <DownloadIcon className="mr-2 h-4 w-4" />
              {t($ => $.autoSave.exportBuildingModel)}
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => {
                void handleIfcGeometryExport()
              }}
              disabled={isExporting || isImporting}
            >
              <DownloadIcon className="mr-2 h-4 w-4" />
              {t($ => $.autoSave.exportConstructionModel)}
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => {
                void handleIfcImport()
              }}
              disabled={isExporting || isImporting}
            >
              <UploadIcon className="mr-2 h-4 w-4" />
              {t($ => $.autoSave.import)}
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem
          onClick={() => {
            void handleExport()
          }}
          disabled={isExporting || isImporting}
        >
          <DownloadIcon className="mr-2 h-4 w-4" />
          {t($ => $.autoSave.saveToFile)}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => {
            void handleImport()
          }}
          disabled={isExporting || isImporting}
        >
          <UploadIcon className="mr-2 h-4 w-4" />
          {t($ => $.autoSave.loadFromFile)}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem disabled>{statusInfo.text}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
