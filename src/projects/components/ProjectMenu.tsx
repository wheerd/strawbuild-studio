import { CheckIcon, Cross2Icon, DownloadIcon, UpdateIcon, UploadIcon } from '@radix-ui/react-icons'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useIsAuthenticated } from '@/app/user/store'
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
import { useProjectName } from '@/projects/store'
import { SaveIcon } from '@/shared/components/Icons'
import { useOfflineStatus } from '@/shared/hooks/useOfflineStatus'
import { createProject } from '@/shared/services/CloudSyncManager'
import { FileInputCancelledError, createBinaryFileInput, createFileInput } from '@/shared/utils/createFileInput'
import { downloadFile } from '@/shared/utils/downloadFile'

import { EditProjectDialog } from './EditProjectDialog'
import { ImportChoiceDialog } from './ImportChoiceDialog'
import { ProjectsModal } from './ProjectsModal'

interface ImportChoiceState {
  open: boolean
  defaultProjectName: string
  handleConfirmChoice: (choice: 'current' | 'new', projectName?: string) => Promise<void>
}

export function ProjectMenu(): React.JSX.Element {
  const { t } = useTranslation('common')
  const isAuthenticated = useIsAuthenticated()
  const projectName = useProjectName()
  const { isOnline } = useOfflineStatus()

  const isSaving = usePersistenceStore(s => s.isSaving)
  const lastSaved = usePersistenceStore(s => s.lastSaved)
  const saveError = usePersistenceStore(s => s.saveError)
  const isCloudSyncing = usePersistenceStore(s => s.isCloudSyncing)
  const lastCloudSync = usePersistenceStore(s => s.lastCloudSync)
  const cloudSyncError = usePersistenceStore(s => s.cloudSyncError)

  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showProjectsModal, setShowProjectsModal] = useState(false)
  const [importChoiceState, setImportChoiceState] = useState<ImportChoiceState | null>(null)

  const activeIsSaving = isAuthenticated ? isCloudSyncing : isSaving
  const activeLastSaved = isAuthenticated ? lastCloudSync : lastSaved
  const activeError = isAuthenticated ? cloudSyncError : saveError

  const handleExport = async () => {
    setIsExporting(true)
    setExportError(null)

    try {
      const { ProjectImportExportService } = await import('@/shared/services/ProjectImportExportService')

      const result = ProjectImportExportService.exportToString()
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
      const filename = `strawbaler-project-${timestamp}.json`
      downloadFile(result, filename)
    } catch (error) {
      console.error('Export failed', error)
      setExportError(t($ => $.autoSave.errors.failedExport))
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

  const performJsonImport = async (content: string, choice: 'current' | 'new', projectName?: string) => {
    clearSelection()

    const { ProjectImportExportService } = await import('@/shared/services/ProjectImportExportService')
    ProjectImportExportService.importFromString(content)

    if (choice === 'new') {
      await createProject({
        name: projectName ?? t($ => $.projectMenu.untitled),
        mode: 'copy'
      })
      toast.success(t($ => $.projectMenu.createSuccess))
    }

    pushTool('basic.fit-to-view')
  }

  const performIfcImport = async (content: ArrayBuffer, choice: 'current' | 'new', projectName?: string) => {
    clearSelection()

    const { importIfcIntoModel } = await import('@/importers/ifc/importService')
    const result = await importIfcIntoModel(content)
    if (!result.success) {
      throw new Error(result.error ?? t($ => $.autoSave.errors.failedIFCImport))
    }

    if (choice === 'new') {
      await createProject({
        name: projectName ?? t($ => $.projectMenu.untitled),
        mode: 'copy'
      })
      toast.success(t($ => $.projectMenu.createSuccess))
    }

    pushTool('basic.fit-to-view')
  }

  const handleImport = async () => {
    setIsImporting(true)
    setImportError(null)

    try {
      const fileResult = await createFileInput()

      if (isAuthenticated) {
        setImportChoiceState({
          open: true,
          defaultProjectName: fileResult.filename,
          handleConfirmChoice: async (choice, newProjectName) => {
            setImportChoiceState(null)
            try {
              await performJsonImport(fileResult.content, choice, newProjectName)
            } catch (error) {
              console.error('Error while importing', error)
              toast.error(t($ => $.autoSave.errors.failedImport))
            } finally {
              setIsImporting(false)
            }
          }
        })
      } else {
        await performJsonImport(fileResult.content, 'current')
        setIsImporting(false)
      }
    } catch (error) {
      if (!(error instanceof FileInputCancelledError)) {
        console.error('Error while importing', error)
        setImportError(t($ => $.autoSave.errors.failedImport))
        console.error(error)
      }
      setIsImporting(false)
    }
  }

  const handleIfcImport = async () => {
    setIsImporting(true)
    setImportError(null)

    try {
      await createBinaryFileInput(async (content: ArrayBuffer, file: File) => {
        const filename = file.name.replace(/\.[^.]+$/, '')

        if (isAuthenticated) {
          setImportChoiceState({
            open: true,
            defaultProjectName: filename,
            handleConfirmChoice: async (choice, newProjectName) => {
              setImportChoiceState(null)
              try {
                await performIfcImport(content, choice, newProjectName)
              } catch (error) {
                console.error('Error while importing', error)
                toast.error(t($ => $.autoSave.errors.failedIFCImport))
              } finally {
                setIsImporting(false)
              }
            }
          })
        } else {
          try {
            await performIfcImport(content, 'current')
          } catch (error) {
            console.error('Error while importing', error)
            toast.error(t($ => $.autoSave.errors.failedIFCImport))
          } finally {
            setIsImporting(false)
          }
        }
      }, '.ifc')
    } catch (error) {
      if (!(error instanceof FileInputCancelledError)) {
        console.error('Error while importing', error)
        setImportError(t($ => $.autoSave.errors.failedIFCImport))
      }
      setIsImporting(false)
    }
  }

  const getStatusInfo = () => {
    if (exportError || importError) {
      return {
        text: exportError ?? importError ?? t($ => $.autoSave.exportFailed),
        icon: <Cross2Icon className="h-3 w-3" />,
        colorClass: 'text-red-600 dark:text-red-400'
      }
    }

    if (isExporting || isImporting) {
      return {
        text: isExporting ? t($ => $.autoSave.exporting) : t($ => $.autoSave.importing),
        icon: <UpdateIcon className="h-3 w-3 animate-spin" />,
        colorClass: 'text-blue-600 dark:text-blue-400'
      }
    }

    if (activeError) {
      return {
        text: isAuthenticated ? t($ => $.projectMenu.syncFailed) : t($ => $.projectMenu.saveFailed),
        icon: <Cross2Icon className="h-3 w-3" />,
        colorClass: 'text-red-600 dark:text-red-400'
      }
    }

    if (activeIsSaving) {
      return {
        text: isAuthenticated ? t($ => $.projectMenu.syncing) : t($ => $.projectMenu.saving),
        icon: <UpdateIcon className="h-3 w-3 animate-spin" />,
        colorClass: 'text-blue-600 dark:text-blue-400'
      }
    }

    if (activeLastSaved) {
      const now = new Date()
      const diffMs = now.getTime() - activeLastSaved.getTime()
      const diffMinutes = Math.floor(diffMs / 60000)

      let timeText: string
      if (diffMinutes < 1) {
        timeText = t($ => $.autoSave.justNow)
      } else if (diffMinutes < 60) {
        timeText = t($ => $.autoSave.minutesAgo, { minutes: diffMinutes })
      } else {
        const diffHours = Math.floor(diffMinutes / 60)
        timeText = t($ => $.autoSave.hoursAgo, { hours: diffHours })
      }

      return {
        text: isAuthenticated
          ? `${t($ => $.projectMenu.synced)} ${timeText}`
          : `${t($ => $.projectMenu.saved)} ${timeText}`,
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

  const openProjectsModal = () => {
    setShowProjectsModal(true)
  }

  return (
    <>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className={cn('h-auto gap-2 px-2 py-1', statusInfo.colorClass)}>
                <span className="text-foreground text-sm font-medium">{projectName}</span>
                <div className="flex items-center gap-0.5">
                  <SaveIcon className="h-3.5 w-3.5" />
                  {statusInfo.icon}
                </div>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>{statusInfo.text}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start" sideOffset={4}>
          <DropdownMenuItem
            onClick={() => {
              setShowEditDialog(true)
            }}
            className="cursor-pointer"
          >
            {t($ => $.projectMenu.editProject)}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

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

          {isAuthenticated && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={openProjectsModal} disabled={!isOnline} className="cursor-pointer">
                {t($ => $.projectMenu.manageProjects)}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <EditProjectDialog open={showEditDialog} onOpenChange={setShowEditDialog} />

      {isAuthenticated && <ProjectsModal open={showProjectsModal} onOpenChange={setShowProjectsModal} />}

      {importChoiceState && (
        <ImportChoiceDialog
          open={importChoiceState.open}
          onOpenChange={open => {
            if (!open) {
              setImportChoiceState(null)
              setIsImporting(false)
            }
          }}
          defaultProjectName={importChoiceState.defaultProjectName}
          onChoice={(choice, projectName) => void importChoiceState.handleConfirmChoice(choice, projectName)}
        />
      )}
    </>
  )
}
