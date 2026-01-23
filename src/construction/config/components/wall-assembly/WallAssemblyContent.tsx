import { CircleIcon, CopyIcon, CubeIcon, LayersIcon, PlusIcon, ResetIcon, TrashIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import React, { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { OpeningAssemblyId, WallAssemblyId } from '@/building/model/ids'
import { usePerimeterWalls } from '@/building/store'
import { AlertDialog } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { WallAssemblySelect } from '@/construction/config/components/WallAssemblySelect'
import { type EntityId, useEntityLabel } from '@/construction/config/components/useEntityLabel'
import { useConfigActions, useDefaultWallAssemblyId, useWallAssemblies } from '@/construction/config/store'
import { type WallAssemblyUsage, getWallAssemblyUsage } from '@/construction/config/usage'
import {
  battens,
  ecococonBox,
  ecococonInclined,
  ecococonLintel,
  ecococonSill,
  ecococonStandard,
  lvl
} from '@/construction/materials/material'
import type { MaterialId } from '@/construction/materials/material'
import type { WallAssemblyType, WallConfig } from '@/construction/walls'
import { MeasurementInfo } from '@/editor/components/MeasurementInfo'

import { ConfigForm } from './ConfigForm'

export interface WallAssemblyContentProps {
  initialSelectionId?: string
}

export function WallAssemblyContent({ initialSelectionId }: WallAssemblyContentProps): React.JSX.Element {
  const wallAssemblies = useWallAssemblies()
  const walls = usePerimeterWalls()
  const {
    addWallAssembly,
    duplicateWallAssembly,
    removeWallAssembly,
    setDefaultWallAssembly,
    resetWallAssembliesToDefaults
  } = useConfigActions()

  const defaultAssemblyId = useDefaultWallAssemblyId()

  const { t } = useTranslation('config')
  const [selectedAssemblyId, setSelectedAssemblyId] = useState<string | null>(() => {
    if (initialSelectionId && wallAssemblies.some(m => m.id === initialSelectionId)) {
      return initialSelectionId
    }
    return wallAssemblies.length > 0 ? wallAssemblies[0].id : null
  })

  const selectedAssembly = wallAssemblies.find(m => m.id === selectedAssemblyId) ?? null

  const usage = useMemo(
    () =>
      selectedAssembly
        ? getWallAssemblyUsage(selectedAssembly.id, walls, defaultAssemblyId)
        : { isUsed: false, isDefault: false, storeyIds: [] },
    [selectedAssembly, walls, defaultAssemblyId]
  )

  const handleAddNew = useCallback(
    (type: WallAssemblyType) => {
      const defaultMaterial = '' as MaterialId

      let name: string
      let config: WallConfig
      const layers = {
        insideThickness: 30,
        insideLayers: [],
        outsideThickness: 50,
        outsideLayers: []
      }

      switch (type) {
        case 'infill':
          name = t($ => $.walls.newName_infill)
          config = {
            type: 'infill',
            maxPostSpacing: 900,
            desiredPostSpacing: 800,
            minStrawSpace: 70,
            posts: {
              type: 'double',
              width: 60,
              thickness: 120,
              infillMaterial: defaultMaterial,
              material: defaultMaterial
            },
            triangularBattens: {
              size: 30,
              material: battens.id,
              inside: false,
              outside: false,
              minLength: 100
            },
            layers
          }
          break
        case 'strawhenge':
          name = t($ => $.walls.newName_strawhenge)
          config = {
            type: 'strawhenge',
            module: {
              type: 'single',
              minWidth: 920,
              maxWidth: 920,
              frameThickness: 60,
              frameMaterial: defaultMaterial,
              strawMaterial: defaultMaterial,
              triangularBattens: {
                size: 30,
                material: battens.id,
                inside: false,
                outside: false,
                minLength: 100
              }
            },
            infill: {
              maxPostSpacing: 900,
              desiredPostSpacing: 800,
              minStrawSpace: 70,
              posts: {
                type: 'full',
                width: 60,
                material: defaultMaterial
              },
              triangularBattens: {
                size: 30,
                material: battens.id,
                inside: false,
                outside: false,
                minLength: 100
              }
            },
            layers
          }
          break
        case 'modules':
          name = t($ => $.walls.newName_modules)
          config = {
            type: 'modules',
            module: {
              type: 'single',
              minWidth: 920,
              maxWidth: 920,
              frameThickness: 60,
              frameMaterial: defaultMaterial,
              strawMaterial: defaultMaterial,
              triangularBattens: {
                size: 30,
                material: battens.id,
                inside: false,
                outside: false,
                minLength: 100
              }
            },
            infill: {
              maxPostSpacing: 900,
              desiredPostSpacing: 800,
              minStrawSpace: 70,
              posts: {
                type: 'full',
                width: 60,
                material: defaultMaterial
              },
              triangularBattens: {
                size: 30,
                material: battens.id,
                inside: false,
                outside: false,
                minLength: 100
              }
            },
            layers
          }
          break
        case 'prefab-modules':
          name = t($ => $.walls.newName_prefab)
          config = {
            type: 'prefab-modules',
            defaultMaterial: ecococonStandard.id,
            fallbackMaterial: ecococonBox.id,
            inclinedMaterial: ecococonInclined.id,
            lintelMaterial: ecococonLintel.id,
            sillMaterial: ecococonSill.id,
            maxWidth: 850,
            targetWidth: 800,
            preferEqualWidths: true,
            tallReinforceThreshold: 3000,
            tallReinforceThickness: 15,
            tallReinforceStagger: 400,
            tallReinforceMaterial: lvl.id,
            openingAssemblyId: 'oa_empty_default' as OpeningAssemblyId,
            layers
          }
          break
        case 'non-strawbale':
          name = t($ => $.walls.newName_nonStrawbale)
          config = {
            type: 'non-strawbale',
            material: defaultMaterial,
            openingAssemblyId: 'oa_empty_default' as OpeningAssemblyId,
            layers
          }
          break
      }

      const newAssembly = addWallAssembly(name, config)
      setSelectedAssemblyId(newAssembly.id)
    },
    [addWallAssembly]
  )

  const handleDuplicate = useCallback(() => {
    if (!selectedAssembly) return

    const newName = t($ => $.walls.copyNameTemplate, {
      defaultValue: `{{name}} (Copy)`,
      name: selectedAssembly.name
    })
    const duplicated = duplicateWallAssembly(selectedAssembly.id, newName)
    setSelectedAssemblyId(duplicated.id)
  }, [selectedAssembly, duplicateWallAssembly])

  const handleDelete = useCallback(() => {
    if (!selectedAssembly || usage.isUsed) return

    const currentIndex = wallAssemblies.findIndex(m => m.id === selectedAssemblyId)
    removeWallAssembly(selectedAssembly.id)

    if (wallAssemblies.length > 1) {
      const nextAssembly = wallAssemblies[currentIndex + 1] ?? wallAssemblies[currentIndex - 1]
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      setSelectedAssemblyId(nextAssembly?.id ?? null)
    } else {
      setSelectedAssemblyId(null)
    }
  }, [selectedAssembly, selectedAssemblyId, wallAssemblies, removeWallAssembly, usage.isUsed])

  const handleReset = useCallback(() => {
    resetWallAssembliesToDefaults()
    // Keep selection if it still exists after reset
    const stillExists = wallAssemblies.some(a => a.id === selectedAssemblyId)
    if (!stillExists && wallAssemblies.length > 0) {
      setSelectedAssemblyId(wallAssemblies[0].id)
    }
  }, [resetWallAssembliesToDefaults, selectedAssemblyId, wallAssemblies])

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-end gap-2">
            <div className="flex grow flex-col gap-1">
              <WallAssemblySelect
                value={selectedAssemblyId as WallAssemblyId | undefined}
                onValueChange={setSelectedAssemblyId}
                showDefaultIndicator
                defaultAssemblyId={defaultAssemblyId}
              />
            </div>

            <DropdownMenu>
              <DropdownMenu.Trigger asChild>
                <Button size="icon" title={t($ => $.common.addNew)}>
                  <PlusIcon />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.Item
                  onSelect={() => {
                    handleAddNew('infill')
                  }}
                >
                  <div className="flex items-center gap-1">
                    <LayersIcon />
                    {t($ => $.walls.types.infill)}
                  </div>
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={() => {
                    handleAddNew('strawhenge')
                  }}
                >
                  <div className="flex items-center gap-1">
                    <CubeIcon />
                    {t($ => $.walls.types.strawhenge)}
                  </div>
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={() => {
                    handleAddNew('modules')
                  }}
                >
                  <div className="flex items-center gap-1">
                    <CircleIcon />
                    {t($ => $.walls.types.modules)}
                  </div>
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={() => {
                    handleAddNew('non-strawbale')
                  }}
                >
                  <div className="flex items-center gap-1">
                    <TrashIcon />
                    {t($ => $.walls.types['non-strawbale'])}
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
              <CopyIcon />
            </Button>

            <AlertDialog.Root>
              <AlertDialog.Trigger asChild>
                <Button
                  size="icon"
                  disabled={!selectedAssembly || usage.isUsed}
                  variant="destructive"
                  title={usage.isUsed ? t($ => $.common.inUseCannotDelete) : t($ => $.common.delete)}
                >
                  <TrashIcon />
                </Button>
              </AlertDialog.Trigger>
              <AlertDialog.Content>
                <AlertDialog.Title>{t($ => $.walls.deleteTitle)}</AlertDialog.Title>
                <AlertDialog.Description>
                  {t($ => $.walls.deleteConfirm, { name: selectedAssembly?.name })}
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
                  <ResetIcon />
                </Button>
              </AlertDialog.Trigger>
              <AlertDialog.Content>
                <AlertDialog.Title>{t($ => $.walls.resetTitle)}</AlertDialog.Title>
                <AlertDialog.Description>{t($ => $.walls.resetConfirm)}</AlertDialog.Description>
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
                <span className="text-sm font-medium">{t($ => $.walls.defaultWallAssembly)}</span>
                <MeasurementInfo highlightedAssembly="wallAssembly" />
              </div>
            </Label.Root>
            <WallAssemblySelect
              value={defaultAssemblyId}
              onValueChange={value => {
                setDefaultWallAssembly(value)
              }}
              placeholder={t($ => $.walls.selectDefault)}
            />
          </div>
        </div>
      </div>
      {selectedAssembly && <ConfigForm assembly={selectedAssembly} />}
      {!selectedAssembly && wallAssemblies.length === 0 && (
        <div className="flex items-center justify-center p-5">
          <span className="">{t($ => $.walls.emptyList)}</span>
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

function UsageDisplay({ usage }: { usage: WallAssemblyUsage }): React.JSX.Element {
  const { t } = useTranslation('config')

  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-2 gap-x-3">
      <Label.Root>
        <span className="text-base font-medium">{t($ => $.usage.usedBy)}</span>
      </Label.Root>
      <div className="flex flex-wrap gap-1">
        {usage.isDefault && (
          <Badge variant="soft" color="blue">
            {t($ => $.usage.globalDefault_wall)}
          </Badge>
        )}
        {usage.storeyIds.map(id => (
          <UsageBadge key={id} id={id} />
        ))}
      </div>
    </div>
  )
}
