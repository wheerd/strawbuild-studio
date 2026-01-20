import {
  ChevronDownIcon,
  ChevronUpIcon,
  ColumnsIcon,
  CopyIcon,
  HeightIcon,
  MagicWandIcon,
  PlusIcon,
  SquareIcon,
  TrashIcon,
  WidthIcon
} from '@radix-ui/react-icons'
import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { Select } from '@/components/ui/select'
import { TextField } from '@/components/ui/text-field'
import { Tooltip } from '@/components/ui/tooltip'
import { sumLayerThickness } from '@/construction/config/store/layerUtils'
import type { LayerPreset } from '@/construction/layers/defaults'
import type {
  LayerConfig,
  LayerType,
  MonolithicLayerConfig,
  StripeDirection,
  StripedLayerConfig
} from '@/construction/layers/types'
import { MaterialSelectWithEdit } from '@/construction/materials/components/MaterialSelectWithEdit'
import type { MaterialId } from '@/construction/materials/material'
import { LengthField } from '@/shared/components/LengthField'
import type { Length } from '@/shared/geometry'
import { useFormatters } from '@/shared/i18n/useFormatters'

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

export interface LayerCopySource {
  name: string
  totalThickness: Length
  layerSource: () => LayerConfig[]
}

interface LayerListEditorProps {
  title: string
  layers: LayerConfig[]
  onAddLayer: (layer: LayerConfig) => void
  onUpdateLayer: (index: number, updates: Partial<Omit<LayerConfig, 'type'>>) => void
  onRemoveLayer: (index: number) => void
  onMoveLayer: (fromIndex: number, toIndex: number) => void
  measurementInfo?: React.ReactNode
  addLabel: string
  emptyHint?: string
  layerPresets?: LayerPreset[]
  layerCopySources?: LayerCopySource[]
  onReplaceLayers?: (layers: LayerConfig[]) => void
  beforeLabel: string
  afterLabel: string
}

export function LayerListEditor({
  title,
  layers,
  onAddLayer,
  onUpdateLayer,
  onRemoveLayer,
  onMoveLayer,
  measurementInfo,
  addLabel,
  emptyHint,
  layerPresets,
  layerCopySources,
  onReplaceLayers,
  beforeLabel,
  afterLabel
}: LayerListEditorProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const { formatLength } = useFormatters()
  const hasLayers = layers.length > 0
  const totalThickness = useMemo(() => sumLayerThickness(layers), [layers])
  const hasPresetMenu = onReplaceLayers != null && layerPresets && layerPresets.length > 0

  const applyPreset = (presetLayers: LayerConfig[]) => {
    if (!onReplaceLayers) return
    const clonedLayers = presetLayers.map(layer => ({ ...layer }))
    onReplaceLayers(clonedLayers)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold">{title}</span>
          {measurementInfo}
          <span className="text-sm">{t($ => $.layers.totalThicknessLabel, { thickness: totalThickness })}</span>
        </div>
        <div className="flex gap-1">
          {layerCopySources && (
            <DropdownMenu>
              <DropdownMenu.Trigger asChild>
                <Button size="icon-sm" title={t($ => $.layers.copyFrom)} variant="soft">
                  <CopyIcon />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.Label>{t($ => $.layers.copyFrom)}</DropdownMenu.Label>
                {layerCopySources.map(({ name, totalThickness, layerSource }) => (
                  <DropdownMenu.Item
                    key={name}
                    onSelect={() => {
                      applyPreset(layerSource())
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span>{name}</span>
                      <span className="text-sm">· {formatLength(totalThickness)}</span>
                    </div>
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu>
          )}

          {hasPresetMenu && (
            <DropdownMenu>
              <DropdownMenu.Trigger asChild>
                <Button size="icon-sm" title={t($ => $.layers.presetsLabel)} variant="soft">
                  <MagicWandIcon />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                {layerPresets.map(preset => (
                  <DropdownMenu.Item
                    key={t(preset.nameKey)}
                    onSelect={() => {
                      applyPreset(preset.layers)
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span>{t(preset.nameKey)}</span>
                      <span className="text-sm">· {formatLength(sumLayerThickness(preset.layers))}</span>
                    </div>
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu>
          )}

          <DropdownMenu>
            <DropdownMenu.Trigger asChild>
              <Button size="icon-sm" title={addLabel} variant="default">
                <PlusIcon />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item
                onSelect={() => {
                  onAddLayer(
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
                  onAddLayer(
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
            <span className="text-muted-foreground text-sm">{emptyHint}</span>
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
              onMoveLayer={onMoveLayer}
              onUpdateLayer={onUpdateLayer}
              onRemoveLayer={onRemoveLayer}
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

interface LayerCardProps {
  index: number
  layer: LayerConfig
  isFirst: boolean
  isLast: boolean
  onMoveLayer: (fromIndex: number, toIndex: number) => void
  onUpdateLayer: (index: number, updates: Partial<Omit<LayerConfig, 'type'>>) => void
  onRemoveLayer: (index: number) => void
}

const LayerTypeIcon = ({ type }: { type: LayerType }) => {
  const { t } = useTranslation('config')
  return (
    <Tooltip content={t($ => $.layers.types[type])}>
      {type === 'monolithic' ? <SquareIcon width={16} height={16} /> : <ColumnsIcon width={16} height={16} />}
    </Tooltip>
  )
}

function LayerCard({
  index,
  layer,
  isFirst,
  isLast,
  onMoveLayer,
  onUpdateLayer,
  onRemoveLayer
}: LayerCardProps): React.JSX.Element {
  const { t } = useTranslation('config')

  // Display translated name if nameKey exists
  const displayName = layer.nameKey ? t(layer.nameKey) : layer.name
  const [nameInput, setNameInput] = useState(displayName)

  useEffect(() => {
    setNameInput(displayName)
  }, [displayName])

  const commitNameChange = () => {
    const trimmed = nameInput.trim()
    if (trimmed.length === 0) {
      setNameInput(displayName)
      return
    }
    if (trimmed !== displayName) {
      // Clear nameKey when user edits the name
      onUpdateLayer(index, { name: trimmed, nameKey: undefined })
    } else if (trimmed !== nameInput) {
      setNameInput(trimmed)
    }
  }

  return (
    <Card variant="soft" style={{ padding: '0.75rem' }}>
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-1">
          <LayerTypeIcon type={layer.type} />
          <TextField.Root
            title={t($ => $.common.name)}
            size="sm"
            value={nameInput}
            onChange={event => {
              setNameInput(event.target.value)
            }}
            onBlur={commitNameChange}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.currentTarget.blur()
              }
            }}
            placeholder={t($ => $.common.placeholders.name)}
            required
          />
          <LengthField
            value={layer.thickness}
            onChange={value => {
              onUpdateLayer(index, { thickness: value })
            }}
            unit="mm"
            size="sm"
            style={{ width: '10em' }}
          >
            <TextField.Slot title={t($ => $.common.thickness)} side="left" className="pr-0 pl-1">
              <HeightIcon />
            </TextField.Slot>
          </LengthField>

          <Checkbox
            checked={layer.overlap}
            onCheckedChange={value => {
              onUpdateLayer(index, { overlap: value === true })
            }}
            title={t($ => $.layers.overlap)}
          />

          <div className="flex gap-1">
            <Button
              size="icon-sm"
              variant="outline"
              onClick={() => {
                onMoveLayer(index, index - 1)
              }}
              disabled={isFirst}
              title={t($ => $.layers.moveUp)}
            >
              <ChevronUpIcon />
            </Button>
            <Button
              size="icon-sm"
              variant="outline"
              onClick={() => {
                onMoveLayer(index, index + 1)
              }}
              disabled={isLast}
              title={t($ => $.layers.moveDown)}
            >
              <ChevronDownIcon />
            </Button>
            <Button
              size="icon-sm"
              variant="destructive"
              onClick={() => {
                onRemoveLayer(index)
              }}
              title={t($ => $.layers.removeLayer)}
            >
              <TrashIcon />
            </Button>
          </div>
        </div>

        {layer.type === 'monolithic' && (
          <MonolithicLayerFields index={index} layer={layer} onUpdateLayer={onUpdateLayer} />
        )}

        {layer.type === 'striped' && <StripedLayerFields index={index} layer={layer} onUpdateLayer={onUpdateLayer} />}
      </div>
    </Card>
  )
}

function Field({ label, control }: { label: string; control: React.ReactNode }): React.JSX.Element {
  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-2">
      <span className="text-sm">{label}</span>
      {control}
    </div>
  )
}

function MonolithicLayerFields({
  index,
  layer,
  onUpdateLayer
}: {
  index: number
  layer: Extract<LayerConfig, { type: 'monolithic' }>
  onUpdateLayer: (index: number, updates: Partial<Omit<MonolithicLayerConfig, 'type'>>) => void
}): React.JSX.Element {
  const { t } = useTranslation('config')
  return (
    <Field
      label={t($ => $.common.materialLabel)}
      control={
        <MaterialSelectWithEdit
          value={layer.material}
          onValueChange={material => {
            if (!material) return
            onUpdateLayer(index, { material })
          }}
          placeholder={t($ => $.layers.selectMaterial)}
          size="sm"
          preferredTypes={['sheet', 'volume']}
        />
      }
    />
  )
}

function StripedLayerFields({
  index,
  layer,
  onUpdateLayer
}: {
  index: number
  layer: Extract<LayerConfig, { type: 'striped' }>
  onUpdateLayer: (index: number, updates: Partial<Omit<StripedLayerConfig, 'type'>>) => void
}): React.JSX.Element {
  const { t } = useTranslation('config')
  return (
    <>
      <Field
        label={t($ => $.layers.direction)}
        control={
          <Select.Root
            value={layer.direction}
            onValueChange={value => {
              onUpdateLayer(index, { direction: value as StripeDirection })
            }}
          >
            <Select.Trigger />
            <Select.Content>
              <Select.Item value="perpendicular">{t($ => $.layers.directions.perpendicular)}</Select.Item>
              <Select.Item value="colinear">{t($ => $.layers.directions.colinear)}</Select.Item>
              <Select.Item value="diagonal">{t($ => $.layers.directions.diagonal)}</Select.Item>
            </Select.Content>
          </Select.Root>
        }
      />
      <div className="grid grid-cols-[auto_auto_auto_1fr] items-center gap-x-2 gap-y-2">
        <span className="text-sm">{t($ => $.layers.stripe)}</span>
        <LengthField
          value={layer.stripeWidth}
          onChange={value => {
            onUpdateLayer(index, { stripeWidth: value })
          }}
          unit="mm"
          size="sm"
          style={{ width: '8em' }}
        >
          <TextField.Slot title={t($ => $.common.width)} side="left" className="pr-0 pl-1">
            <WidthIcon />
          </TextField.Slot>
        </LengthField>

        <span className="text-sm">{t($ => $.common.materialLabel)}</span>
        <MaterialSelectWithEdit
          value={layer.stripeMaterial}
          onValueChange={material => {
            if (!material) return
            onUpdateLayer(index, { stripeMaterial: material })
          }}
          placeholder={t($ => $.layers.selectMaterial)}
          size="sm"
          preferredTypes={['dimensional']}
        />

        <span className="text-sm">{t($ => $.layers.gap)}</span>
        <LengthField
          value={layer.gapWidth}
          onChange={value => {
            onUpdateLayer(index, { gapWidth: value })
          }}
          unit="mm"
          size="sm"
          style={{ width: '8em' }}
        >
          <TextField.Slot title={t($ => $.common.width)} side="left" className="pr-0 pl-1">
            <WidthIcon />
          </TextField.Slot>
        </LengthField>

        <span className="text-sm">{t($ => $.common.materialLabel)}</span>
        <MaterialSelectWithEdit
          value={layer.gapMaterial}
          allowEmpty
          emptyLabel={t($ => $.common.none)}
          onValueChange={material => {
            onUpdateLayer(index, { gapMaterial: material ?? undefined })
          }}
          placeholder={t($ => $.layers.selectMaterial)}
          size="sm"
          preferredTypes={['sheet', 'volume']}
        />
      </div>
    </>
  )
}
