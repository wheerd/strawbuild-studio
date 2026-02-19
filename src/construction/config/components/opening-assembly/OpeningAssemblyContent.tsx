import * as Label from '@radix-ui/react-label'
import { Copy, Plus, Trash, Undo2 } from 'lucide-react'
import React, { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { OpeningAssemblyId } from '@/building/model/ids'
import { AlertDialog } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Callout, CalloutText } from '@/components/ui/callout'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { OpeningAssemblySelect } from '@/construction/config/components/OpeningAssemblySelect'
import { type EntityId, useEntityLabel } from '@/construction/config/components/useEntityLabel'
import {
  useConfigActions,
  useDefaultOpeningAssemblyId,
  useOpeningAssemblies,
  useWallAssemblies
} from '@/construction/config/store'
import { type OpeningAssemblyUsage, getOpeningAssemblyUsage } from '@/construction/config/usage'
import type { MaterialId } from '@/construction/materials/material'
import type { OpeningAssemblyType, OpeningConfig } from '@/construction/openings/types'

import { ConfigForm } from './ConfigForm'

export interface OpeningAssemblyContentProps {
  initialSelectionId?: string
}

export function OpeningAssemblyContent({ initialSelectionId }: OpeningAssemblyContentProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const openingAssemblies = useOpeningAssemblies()
  const wallAssemblies = useWallAssemblies()
  const {
    addOpeningAssembly,
    removeOpeningAssembly,
    duplicateOpeningAssembly,
    setDefaultOpeningAssembly,
    resetOpeningAssembliesToDefaults
  } = useConfigActions()

  const defaultId = useDefaultOpeningAssemblyId()

  const allAssemblies = useMemo(() => Object.values(openingAssemblies), [openingAssemblies])
  const wallAssemblyArray = useMemo(() => Object.values(wallAssemblies), [wallAssemblies])

  const [selectedAssemblyId, setSelectedAssemblyId] = useState<string | null>(() => {
    if (initialSelectionId && allAssemblies.some(m => m.id === initialSelectionId)) {
      return initialSelectionId
    }
    return allAssemblies.length > 0 ? allAssemblies[0].id : null
  })

  const selectedAssembly = allAssemblies.find(m => m.id === selectedAssemblyId) ?? null

  const usage = useMemo(
    () =>
      selectedAssembly
        ? getOpeningAssemblyUsage(selectedAssembly.id)
        : { isUsed: false, isDefault: false, wallAssemblyIds: [], openingAssemblyIds: [], storeyIds: [] },
    [selectedAssembly, wallAssemblyArray, defaultId]
  )

  const handleAddNew = useCallback(
    (type: OpeningAssemblyType) => {
      const defaultMaterial = '' as MaterialId

      let config: OpeningConfig
      if (type === 'simple') {
        config = {
          type: 'simple',
          padding: 15,
          headerThickness: 60,
          headerMaterial: defaultMaterial,
          sillThickness: 60,
          sillMaterial: defaultMaterial
        }
      } else if (type === 'post') {
        config = {
          type: 'post',
          padding: 15,
          headerThickness: 60,
          headerMaterial: defaultMaterial,
          sillThickness: 60,
          sillMaterial: defaultMaterial,
          posts: {
            type: 'double',
            infillMaterial: defaultMaterial,
            material: defaultMaterial,
            thickness: 140,
            width: 100
          },
          replacePosts: true,
          postsSupportHeader: false
        }
      } else if (type === 'planked') {
        config = {
          type: 'planked',
          padding: 15,
          headerThickness: 60,
          headerMaterial: defaultMaterial,
          sillThickness: 60,
          sillMaterial: defaultMaterial,
          plankMaterial: defaultMaterial,
          plankThickness: 16
        }
      } else if (type === 'threshold') {
        config = {
          type: 'threshold',
          padding: 15,
          defaultId: '' as OpeningAssemblyId,
          thresholds: []
        }
      } else {
        config = {
          type: 'empty',
          padding: 15
        }
      }

      const newAssembly = addOpeningAssembly(`New opening assembly`, config)
      setSelectedAssemblyId(newAssembly.id)
    },
    [addOpeningAssembly]
  )

  const handleDuplicate = useCallback(() => {
    if (!selectedAssembly) return

    const newName = t($ => $.openings.copyNameTemplate, {
      defaultValue: `{{name}} (Copy)`,
      name: selectedAssembly.name
    })
    const duplicated = duplicateOpeningAssembly(selectedAssembly.id, newName)
    setSelectedAssemblyId(duplicated.id)
  }, [selectedAssembly, duplicateOpeningAssembly])

  const handleDelete = useCallback(() => {
    if (!selectedAssembly || usage.isUsed) return

    const currentIndex = allAssemblies.findIndex(m => m.id === selectedAssemblyId)
    removeOpeningAssembly(selectedAssembly.id)

    if (allAssemblies.length > 1) {
      const nextAssembly = allAssemblies[currentIndex + 1] ?? allAssemblies[currentIndex - 1]
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      setSelectedAssemblyId(nextAssembly?.id ?? null)
    } else {
      setSelectedAssemblyId(null)
    }
  }, [selectedAssembly, selectedAssemblyId, allAssemblies, removeOpeningAssembly, usage.isUsed])

  const handleReset = useCallback(() => {
    resetOpeningAssembliesToDefaults()
    const stillExists = allAssemblies.some(a => a.id === selectedAssemblyId)
    if (!stillExists && allAssemblies.length > 0) {
      setSelectedAssemblyId(allAssemblies[0].id)
    }
  }, [resetOpeningAssembliesToDefaults, selectedAssemblyId, allAssemblies])

  if (!selectedAssembly) {
    return (
      <div className="flex w-full flex-col gap-4">
        <Callout className="text-muted-foreground">
          <CalloutText>{t($ => $.openings.emptyList)}</CalloutText>
        </Callout>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-end gap-2">
          <div className="flex grow flex-col gap-1">
            <OpeningAssemblySelect
              value={(selectedAssemblyId as OpeningAssemblyId | null) ?? undefined}
              onValueChange={value => {
                setSelectedAssemblyId(value ?? null)
              }}
              showDefaultIndicator
            />
          </div>

          <DropdownMenu>
            <DropdownMenu.Trigger asChild>
              <Button size="icon" title={t($ => $.common.addNew)}>
                <Plus />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item
                onClick={() => {
                  handleAddNew('simple')
                }}
              >
                {t($ => $.openings.types.simple)}
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onClick={() => {
                  handleAddNew('post')
                }}
              >
                {t($ => $.openings.types.post)}
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onClick={() => {
                  handleAddNew('planked')
                }}
              >
                {t($ => $.openings.types.planked)}
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onClick={() => {
                  handleAddNew('empty')
                }}
              >
                {t($ => $.openings.types.empty)}
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onClick={() => {
                  handleAddNew('threshold')
                }}
              >
                {t($ => $.openings.types.threshold)}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu>

          <Button size="icon" onClick={handleDuplicate} variant="soft" title={t($ => $.common.duplicate)}>
            <Copy />
          </Button>

          <AlertDialog.Root>
            <AlertDialog.Trigger asChild>
              <Button
                size="icon"
                variant="destructive"
                disabled={usage.isUsed}
                title={usage.isUsed ? t($ => $.common.inUseCannotDelete) : t($ => $.common.delete)}
              >
                <Trash />
              </Button>
            </AlertDialog.Trigger>
            <AlertDialog.Content>
              <AlertDialog.Title>{t($ => $.openings.deleteTitle)}</AlertDialog.Title>
              <AlertDialog.Description>
                {t($ => $.openings.deleteConfirm, { name: selectedAssembly.name })}
              </AlertDialog.Description>
              <div className="mt-4 flex justify-end gap-3">
                <AlertDialog.Cancel asChild>
                  <Button variant="soft" className="">
                    {t($ => $.common.cancel)}
                  </Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action asChild>
                  <Button variant="destructive" onClick={handleDelete}>
                    {t($ => $.common.delete)}
                  </Button>
                </AlertDialog.Action>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Root>

          <AlertDialog.Root>
            <AlertDialog.Trigger asChild>
              <Button
                size="icon"
                className="text-destructive"
                variant="outline"
                title={t($ => $.common.resetToDefaults)}
              >
                <Undo2 />
              </Button>
            </AlertDialog.Trigger>
            <AlertDialog.Content>
              <AlertDialog.Title>{t($ => $.openings.resetTitle)}</AlertDialog.Title>
              <AlertDialog.Description>{t($ => $.openings.resetConfirm)}</AlertDialog.Description>
              <div className="mt-4 flex justify-end gap-3">
                <AlertDialog.Cancel asChild>
                  <Button variant="soft" className="">
                    {t($ => $.common.cancel)}
                  </Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action asChild>
                  <Button variant="destructive" onClick={handleReset}>
                    {t($ => $.common.reset)}
                  </Button>
                </AlertDialog.Action>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Root>
        </div>
      </div>
      <ConfigForm assembly={selectedAssembly} />
      <Separator />
      <div className="grid grid-cols-[auto_1fr] items-center gap-2 gap-x-3">
        <Label.Root>
          <span className="text-base font-medium">{t($ => $.openings.defaultOpeningAssembly)}</span>
        </Label.Root>
        <OpeningAssemblySelect
          value={defaultId}
          onValueChange={assemblyId => {
            if (assemblyId) setDefaultOpeningAssembly(assemblyId)
          }}
          placeholder={t($ => $.common.placeholders.selectDefault)}
        />
      </div>
      {usage.isUsed && <UsageDisplay usage={usage} />}
    </div>
  )
}

function UsageBadge({ id }: { id: EntityId }) {
  const label = useEntityLabel(id)
  return (
    <Badge key={id} variant="soft">
      {label}
    </Badge>
  )
}

function UsageDisplay({ usage }: { usage: OpeningAssemblyUsage }): React.JSX.Element {
  const { t } = useTranslation('config')

  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-2 gap-x-3">
      <Label.Root>
        <span className="text-base font-medium">{t($ => $.usage.usedBy)}</span>
      </Label.Root>
      <div className="flex flex-wrap gap-1">
        {usage.isDefault && (
          <Badge variant="soft" color="blue">
            {t($ => $.usage.globalDefault_opening)}
          </Badge>
        )}
        {usage.openingAssemblyIds.map(id => (
          <UsageBadge key={id} id={id} />
        ))}
        {usage.wallAssemblyIds.map(id => (
          <UsageBadge key={id} id={id} />
        ))}
        {usage.storeyIds.map(id => (
          <UsageBadge key={id} id={id} />
        ))}
      </div>
    </div>
  )
}
