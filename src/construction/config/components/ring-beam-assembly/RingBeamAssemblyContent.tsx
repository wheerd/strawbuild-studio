import { CopyIcon, PlusIcon, ResetIcon, TrashIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import React, { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { RingBeamAssemblyId } from '@/building/model/ids'
import { usePerimeterWalls } from '@/building/store'
import { AlertDialog } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { getRingBeamTypeIcon } from '@/construction/config/components/Icons'
import { RingBeamAssemblySelect } from '@/construction/config/components/RingBeamAssemblySelect'
import { type EntityId, useEntityLabel } from '@/construction/config/components/useEntityLabel'
import {
  useConfigActions,
  useDefaultBaseRingBeamAssemblyId,
  useDefaultTopRingBeamAssemblyId,
  useRingBeamAssemblies
} from '@/construction/config/store'
import { type RingBeamAssemblyUsage, getRingBeamAssemblyUsage } from '@/construction/config/usage'
import { bitumen, brick, cork, roughWood, woodwool } from '@/construction/materials/material'
import { type RingBeamAssemblyType, type RingBeamConfig } from '@/construction/ringBeams'
import { MeasurementInfo } from '@/editor/components/MeasurementInfo'

import { ConfigForm } from './ConfigForm'

export interface RingBeamAssemblyContentProps {
  initialSelectionId?: string
}

export function RingBeamAssemblyContent({ initialSelectionId }: RingBeamAssemblyContentProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const ringBeamAssemblies = useRingBeamAssemblies()
  const walls = usePerimeterWalls()
  const {
    addRingBeamAssembly,
    removeRingBeamAssembly,
    setDefaultBaseRingBeamAssembly,
    setDefaultTopRingBeamAssembly,
    resetRingBeamAssembliesToDefaults
  } = useConfigActions()

  const defaultBaseId = useDefaultBaseRingBeamAssemblyId()
  const defaultTopId = useDefaultTopRingBeamAssemblyId()

  const [selectedAssemblyId, setSelectedAssemblyId] = useState<string | null>(() => {
    if (initialSelectionId && ringBeamAssemblies.some(m => m.id === initialSelectionId)) {
      return initialSelectionId
    }
    return ringBeamAssemblies.length > 0 ? ringBeamAssemblies[0].id : null
  })

  const selectedAssembly = ringBeamAssemblies.find(m => m.id === selectedAssemblyId) ?? null

  const usage = useMemo(
    () =>
      selectedAssembly
        ? getRingBeamAssemblyUsage(selectedAssembly.id, walls, defaultBaseId, defaultTopId)
        : { isUsed: false, isDefaultBase: false, isDefaultTop: false, storeyIds: [] },
    [selectedAssembly, walls, defaultBaseId, defaultTopId]
  )

  const handleAddNew = useCallback(
    (type: RingBeamAssemblyType) => {
      let name: string
      let config: RingBeamConfig
      if (type === 'full') {
        name = t($ => $.ringBeams.newName_full)
        config = {
          type: 'full',
          height: 60,
          material: roughWood.id,
          width: 360,
          offsetFromEdge: 0
        }
      } else if (type === 'double') {
        name = t($ => $.ringBeams.newName_double)
        config = {
          type: 'double',
          height: 60,
          material: roughWood.id,
          thickness: 120,
          infillMaterial: woodwool.id,
          offsetFromEdge: 0,
          spacing: 100,
          cornerHandling: 'interweave'
        }
      } else {
        name = t($ => $.ringBeams.newName_brick)
        config = {
          type: 'brick',
          wallHeight: 300,
          wallWidth: 250,
          wallMaterial: brick.id,
          beamThickness: 60,
          beamWidth: 360,
          beamMaterial: roughWood.id,
          waterproofingThickness: 2,
          waterproofingMaterial: bitumen.id,
          insulationThickness: 100,
          insulationMaterial: cork.id
        }
      }

      const newAssembly = addRingBeamAssembly(name, config)
      setSelectedAssemblyId(newAssembly.id)
    },
    [addRingBeamAssembly]
  )

  const handleDuplicate = useCallback(() => {
    if (!selectedAssembly) return

    const { id: _id, name: _name, ...config } = selectedAssembly
    const newName = t($ => $.ringBeams.copyNameTemplate, {
      defaultValue: `{{name}} (Copy)`,
      name: selectedAssembly.name
    })
    const duplicated = addRingBeamAssembly(newName, config)
    setSelectedAssemblyId(duplicated.id)
  }, [selectedAssembly, addRingBeamAssembly])

  const handleDelete = useCallback(() => {
    if (!selectedAssembly || usage.isUsed) return

    const currentIndex = ringBeamAssemblies.findIndex(m => m.id === selectedAssemblyId)
    removeRingBeamAssembly(selectedAssembly.id)

    if (ringBeamAssemblies.length > 1) {
      const nextAssembly = ringBeamAssemblies[currentIndex + 1] ?? ringBeamAssemblies[currentIndex - 1]
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      setSelectedAssemblyId(nextAssembly?.id ?? null)
    } else {
      setSelectedAssemblyId(null)
    }
  }, [selectedAssembly, selectedAssemblyId, ringBeamAssemblies, removeRingBeamAssembly, usage.isUsed])

  const handleReset = useCallback(() => {
    resetRingBeamAssembliesToDefaults()
    const stillExists = ringBeamAssemblies.some(a => a.id === selectedAssemblyId)
    if (!stillExists && ringBeamAssemblies.length > 0) {
      setSelectedAssemblyId(ringBeamAssemblies[0].id)
    }
  }, [resetRingBeamAssembliesToDefaults, selectedAssemblyId, ringBeamAssemblies])

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex w-full flex-col gap-2">
        <div className="flex items-end gap-2">
          <div className="flex grow flex-col gap-1">
            <RingBeamAssemblySelect
              value={selectedAssemblyId as RingBeamAssemblyId | undefined}
              onValueChange={value => {
                setSelectedAssemblyId(value ?? null)
              }}
              showDefaultIndicator
              defaultAssemblyIds={[defaultBaseId, defaultTopId].filter(Boolean) as RingBeamAssemblyId[]}
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
                  handleAddNew('full')
                }}
              >
                <div className="flex items-center gap-1">
                  {React.createElement(getRingBeamTypeIcon('full'))}
                  {t($ => $.ringBeams.types.full)}
                </div>
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={() => {
                  handleAddNew('double')
                }}
              >
                <div className="flex items-center gap-1">
                  {React.createElement(getRingBeamTypeIcon('double'))}
                  {t($ => $.ringBeams.types.double)}
                </div>
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={() => {
                  handleAddNew('brick')
                }}
              >
                <div className="flex items-center gap-1">
                  {React.createElement(getRingBeamTypeIcon('brick'))}
                  {t($ => $.ringBeams.types.brick)}
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
              <AlertDialog.Title>{t($ => $.ringBeams.deleteTitle)}</AlertDialog.Title>
              <AlertDialog.Description>
                {t($ => $.ringBeams.deleteConfirm, { name: selectedAssembly?.name })}
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
              <AlertDialog.Title>{t($ => $.ringBeams.resetTitle)}</AlertDialog.Title>
              <AlertDialog.Description>{t($ => $.ringBeams.resetConfirm)}</AlertDialog.Description>
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
      {selectedAssembly && <ConfigForm assembly={selectedAssembly} />}
      {!selectedAssembly && ringBeamAssemblies.length === 0 && (
        <div className="flex items-center justify-center p-5">
          <span className="">No ring beam assemblies yet. Create one using the "New" button above.</span>
        </div>
      )}
      <Separator />
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2 gap-x-3">
          <div className="flex items-center gap-1">
            <Label.Root>
              <span className="text-base font-medium">{t($ => $.ringBeams.defaultBasePlate)}</span>
            </Label.Root>
            <MeasurementInfo highlightedPart="basePlate" />
          </div>
          <RingBeamAssemblySelect
            value={defaultBaseId}
            onValueChange={setDefaultBaseRingBeamAssembly}
            placeholder={t($ => $.common.placeholders.selectDefault)}
            allowNone
          />

          <div className="flex items-center gap-1">
            <Label.Root>
              <span className="text-base font-medium">{t($ => $.ringBeams.defaultTopPlate)}</span>
            </Label.Root>
            <MeasurementInfo highlightedPart="topPlate" />
          </div>
          <RingBeamAssemblySelect
            value={defaultTopId}
            onValueChange={setDefaultTopRingBeamAssembly}
            placeholder={t($ => $.common.placeholders.selectDefault)}
            allowNone
          />
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

function UsageDisplay({ usage }: { usage: RingBeamAssemblyUsage }): React.JSX.Element {
  const { t } = useTranslation('config')

  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-2 gap-x-3">
      <Label.Root>
        <span className="text-base font-medium">{t($ => $.usage.usedBy)}</span>
      </Label.Root>
      <div className="flex flex-wrap gap-1">
        {usage.isDefaultBase && (
          <Badge variant="soft" color="blue">
            {t($ => $.usage.globalDefault_ringBeamBase)}
          </Badge>
        )}
        {usage.isDefaultTop && (
          <Badge variant="soft" color="blue">
            {t($ => $.usage.globalDefault_ringBeamTop)}
          </Badge>
        )}
        {usage.storeyIds.map(id => (
          <UsageBadge key={id} id={id} />
        ))}
      </div>
    </div>
  )
}
