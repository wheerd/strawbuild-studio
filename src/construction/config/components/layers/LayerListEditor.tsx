import { Plus } from 'lucide-react'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import type { LayerSetId } from '@/building/model/ids'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { useConfigActions } from '@/construction/config/store'
import { sumLayerThickness } from '@/construction/layers'
import type { LayerConfig, LayerType } from '@/construction/layers/types'
import type { MaterialId } from '@/construction/materials/material'

import { LayerCard, LayerTypeIcon } from './LayerCard'

const DEFAULT_MATERIAL = '' as MaterialId

const getDefaultLayer = (type: LayerType, name: string, thickness: number): LayerConfig =>
  type === 'monolithic'
    ? {
        type: 'monolithic',
        name,
        thickness,
        material: DEFAULT_MATERIAL
      }
    : {
        type: 'striped',
        name,
        thickness,
        direction: 'perpendicular',
        stripeWidth: 50,
        stripeMaterial: DEFAULT_MATERIAL,
        gapWidth: 50,
        gapMaterial: undefined
      }

interface LayerListEditorProps {
  layerSetId: LayerSetId
}

export function LayerListEditor({ layerSetId }: LayerListEditorProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const { getLayerSetById, addLayerToSet, updateLayerInSet, removeLayerFromSet, moveLayerInSet } = useConfigActions()

  const layerSet = getLayerSetById(layerSetId)
  const layers = layerSet?.layers ?? []
  const use = layerSet?.use ?? 'wall'

  const hasLayers = layers.length > 0
  const totalThickness = useMemo(() => sumLayerThickness(layers), [layers])

  const beforeLabel = t($ => $.layers.orientation.before)
  const afterLabel = t($ => $.layers.orientation.after[use])

  const handleAddLayer = (layer: LayerConfig) => {
    addLayerToSet(layerSetId, layer)
  }

  const handleUpdateLayer = (index: number, updates: Partial<Omit<LayerConfig, 'type'>>) => {
    updateLayerInSet(layerSetId, index, updates)
  }

  const handleRemoveLayer = (index: number) => {
    removeLayerFromSet(layerSetId, index)
  }

  const handleMoveLayer = (fromIndex: number, toIndex: number) => {
    moveLayerInSet(layerSetId, fromIndex, toIndex)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold">{t($ => $.common.totalThickness)}</span>
          <span className="text-sm">{t($ => $.layers.totalThicknessLabel, { thickness: totalThickness })}</span>
        </div>
        <div className="flex gap-1">
          <DropdownMenu>
            <DropdownMenu.Trigger asChild>
              <Button size="icon-sm" title={t($ => $.common.add)} variant="default">
                <Plus />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item
                onSelect={() => {
                  handleAddLayer(
                    getDefaultLayer(
                      'monolithic',
                      t($ => $.layers.defaultName_monolithic),
                      0
                    )
                  )
                }}
              >
                <div className="flex items-center gap-1">
                  <LayerTypeIcon type="monolithic" />
                  {t($ => $.layers.defaultName_monolithic)}
                </div>
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={() => {
                  handleAddLayer(
                    getDefaultLayer(
                      'striped',
                      t($ => $.layers.defaultName_striped),
                      0
                    )
                  )
                }}
              >
                <div className="flex items-center gap-1">
                  <LayerTypeIcon type="striped" />
                  {t($ => $.layers.defaultName_striped)}
                </div>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu>
        </div>
      </div>

      {!hasLayers && (
        <Card variant="soft">
          <div className="flex min-h-14 items-center justify-center">
            <span className="text-muted-foreground text-sm">{t($ => $.layers.noLayers)}</span>
          </div>
        </Card>
      )}

      {hasLayers && (
        <div className="grid grid-cols-1 items-center justify-center gap-2">
          <div className="flex justify-center">
            <span className="text-sm">{beforeLabel}</span>
          </div>
          {layers.map((layer, index) => (
            <LayerCard
              key={`${layer.type}-${index}`}
              index={index}
              layer={layer}
              isFirst={index === 0}
              isLast={index === layers.length - 1}
              onMoveLayer={handleMoveLayer}
              onUpdateLayer={handleUpdateLayer}
              onRemoveLayer={handleRemoveLayer}
            />
          ))}
          <div className="flex justify-center">
            <span className="text-sm">{afterLabel}</span>
          </div>
        </div>
      )}
    </div>
  )
}
