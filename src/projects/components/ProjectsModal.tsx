import { Cross2Icon, PlusIcon, TrashIcon } from '@radix-ui/react-icons'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { getProjectId, useProjectId, useProjectList, useProjectListLoading, useProjectsActions } from '@/projects/store'
import type { ProjectListItem } from '@/projects/types'
import { timestampNow } from '@/projects/types'
import { useOfflineStatus } from '@/shared/hooks/useOfflineStatus'
import { flushSyncQueue, loadProjectFromCloud } from '@/shared/services/CloudSyncManager'
import { deleteProject } from '@/shared/services/SupabaseSyncService'

interface ProjectsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProjectsModal({ open, onOpenChange }: ProjectsModalProps): React.JSX.Element {
  const { t } = useTranslation('common')
  const projects = useProjectList()
  const isLoading = useProjectListLoading()
  const currentProjectId = useProjectId()
  const { removeProject } = useProjectsActions()
  const { isOnline } = useOfflineStatus()

  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState<ProjectListItem | null>(null)
  const [switchingToProject, setSwitchingToProject] = useState<string | null>(null)

  const handleSwitchProject = async (project: ProjectListItem) => {
    if (project.id === currentProjectId) return

    setSwitchingToProject(project.id)
    try {
      await flushSyncQueue()
      await loadProjectFromCloud(project.id)
      toast.success(t($ => $.projectMenu.switchProject))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to switch project')
    } finally {
      setSwitchingToProject(null)
    }
  }

  const handleDeleteProject = async () => {
    if (!showDeleteDialog) return

    try {
      await deleteProject(showDeleteDialog.id)
      removeProject(showDeleteDialog.id)
      toast.success(t($ => $.projectMenu.delete))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete project')
    } finally {
      setShowDeleteDialog(null)
    }
  }

  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / 60000)

    if (diffMinutes < 1) return t($ => $.autoSave.justNow)
    if (diffMinutes < 60) return t($ => $.autoSave.minutesAgo, { minutes: diffMinutes })
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return t($ => $.autoSave.hoursAgo, { hours: diffHours })
    const diffDays = Math.floor(diffHours / 24)
    return t($ => $.autoSave.daysAgo, { days: diffDays })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t($ => $.projectMenu.manageProjects)}</DialogTitle>
            <DialogDescription>{!isOnline && t($ => $.projectMenu.offlineMessage)}</DialogDescription>
          </DialogHeader>

          <div className="max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Cross2Icon className="h-6 w-6 animate-spin" />
              </div>
            ) : projects.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center">{t($ => $.projectMenu.noProjects)}</div>
            ) : (
              <div className="space-y-1">
                {projects.map(project => (
                  <div
                    key={project.id}
                    className={cn(
                      'hover:bg-accent flex items-center justify-between rounded-lg p-3',
                      project.id === currentProjectId && 'bg-accent/50'
                    )}
                  >
                    <button
                      onClick={() => {
                        if (isOnline && project.id !== currentProjectId) {
                          void handleSwitchProject(project)
                        }
                      }}
                      disabled={!isOnline || switchingToProject !== null}
                      className="flex-1 cursor-pointer text-left disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{project.name || t($ => $.projectMenu.untitled)}</span>
                        {project.id === currentProjectId && (
                          <span className="bg-primary text-primary-foreground rounded px-1.5 py-0.5 text-xs">
                            {t($ => $.projectMenu.current)}
                          </span>
                        )}
                      </div>
                      {project.description && (
                        <p className="text-muted-foreground mt-0.5 truncate text-sm">{project.description}</p>
                      )}
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {t($ => $.projectMenu.lastUpdated)}: {formatRelativeTime(project.updatedAt)}
                      </p>
                    </button>

                    {project.id !== currentProjectId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setShowDeleteDialog(project)
                        }}
                        disabled={!isOnline}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false)
              }}
            >
              {t($ => $.actions.cancel)}
            </Button>
            <Button
              onClick={() => {
                setShowNewProjectDialog(true)
              }}
              disabled={!isOnline}
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              {t($ => $.projectMenu.newProject)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NewProjectDialog
        open={showNewProjectDialog}
        onOpenChange={setShowNewProjectDialog}
        onProjectCreated={() => {
          setShowNewProjectDialog(false)
        }}
      />

      <DeleteConfirmDialog
        project={showDeleteDialog}
        open={showDeleteDialog !== null}
        onOpenChange={open => {
          if (!open) setShowDeleteDialog(null)
        }}
        onConfirm={() => {
          void handleDeleteProject()
        }}
      />
    </>
  )
}

interface NewProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProjectCreated: () => void
}

function NewProjectDialog({ open, onOpenChange, onProjectCreated }: NewProjectDialogProps): React.JSX.Element {
  const { t } = useTranslation('common')
  const { addProject, resetToNew } = useProjectsActions()
  const { isOnline } = useOfflineStatus()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [copyMode, setCopyMode] = useState<'empty' | 'copy'>('empty')
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = () => {
    if (!isOnline) return

    setIsCreating(true)
    try {
      const trimmedName = name.trim() || t($ => $.projectMenu.untitled)
      const trimmedDescription = description.trim() || undefined

      if (copyMode === 'empty') {
        resetToNew()
        const newProjectId = getProjectId()
        addProject({
          id: newProjectId,
          name: trimmedName,
          description: trimmedDescription,
          updatedAt: timestampNow()
        })
      } else {
        resetToNew()
      }

      onProjectCreated()
      setName('')
      setDescription('')
      setCopyMode('empty')
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to create project')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t($ => $.projectMenu.newProject)}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="new-name" className="text-right">
              {t($ => $.projectMenu.projectName)}
            </Label>
            <Input
              id="new-name"
              value={name}
              onChange={e => {
                setName(e.target.value)
              }}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="new-description" className="pt-2 text-right">
              {t($ => $.projectMenu.description)}
            </Label>
            <Textarea
              id="new-description"
              value={description}
              onChange={e => {
                setDescription(e.target.value)
              }}
              placeholder={t($ => $.projectMenu.descriptionPlaceholder)}
              className="col-span-3 min-h-[80px]"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Options</Label>
            <RadioGroup
              value={copyMode}
              onValueChange={value => {
                setCopyMode(value as 'empty' | 'copy')
              }}
              className="col-span-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="empty" id="empty" />
                <Label htmlFor="empty" className="cursor-pointer font-normal">
                  {t($ => $.projectMenu.startEmpty)}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="copy" id="copy" />
                <Label htmlFor="copy" className="cursor-pointer font-normal">
                  {t($ => $.projectMenu.copyCurrent)}
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {t($ => $.actions.cancel)}
          </Button>
          <Button onClick={handleCreate} disabled={isCreating || !isOnline}>
            {t($ => $.projectMenu.create)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface DeleteConfirmDialogProps {
  project: ProjectListItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

function DeleteConfirmDialog({ project, open, onOpenChange, onConfirm }: DeleteConfirmDialogProps): React.JSX.Element {
  const { t } = useTranslation('common')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{t($ => $.projectMenu.deleteConfirm)}</DialogTitle>
          <DialogDescription>
            {project?.name}: {t($ => $.projectMenu.deleteMessage)}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {t($ => $.actions.cancel)}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
          >
            {t($ => $.projectMenu.delete)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
