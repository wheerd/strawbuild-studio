import { ChevronDown, ChevronUp, Columns, MoveHorizontal, MoveVertical, Square, Trash } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Select } from '@/components/ui/select'
import { TextField } from '@/components/ui/text-field'
import { Tooltip } from '@/components/ui/tooltip'
import type {
  LayerConfig,
  LayerType,
  MonolithicLayerConfig,
  StripeDirection,
  StripedLayerConfig
} from '@/construction/layers/types'
import { MaterialSelectWithEdit } from '@/construction/materials/components/MaterialSelectWithEdit'
import { LengthField } from '@/shared/components/LengthField'

interface LayerCardProps {
  index: number
  layer: LayerConfig
  isFirst: boolean
  isLast: boolean
  onMoveLayer: (fromIndex: number, toIndex: number) => void
  onUpdateLayer: (index: number, updates: Partial<Omit<LayerConfig, 'type'>>) => void
  onRemoveLayer: (index: number) => void
}

export const LayerTypeIcon = ({ type }: { type: LayerType }) => {
  const { t } = useTranslation('config')
  return (
    <Tooltip content={t($ => $.layers.types[type])}>
      {type === 'monolithic' ? <Square width={16} height={16} /> : <Columns width={16} height={16} />}
    </Tooltip>
  )
}

export function LayerCard({
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
    <Card variant="soft" className="p-3">
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
            className="w-[10em]"
          >
            <TextField.Slot title={t($ => $.common.thickness)} side="left" className="pr-0 pl-1">
              <MoveVertical className="size-5" />
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
              <ChevronUp />
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
              <ChevronDown />
            </Button>
            <Button
              size="icon-sm"
              variant="destructive"
              onClick={() => {
                onRemoveLayer(index)
              }}
              title={t($ => $.layers.removeLayer)}
            >
              <Trash />
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
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
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
          className="w-30"
        >
          <TextField.Slot title={t($ => $.common.width)} side="left" className="pr-0 pl-1">
            <MoveHorizontal className="size-5" />
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
          className="w-30"
        >
          <TextField.Slot title={t($ => $.common.width)} side="left" className="pr-0 pl-1">
            <MoveHorizontal className="size-5" />
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
