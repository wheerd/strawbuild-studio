import { Copy, Plus, Trash, Undo2 } from 'lucide-react'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { LayerSetId } from '@/building/model/ids'
import { AlertDialog } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { LayerSetSelect } from '@/construction/config/components/layers/LayerSetSelect'
import { useConfigActions, useLayerSets } from '@/construction/config/store'

import { LayerSetConfigForm } from './LayerSetConfigForm'

export interface LayerSetsContentProps {
  initialSelectionId?: string
}

export function LayerSetsContent({ initialSelectionId }: LayerSetsContentProps): React.JSX.Element {
  const layerSets = useLayerSets()
  const { addLayerSet, duplicateLayerSet, removeLayerSet, resetLayerSetsToDefaults } = useConfigActions()

  const { t } = useTranslation('config')
  const [selectedLayerSetId, setSelectedLayerSetId] = useState<LayerSetId | null>(() => {
    if (initialSelectionId && layerSets.some(ls => ls.id === initialSelectionId)) {
      return initialSelectionId as LayerSetId
    }
    return layerSets.length > 0 ? layerSets[0].id : null
  })

  const selectedLayerSet = layerSets.find(ls => ls.id === selectedLayerSetId) ?? null

  const handleAddNew = useCallback(() => {
    const newLayerSet = addLayerSet(
      t($ => $.layerSets.newName),
      [],
      'wall'
    )
    setSelectedLayerSetId(newLayerSet.id)
  }, [addLayerSet])

  const handleDuplicate = useCallback(() => {
    if (!selectedLayerSet) return

    const newName = t($ => $.layerSets.copyNameTemplate, {
      defaultValue: '{{name}} (Copy)',
      name: selectedLayerSet.name
    })
    const duplicated = duplicateLayerSet(selectedLayerSet.id, newName)
    setSelectedLayerSetId(duplicated.id)
  }, [selectedLayerSet, duplicateLayerSet])

  const handleDelete = useCallback(() => {
    if (!selectedLayerSet) return

    const currentIndex = layerSets.findIndex(ls => ls.id === selectedLayerSetId)
    removeLayerSet(selectedLayerSet.id)

    if (layerSets.length > 1) {
      const nextLayerSet = layerSets[currentIndex + 1] ?? layerSets[currentIndex - 1]
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      setSelectedLayerSetId(nextLayerSet?.id ?? null)
    } else {
      setSelectedLayerSetId(null)
    }
  }, [selectedLayerSet, selectedLayerSetId, layerSets, removeLayerSet])

  const handleReset = useCallback(() => {
    resetLayerSetsToDefaults()
    const stillExists = layerSets.some(ls => ls.id === selectedLayerSetId)
    if (!stillExists && layerSets.length > 0) {
      setSelectedLayerSetId(layerSets[0].id)
    }
  }, [resetLayerSetsToDefaults, selectedLayerSetId, layerSets])

  const isDefault = selectedLayerSet ? layerSets[0].id === selectedLayerSet.id : false

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-end gap-2">
          <div className="flex grow flex-col gap-1">
            <LayerSetSelect
              value={selectedLayerSetId ?? undefined}
              onValueChange={id => {
                setSelectedLayerSetId(id)
              }}
              placeholder={t($ => $.common.placeholder)}
            />
          </div>

          <Button size="icon" onClick={handleAddNew} title={t($ => $.common.addNew)}>
            <Plus />
          </Button>

          <Button
            size="icon"
            onClick={handleDuplicate}
            disabled={!selectedLayerSet}
            title={t($ => $.common.duplicate)}
            variant="soft"
          >
            <Copy />
          </Button>

          <AlertDialog.Root>
            <AlertDialog.Trigger asChild>
              <Button
                size="icon"
                disabled={!selectedLayerSet || isDefault}
                variant="destructive"
                title={isDefault ? t($ => $.common.inUseCannotDelete) : t($ => $.common.delete)}
              >
                <Trash />
              </Button>
            </AlertDialog.Trigger>
            <AlertDialog.Content>
              <AlertDialog.Title>{t($ => $.layerSets.deleteTitle)}</AlertDialog.Title>
              <AlertDialog.Description>
                {t($ => $.layerSets.deleteConfirm, { name: selectedLayerSet?.name })}
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
              <AlertDialog.Title>{t($ => $.layerSets.resetTitle)}</AlertDialog.Title>
              <AlertDialog.Description>{t($ => $.layerSets.resetConfirm)}</AlertDialog.Description>
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
      </div>

      {selectedLayerSet && <LayerSetConfigForm layerSet={selectedLayerSet} />}

      {!selectedLayerSet && layerSets.length === 0 && (
        <div className="flex items-center justify-center p-5">
          <span className="">{t($ => $.layerSets.emptyList)}</span>
        </div>
      )}
    </div>
  )
}
