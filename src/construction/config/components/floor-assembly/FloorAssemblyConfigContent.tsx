import * as Label from '@radix-ui/react-label'
import { Copy, Plus, Trash, Undo2 } from 'lucide-react'
import React, { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { FloorAssemblyId } from '@/building/model/ids'
import { useStoreysOrderedByLevel } from '@/building/store'
import { AlertDialog } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { FloorAssemblySelect } from '@/construction/config/components/FloorAssemblySelect'
import { getFloorAssemblyTypeIcon } from '@/construction/config/components/Icons'
import { type EntityId, useEntityLabel } from '@/construction/config/components/useEntityLabel'
import { useConfigActions, useDefaultFloorAssemblyId, useFloorAssemblies } from '@/construction/config/store'
import { type FloorAssemblyUsage, getFloorAssemblyUsage } from '@/construction/config/usage'
import type { FloorAssemblyType, FloorConfig } from '@/construction/floors/types'
import type { MaterialId } from '@/construction/materials/material'
import { MeasurementInfo } from '@/editor/components/MeasurementInfo'

import { ConfigForm } from './ConfigForm'

export interface FloorAssemblyConfigContentProps {
  initialSelectionId?: string
}

export function FloorAssemblyConfigContent({ initialSelectionId }: FloorAssemblyConfigContentProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const floorAssemblies = useFloorAssemblies()
  const storeys = useStoreysOrderedByLevel()
  const {
    addFloorAssembly,
    duplicateFloorAssembly,
    removeFloorAssembly,
    setDefaultFloorAssembly,
    resetFloorAssembliesToDefaults
  } = useConfigActions()

  const defaultConfigId = useDefaultFloorAssemblyId()

  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(() => {
    if (initialSelectionId && floorAssemblies.some(c => c.id === initialSelectionId)) {
      return initialSelectionId
    }
    return floorAssemblies.length > 0 ? floorAssemblies[0].id : null
  })

  const selectedConfig = floorAssemblies.find(c => c.id === selectedConfigId) ?? null

  const usage = useMemo(
    () =>
      selectedConfig
        ? getFloorAssemblyUsage(selectedConfig.id, storeys, defaultConfigId)
        : { isUsed: false, isDefault: false, storeyIds: [] },
    [selectedConfig, storeys, defaultConfigId]
  )

  const handleAddNew = useCallback(
    (type: FloorAssemblyType) => {
      const defaultMaterial = '' as MaterialId

      let name: string
      let config: FloorConfig
      if (type === 'monolithic') {
        name = t($ => $.floors.newName.monolithic)
        config = {
          type: 'monolithic',
          thickness: 180,
          material: defaultMaterial,
          topLayerSetId: undefined,
          bottomLayerSetId: undefined
        }
      } else if (type === 'joist') {
        name = t($ => $.floors.newName.joist)
        config = {
          type: 'joist',
          constructionHeight: 240,
          joistThickness: 120,
          joistSpacing: 800,
          joistMaterial: defaultMaterial,
          wallBeamThickness: 120,
          wallBeamMaterial: defaultMaterial,
          wallBeamInsideOffset: 40,
          wallInfillMaterial: defaultMaterial,
          subfloorThickness: 22,
          subfloorMaterial: defaultMaterial,
          openingSideThickness: 60,
          openingSideMaterial: defaultMaterial,
          topLayerSetId: undefined,
          bottomLayerSetId: undefined
        }
      } else if (type === 'filled') {
        name = t($ => $.floors.newName.filled)
        config = {
          type: 'filled',
          constructionHeight: 360,
          joistThickness: 60,
          joistSpacing: 500,
          joistMaterial: defaultMaterial,
          frameThickness: 60,
          frameMaterial: defaultMaterial,
          subfloorThickness: 22,
          subfloorMaterial: defaultMaterial,
          ceilingSheathingThickness: 22,
          ceilingSheathingMaterial: defaultMaterial,
          openingFrameThickness: 60,
          openingFrameMaterial: defaultMaterial,
          strawMaterial: undefined,
          topLayerSetId: undefined,
          bottomLayerSetId: undefined
        }
      } else {
        name = t($ => $.floors.newName.hangingJoist)
        config = {
          type: 'hanging-joist',
          joistHeight: 240,
          joistThickness: 120,
          joistSpacing: 800,
          joistMaterial: defaultMaterial,
          subfloorThickness: 22,
          subfloorMaterial: defaultMaterial,
          openingSideThickness: 60,
          openingSideMaterial: defaultMaterial,
          verticalOffset: 0,
          topLayerSetId: undefined,
          bottomLayerSetId: undefined
        }
      }

      const newConfig = addFloorAssembly(name, config)
      setSelectedConfigId(newConfig.id)
    },
    [addFloorAssembly]
  )

  const handleDuplicate = useCallback(() => {
    if (!selectedConfig) return

    const newName = t($ => $.floors.copyNameTemplate, {
      defaultValue: `{{name}} (Copy)`,
      name: selectedConfig.name
    })
    const duplicated = duplicateFloorAssembly(selectedConfig.id, newName)
    setSelectedConfigId(duplicated.id)
  }, [selectedConfig, duplicateFloorAssembly])

  const handleDelete = useCallback(() => {
    if (!selectedConfig || usage.isUsed) return

    try {
      const currentIndex = floorAssemblies.findIndex(c => c.id === selectedConfigId)
      removeFloorAssembly(selectedConfig.id)

      if (floorAssemblies.length > 1) {
        const nextConfig = floorAssemblies[currentIndex + 1] ?? floorAssemblies[currentIndex - 1]
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        setSelectedConfigId(nextConfig?.id ?? null)
      } else {
        setSelectedConfigId(null)
      }
    } catch (error) {
      console.error('Failed to delete floor assembly:', error)
    }
  }, [selectedConfig, selectedConfigId, floorAssemblies, removeFloorAssembly, usage.isUsed])

  const handleReset = useCallback(() => {
    resetFloorAssembliesToDefaults()
    const stillExists = floorAssemblies.some(a => a.id === selectedConfigId)
    if (!stillExists && floorAssemblies.length > 0) {
      setSelectedConfigId(floorAssemblies[0].id)
    }
  }, [resetFloorAssembliesToDefaults, selectedConfigId, floorAssemblies])

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-end gap-2">
          <div className="flex grow flex-col gap-1">
            <FloorAssemblySelect
              value={selectedConfigId as FloorAssemblyId | undefined}
              onValueChange={value => {
                setSelectedConfigId(value)
              }}
              showDefaultIndicator
              defaultConfigId={defaultConfigId}
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
                  {React.createElement(getFloorAssemblyTypeIcon('monolithic'))}
                  {t($ => $.floors.types.monolithic)}
                </div>
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={() => {
                  handleAddNew('joist')
                }}
              >
                <div className="flex items-center gap-1">
                  {React.createElement(getFloorAssemblyTypeIcon('joist'))}
                  {t($ => $.floors.types.joist)}
                </div>
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={() => {
                  handleAddNew('filled')
                }}
              >
                <div className="flex items-center gap-1">
                  {React.createElement(getFloorAssemblyTypeIcon('filled'))}
                  {t($ => $.floors.types.straw)}
                </div>
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={() => {
                  handleAddNew('hanging-joist')
                }}
              >
                <div className="flex items-center gap-1">
                  {React.createElement(getFloorAssemblyTypeIcon('hanging-joist'))}
                  {t($ => $.floors.types.hangingJoist)}
                </div>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu>

          <Button
            size="icon"
            onClick={handleDuplicate}
            disabled={!selectedConfig}
            title={t($ => $.common.duplicate)}
            variant="soft"
          >
            <Copy />
          </Button>

          <AlertDialog.Root>
            <AlertDialog.Trigger asChild>
              <Button
                size="icon"
                disabled={!selectedConfig || usage.isUsed || floorAssemblies.length === 1}
                variant="destructive"
                title={
                  !selectedConfig
                    ? t($ => $.floors.delete.noConfigSelected)
                    : floorAssemblies.length === 1
                      ? t($ => $.floors.delete.cannotDeleteLast)
                      : usage.isUsed
                        ? t($ => $.floors.delete.cannotDeleteInUse)
                        : t($ => $.common.delete)
                }
              >
                <Trash />
              </Button>
            </AlertDialog.Trigger>
            <AlertDialog.Content>
              <AlertDialog.Title>{t($ => $.floors.delete.confirmTitle)}</AlertDialog.Title>
              <AlertDialog.Description>
                {t($ => $.floors.delete.confirm, { name: selectedConfig?.name })}
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
              <Button size="icon" variant="destructive" title={t($ => $.common.resetToDefaults)}>
                <Undo2 />
              </Button>
            </AlertDialog.Trigger>
            <AlertDialog.Content>
              <AlertDialog.Title>{t($ => $.floors.reset.title)}</AlertDialog.Title>
              <AlertDialog.Description>{t($ => $.floors.reset.confirm)}</AlertDialog.Description>
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
      {selectedConfig && <ConfigForm assembly={selectedConfig} />}
      {!selectedConfig && floorAssemblies.length === 0 && (
        <div className="flex items-center justify-center p-5">
          <span className="">{t($ => $.floors.emptyList)}</span>
        </div>
      )}
      <Separator />
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-[auto_1fr] items-center gap-2 gap-x-3">
          <div className="flex items-center gap-1">
            <Label.Root>
              <span className="text-base font-medium">{t($ => $.floors.defaultFloorAssembly)}</span>
            </Label.Root>
            <MeasurementInfo highlightedAssembly="floorAssembly" />
          </div>
          <FloorAssemblySelect value={defaultConfigId} onValueChange={setDefaultFloorAssembly} />
        </div>

        {usage.isUsed && <UsageDisplay usage={usage} />}
      </div>
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

function UsageDisplay({ usage }: { usage: FloorAssemblyUsage }): React.JSX.Element {
  const { t } = useTranslation('config')

  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-2 gap-x-3">
      <Label.Root>
        <span className="text-base font-medium">{t($ => $.usage.usedBy)}</span>
      </Label.Root>
      <div className="flex flex-wrap gap-1">
        {usage.isDefault && (
          <Badge variant="soft" color="blue">
            {t($ => $.usage.globalDefault_floor)}
          </Badge>
        )}
        {usage.storeyIds.map(id => (
          <UsageBadge key={id} id={id} />
        ))}
      </div>
    </div>
  )
}
