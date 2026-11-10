import * as Label from '@radix-ui/react-label'
import { Copy, Plus, Trash, Undo2 } from 'lucide-react'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'

import type { InteriorWallAssemblyId } from '@/building/model/ids'
import { useConfigActions, useDefaultInteriorWallAssemblyId, useInteriorWallAssemblies } from '@/config/store'
import { LAYER_SET_CLAY_PLASTER } from '@/config/store/slices/layers.defaults'
import type { InteriorWallAssemblyType, InteriorWallConfig } from '@/construction/assemblies/interiorWalls/types'
import { clayBrick, roughWood, strawbale } from '@/materials/defaults'
import { AlertDialog } from '@/shared/ui/components/alert-dialog'
import { Button } from '@/shared/ui/components/button'
import { DropdownMenu } from '@/shared/ui/components/dropdown-menu'

import { InteriorConfigForm } from './InteriorConfigForm'

export interface InteriorWallAssemblyContentProps {
  initialSelectionId?: string
}

export function InteriorWallAssemblyContent(props?: InteriorWallAssemblyContentProps): React.JSX.Element {
  const assemblies = useInteriorWallAssemblies()
  const defaultAssemblyId = useDefaultInteriorWallAssemblyId()
  const {
    addInteriorWallAssembly,
    duplicateInteriorWallAssembly,
    removeInteriorWallAssembly,
    setDefaultInteriorWallAssembly,
    resetInteriorWallAssembliesToDefaults
  } = useConfigActions()
  const { t } = useTranslation('config')
  const params = useParams<{ itemId?: string }>()
  const initialSelectionId = params.itemId ?? props?.initialSelectionId
  const [selectedAssemblyId, setSelectedAssemblyId] = useState<string | null>(() => {
    if (initialSelectionId && assemblies.some(assembly => assembly.id === initialSelectionId)) return initialSelectionId
    return assemblies[0]?.id ?? null
  })

  const selectedAssembly = assemblies.find(assembly => assembly.id === selectedAssemblyId) ?? null

  const handleAddNew = useCallback(
    (type: InteriorWallAssemblyType) => {
      const config: InteriorWallConfig =
        type === 'monolithic'
          ? { type, material: clayBrick.id, layerSetId: LAYER_SET_CLAY_PLASTER.id }
          : type === 'planked-stud'
            ? {
                type,
                minStudSpacing: 70,
                desiredStudSpacing: 800,
                maxStudSpacing: 900,
                studWidth: 40,
                studMaterial: roughWood.id,
                equidistantStuds: true,
                plankThickness: 25,
                plankMaterial: roughWood.id,
                fillMaterial: strawbale.id,
                headPlateThickness: 60,
                solePlateThickness: 60,
                nogginThickness: 60,
                nogginSpacing: 1500,
                equidistantNoggins: false,
                staggerNoggins: false,
                layerSetId: LAYER_SET_CLAY_PLASTER.id
              }
            : {
                type,
                minStudSpacing: 70,
                desiredStudSpacing: 800,
                maxStudSpacing: 900,
                studWidth: 40,
                studMaterial: roughWood.id,
                fillMaterial: clayBrick.id,
                equidistantStuds: true,
                headPlateThickness: 60,
                solePlateThickness: 60,
                nogginThickness: 60,
                nogginSpacing: 1500,
                equidistantNoggins: false,
                staggerNoggins: false,
                layerSetId: LAYER_SET_CLAY_PLASTER.id
              }
      const names = {
        monolithic: t($ => $.walls.newName_interiorMonolithic),
        'planked-stud': t($ => $.walls.newName_interiorPlankedStud),
        'monolithic-stud': t($ => $.walls.newName_interiorMonolithicStud)
      }
      const assembly = addInteriorWallAssembly(names[type], config)
      setSelectedAssemblyId(assembly.id)
    },
    [addInteriorWallAssembly, t]
  )

  const handleDuplicate = useCallback(() => {
    if (!selectedAssembly) return
    const name = t($ => $.walls.copyNameTemplate, { name: selectedAssembly.name })
    setSelectedAssemblyId(duplicateInteriorWallAssembly(selectedAssembly.id, name).id)
  }, [duplicateInteriorWallAssembly, selectedAssembly, t])

  const handleDelete = useCallback(() => {
    if (!selectedAssembly || selectedAssembly.id === defaultAssemblyId) return
    const index = assemblies.findIndex(assembly => assembly.id === selectedAssembly.id)
    removeInteriorWallAssembly(selectedAssembly.id)
    if (assemblies.length > 1) {
      const nextIndex = index + 1 < assemblies.length ? index + 1 : index - 1
      setSelectedAssemblyId(assemblies[nextIndex].id)
    } else {
      setSelectedAssemblyId(null)
    }
  }, [assemblies, defaultAssemblyId, removeInteriorWallAssembly, selectedAssembly])

  const handleReset = useCallback(() => {
    resetInteriorWallAssembliesToDefaults()
    if (!assemblies.some(assembly => assembly.id === selectedAssemblyId)) {
      setSelectedAssemblyId(assemblies[0]?.id ?? null)
    }
  }, [assemblies, resetInteriorWallAssembliesToDefaults, selectedAssemblyId])

  const types: InteriorWallAssemblyType[] = ['monolithic', 'planked-stud', 'monolithic-stud']

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-end gap-2">
          <select
            className="border-input bg-background h-9 min-w-0 grow rounded-md border px-3 text-sm"
            value={selectedAssemblyId ?? ''}
            onChange={event => {
              setSelectedAssemblyId(event.target.value || null)
            }}
          >
            {assemblies.map(assembly => (
              <option key={assembly.id} value={assembly.id}>
                {assembly.nameKey ? t(assembly.nameKey) : assembly.name}
                {assembly.id === defaultAssemblyId ? ` (${t($ => $.common.default)})` : ''}
              </option>
            ))}
          </select>
          <DropdownMenu>
            <DropdownMenu.Trigger asChild>
              <Button size="icon" title={t($ => $.common.addNew)}>
                <Plus />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              {types.map(type => (
                <DropdownMenu.Item
                  key={type}
                  onSelect={() => {
                    handleAddNew(type)
                  }}
                >
                  {t($ => $.walls.interiorTypes[type])}
                </DropdownMenu.Item>
              ))}
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
                disabled={!selectedAssembly || selectedAssembly.id === defaultAssemblyId}
                variant="destructive"
                title={t($ => $.common.delete)}
              >
                <Trash />
              </Button>
            </AlertDialog.Trigger>
            <AlertDialog.Content>
              <AlertDialog.Title>{t($ => $.walls.deleteTitle)}</AlertDialog.Title>
              <AlertDialog.Description>
                {t($ => $.walls.deleteConfirm, { name: selectedAssembly?.name })}
              </AlertDialog.Description>
              <div className="mt-4 flex justify-end gap-3">
                <AlertDialog.Cancel asChild>
                  <Button variant="soft">{t($ => $.common.cancel)}</Button>
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
              <AlertDialog.Title>{t($ => $.walls.resetTitle)}</AlertDialog.Title>
              <AlertDialog.Description>{t($ => $.walls.resetConfirm)}</AlertDialog.Description>
              <div className="mt-4 flex justify-end gap-3">
                <AlertDialog.Cancel asChild>
                  <Button variant="soft">{t($ => $.common.cancel)}</Button>
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
            <span className="text-sm font-medium">{t($ => $.walls.defaultInteriorWallAssembly)}</span>
          </Label.Root>
          <select
            className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            value={defaultAssemblyId}
            onChange={event => {
              setDefaultInteriorWallAssembly(event.target.value as InteriorWallAssemblyId)
            }}
          >
            {assemblies.map(assembly => (
              <option key={assembly.id} value={assembly.id}>
                {assembly.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {selectedAssembly && <InteriorConfigForm assembly={selectedAssembly} />}
      {assemblies.length === 0 && (
        <div className="flex items-center justify-center p-5">{t($ => $.walls.emptyInteriorList)}</div>
      )}
    </div>
  )
}
