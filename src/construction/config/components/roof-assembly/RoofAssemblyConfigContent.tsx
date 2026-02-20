import * as Label from '@radix-ui/react-label'
import { Component, Copy, Plus, Square, Trash, Undo2 } from 'lucide-react'
import React, { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { RoofAssemblyId } from '@/building/model/ids'
import { useRoofs } from '@/building/store'
import { AlertDialog } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { RoofAssemblySelect } from '@/construction/config/components/RoofAssemblySelect'
import { type EntityId, useEntityLabel } from '@/construction/config/components/useEntityLabel'
import { useConfigActions, useDefaultRoofAssemblyId, useRoofAssemblies } from '@/construction/config/store'
import { type RoofAssemblyUsage, getRoofAssemblyUsage } from '@/construction/config/usage'
import type { MaterialId } from '@/construction/materials/material'
import type { RoofAssemblyType, RoofConfig } from '@/construction/roofs/types'
import { RoofMeasurementInfo } from '@/editor/components/RoofMeasurementInfo'

import { ConfigForm } from './ConfigForm'

export interface RoofAssemblyConfigContentProps {
  initialSelectionId?: string
}

export function RoofAssemblyConfigContent({ initialSelectionId }: RoofAssemblyConfigContentProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const roofAssemblies = useRoofAssemblies()
  const roofs = useRoofs()
  const {
    addRoofAssembly,
    duplicateRoofAssembly,
    removeRoofAssembly,
    setDefaultRoofAssembly,
    resetRoofAssembliesToDefaults
  } = useConfigActions()

  const defaultAssemblyId = useDefaultRoofAssemblyId()

  const [selectedAssemblyId, setSelectedAssemblyId] = useState<string | null>(() => {
    if (initialSelectionId && roofAssemblies.some(a => a.id === initialSelectionId)) {
      return initialSelectionId
    }
    return roofAssemblies.length > 0 ? roofAssemblies[0].id : null
  })

  const selectedAssembly = roofAssemblies.find(a => a.id === selectedAssemblyId) ?? null

  const usage = useMemo(
    () =>
      selectedAssembly
        ? getRoofAssemblyUsage(selectedAssembly.id, Object.values(roofs), defaultAssemblyId)
        : { isUsed: false, isDefault: false, storeyIds: [] },
    [selectedAssembly, roofs, defaultAssemblyId]
  )

  const handleAddNew = useCallback(
    (type: RoofAssemblyType) => {
      const defaultMaterial = '' as MaterialId

      let name: string
      let config: RoofConfig
      if (type === 'monolithic') {
        name = t($ => $.roofs.newName.monolithic)
        config = {
          type: 'monolithic',
          thickness: 180,
          material: defaultMaterial,
          infillMaterial: defaultMaterial,
          insideLayerSetId: undefined,
          topLayerSetId: undefined,
          overhangLayerSetId: undefined
        }
      } else {
        name = t($ => $.roofs.newName.purlin)
        config = {
          type: 'purlin',
          thickness: 360,
          purlinMaterial: defaultMaterial,
          purlinHeight: 200,
          purlinWidth: 120,
          purlinSpacing: 6000,
          purlinInset: 20,
          infillMaterial: defaultMaterial,
          rafterMaterial: defaultMaterial,
          rafterWidth: 60,
          rafterSpacingMin: 70,
          rafterSpacing: 500,
          ceilingSheathingMaterial: defaultMaterial,
          ceilingSheathingThickness: 40,
          deckingMaterial: defaultMaterial,
          deckingThickness: 22,
          insideLayerSetId: undefined,
          topLayerSetId: undefined,
          overhangLayerSetId: undefined
        }
      }

      const newAssembly = addRoofAssembly(name, config)
      setSelectedAssemblyId(newAssembly.id)
    },
    [addRoofAssembly]
  )

  const handleDuplicate = useCallback(() => {
    if (!selectedAssembly) return

    const newName = t($ => $.roofs.copyNameTemplate, {
      defaultValue: `{{name}} (Copy)`,
      name: selectedAssembly.name
    })
    const duplicated = duplicateRoofAssembly(selectedAssembly.id, newName)
    setSelectedAssemblyId(duplicated.id)
  }, [selectedAssembly, duplicateRoofAssembly])

  const handleDelete = useCallback(() => {
    if (!selectedAssembly || usage.isUsed) return

    const currentIndex = roofAssemblies.findIndex(a => a.id === selectedAssemblyId)
    removeRoofAssembly(selectedAssembly.id)

    if (roofAssemblies.length > 1) {
      const nextAssembly = roofAssemblies[currentIndex + 1] ?? roofAssemblies[currentIndex - 1]
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      setSelectedAssemblyId(nextAssembly?.id ?? null)
    } else {
      setSelectedAssemblyId(null)
    }
  }, [selectedAssembly, selectedAssemblyId, roofAssemblies, removeRoofAssembly, usage.isUsed])

  const handleReset = useCallback(() => {
    resetRoofAssembliesToDefaults()
    const stillExists = roofAssemblies.some(a => a.id === selectedAssemblyId)
    if (!stillExists && roofAssemblies.length > 0) {
      setSelectedAssemblyId(roofAssemblies[0].id)
    }
  }, [resetRoofAssembliesToDefaults, selectedAssemblyId, roofAssemblies])

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-end gap-2">
            <div className="flex grow flex-col gap-1">
              <RoofAssemblySelect
                value={selectedAssemblyId as RoofAssemblyId | undefined}
                onValueChange={setSelectedAssemblyId}
                showDefaultIndicator
                defaultAssemblyId={defaultAssemblyId}
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
                  onSelect={() => {
                    handleAddNew('monolithic')
                  }}
                >
                  <div className="flex items-center gap-1">
                    <Square />
                    {t($ => $.roofs.types.monolithic)}
                  </div>
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={() => {
                    handleAddNew('purlin')
                  }}
                >
                  <div className="flex items-center gap-1">
                    <Component />
                    {t($ => $.roofs.types.purlin)}
                  </div>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu>

            <Button
              size="icon"
              onClick={handleDuplicate}
              disabled={!selectedAssembly}
              title={t($ => $.common.duplicate)}
              variant="soft"
            >
              <Copy />
            </Button>

            <AlertDialog.Root>
              <AlertDialog.Trigger asChild>
                <Button
                  size="icon"
                  disabled={!selectedAssembly || usage.isUsed}
                  variant="destructive"
                  title={usage.isUsed ? t($ => $.common.inUseCannotDelete) : t($ => $.common.delete)}
                >
                  <Trash />
                </Button>
              </AlertDialog.Trigger>
              <AlertDialog.Content>
                <AlertDialog.Title>{t($ => $.roofs.deleteTitle)}</AlertDialog.Title>
                <AlertDialog.Description>
                  {t($ => $.roofs.deleteConfirm, { name: selectedAssembly?.name })}
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
                <AlertDialog.Title>{t($ => $.roofs.resetTitle)}</AlertDialog.Title>
                <AlertDialog.Description>{t($ => $.roofs.resetConfirm)}</AlertDialog.Description>
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

          <div className="grid grid-cols-[auto_1fr] items-center gap-2">
            <Label.Root>
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium">{t($ => $.roofs.defaultRoofAssembly)}</span>
                <RoofMeasurementInfo highlightedAssembly="roofAssembly" />
              </div>
            </Label.Root>
            <RoofAssemblySelect
              value={defaultAssemblyId}
              onValueChange={value => {
                setDefaultRoofAssembly(value)
              }}
              placeholder={t($ => $.common.placeholders.selectDefault)}
            />
          </div>
        </div>
      </div>
      {selectedAssembly && <ConfigForm assembly={selectedAssembly} />}
      {!selectedAssembly && roofAssemblies.length === 0 && (
        <div className="flex items-center justify-center p-5">
          <span className="">{t($ => $.roofs.emptyList)}</span>
        </div>
      )}
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

function UsageDisplay({ usage }: { usage: RoofAssemblyUsage }): React.JSX.Element {
  const { t } = useTranslation('config')

  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-2 gap-x-3">
      <Label.Root>
        <span className="text-base font-medium">{t($ => $.usage.usedBy)}</span>
      </Label.Root>
      <div className="flex flex-wrap gap-1">
        {usage.isDefault && (
          <Badge variant="soft" color="blue">
            {t($ => $.usage.globalDefault_roof)}
          </Badge>
        )}
        {usage.storeyIds.map(id => (
          <UsageBadge key={id} id={id} />
        ))}
      </div>
    </div>
  )
}
