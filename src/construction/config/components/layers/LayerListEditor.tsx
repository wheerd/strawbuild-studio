import {
  ChevronDownIcon,
  ChevronUpIcon,
  ColumnsIcon,
  HeightIcon,
  PlusIcon,
  SquareIcon,
  TrashIcon,
  WidthIcon
} from '@radix-ui/react-icons'
import { Card, DropdownMenu, Flex, Grid, IconButton, Select, Text, TextField, Tooltip } from '@radix-ui/themes'
import React, { useMemo } from 'react'

import type { LayerConfig, LayerType, StripeDirection } from '@/construction/layers/types'
import { MaterialSelectWithEdit } from '@/construction/materials/components/MaterialSelectWithEdit'
import type { MaterialId } from '@/construction/materials/material'
import { LengthField } from '@/shared/components/LengthField'
import { formatLength } from '@/shared/utils/formatting'

const DEFAULT_MATERIAL = '' as MaterialId

const stripeDirectionLabels: Record<StripeDirection, string> = {
  perpendicular: 'Perpendicular',
  colinear: 'Colinear',
  diagonal: 'Diagonal'
}

const sumThickness = (layers: LayerConfig[]): number =>
  layers.reduce((total, layer) => total + Number(layer.thickness ?? 0), 0)

const getDefaultLayer = (type: LayerType, thickness: number): LayerConfig =>
  type === 'monolithic'
    ? {
        type: 'monolithic',
        thickness,
        material: DEFAULT_MATERIAL
      }
    : {
        type: 'striped',
        thickness,
        direction: 'perpendicular',
        stripeWidth: 50,
        stripeMaterial: DEFAULT_MATERIAL,
        gapWidth: 50,
        gapMaterial: undefined
      }

interface LayerListEditorProps {
  title: string
  layers: LayerConfig[]
  onAddLayer: (layer: LayerConfig) => void
  onUpdateLayer: (index: number, updates: Partial<LayerConfig>) => void
  onRemoveLayer: (index: number) => void
  onMoveLayer: (fromIndex: number, toIndex: number) => void
  measurementInfo?: React.ReactNode
  addLabel?: string
  emptyHint?: string
  defaultThickness?: number
}

export function LayerListEditor({
  title,
  layers,
  onAddLayer,
  onUpdateLayer,
  onRemoveLayer,
  onMoveLayer,
  measurementInfo,
  addLabel = 'Add Layer',
  emptyHint = 'No layers yet',
  defaultThickness = 30
}: LayerListEditorProps): React.JSX.Element {
  const hasLayers = layers.length > 0
  const totalThickness = useMemo(() => sumThickness(layers), [layers])
  const newLayerThickness = useMemo(() => Math.max(defaultThickness || 0, 10), [defaultThickness])

  return (
    <Flex direction="column" gap="2">
      <Flex align="center" justify="between">
        <Flex align="center" gap="2">
          <Text size="2" weight="bold">
            {title}
          </Text>
          {measurementInfo}
          <Text size="1" color="gray">
            · {formatLength(totalThickness)}
          </Text>
        </Flex>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <IconButton title={addLabel} size="1" variant="soft">
              <PlusIcon />
            </IconButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Item onSelect={() => onAddLayer(getDefaultLayer('monolithic', newLayerThickness))}>
              Monolithic Layer
            </DropdownMenu.Item>
            <DropdownMenu.Item onSelect={() => onAddLayer(getDefaultLayer('striped', newLayerThickness))}>
              Striped Layer
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </Flex>

      {!hasLayers && (
        <Card variant="surface">
          <Flex align="center" justify="center" minHeight="3.5rem">
            <Text size="1" color="gray">
              {emptyHint}
            </Text>
          </Flex>
        </Card>
      )}

      {hasLayers && (
        <Flex direction="column" gap="2">
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
        </Flex>
      )}
    </Flex>
  )
}

interface LayerCardProps {
  index: number
  layer: LayerConfig
  isFirst: boolean
  isLast: boolean
  onMoveLayer: (fromIndex: number, toIndex: number) => void
  onUpdateLayer: (index: number, updates: Partial<LayerConfig>) => void
  onRemoveLayer: (index: number) => void
}

const LayerTypeIcon = ({ type }: { type: LayerType }) => (
  <Tooltip content={type === 'monolithic' ? 'Monolithic' : 'Striped'}>
    {type === 'monolithic' ? <SquareIcon width={16} height={16} /> : <ColumnsIcon width={16} height={16} />}
  </Tooltip>
)

function LayerCard({
  index,
  layer,
  isFirst,
  isLast,
  onMoveLayer,
  onUpdateLayer,
  onRemoveLayer
}: LayerCardProps): React.JSX.Element {
  return (
    <Card variant="surface" style={{ padding: '0.75rem' }}>
      <Flex direction="column" gap="2">
        <Flex align="center" justify="between">
          <Flex align="center" gap="2">
            <LayerTypeIcon type={layer.type} />
            <Text size="1" color="gray">
              Layer {index + 1}
            </Text>
            <LengthField
              value={layer.thickness}
              onChange={value => onUpdateLayer(index, { thickness: value })}
              unit="mm"
              size="1"
              style={{ width: '8em' }}
            >
              <TextField.Slot title="Thickness" side="left" className="pl-1 pr-0">
                <HeightIcon />
              </TextField.Slot>
            </LengthField>
          </Flex>

          <Flex gap="1">
            <IconButton
              size="1"
              variant="soft"
              onClick={() => onMoveLayer(index, index - 1)}
              disabled={isFirst}
              title="Move up"
            >
              <ChevronUpIcon />
            </IconButton>
            <IconButton
              size="1"
              variant="soft"
              onClick={() => onMoveLayer(index, index + 1)}
              disabled={isLast}
              title="Move down"
            >
              <ChevronDownIcon />
            </IconButton>
            <IconButton size="1" variant="soft" color="red" onClick={() => onRemoveLayer(index)} title="Remove layer">
              <TrashIcon />
            </IconButton>
          </Flex>
        </Flex>

        {layer.type === 'monolithic' && (
          <MonolithicLayerFields index={index} layer={layer} onUpdateLayer={onUpdateLayer} />
        )}

        {layer.type === 'striped' && <StripedLayerFields index={index} layer={layer} onUpdateLayer={onUpdateLayer} />}
      </Flex>
    </Card>
  )
}

function Field({ label, control }: { label: string; control: React.ReactNode }): React.JSX.Element {
  return (
    <Grid columns="auto 1fr" gap="2" align="center">
      <Text size="1" color="gray">
        {label}
      </Text>
      {control}
    </Grid>
  )
}

function MonolithicLayerFields({
  index,
  layer,
  onUpdateLayer
}: {
  index: number
  layer: Extract<LayerConfig, { type: 'monolithic' }>
  onUpdateLayer: (index: number, updates: Partial<LayerConfig>) => void
}): React.JSX.Element {
  return (
    <Field
      label="Material"
      control={
        <MaterialSelectWithEdit
          value={layer.material}
          onValueChange={material => {
            if (!material) return
            onUpdateLayer(index, { material })
          }}
          placeholder="Select material..."
          size="1"
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
  onUpdateLayer: (index: number, updates: Partial<LayerConfig>) => void
}): React.JSX.Element {
  return (
    <>
      <Field
        label="Direction"
        control={
          <Select.Root
            value={layer.direction}
            onValueChange={value => onUpdateLayer(index, { direction: value as StripeDirection })}
            size="1"
          >
            <Select.Trigger />
            <Select.Content>
              {Object.entries(stripeDirectionLabels).map(([value, label]) => (
                <Select.Item key={value} value={value}>
                  {label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        }
      />
      <Grid columns="auto auto auto 1fr" align="center" gapX="2" gapY="2">
        <Text size="1" color="gray">
          Stripe
        </Text>
        <LengthField
          value={layer.stripeWidth}
          onChange={value => onUpdateLayer(index, { stripeWidth: value })}
          unit="mm"
          size="1"
          style={{ width: '8em' }}
        >
          <TextField.Slot title="Width" side="left" className="pl-1 pr-0">
            <WidthIcon />
          </TextField.Slot>
        </LengthField>

        <Text size="1" color="gray">
          Material
        </Text>
        <MaterialSelectWithEdit
          value={layer.stripeMaterial}
          onValueChange={material => {
            if (!material) return
            onUpdateLayer(index, { stripeMaterial: material })
          }}
          placeholder="Select material..."
          size="1"
        />

        <Text size="1" color="gray">
          Gap
        </Text>
        <LengthField
          value={layer.gapWidth}
          onChange={value => onUpdateLayer(index, { gapWidth: value })}
          unit="mm"
          size="1"
          style={{ width: '8em' }}
        >
          <TextField.Slot title="Width" side="left" className="pl-1 pr-0">
            <WidthIcon />
          </TextField.Slot>
        </LengthField>

        <Text size="1" color="gray">
          Material
        </Text>
        <MaterialSelectWithEdit
          value={layer.gapMaterial}
          allowEmpty
          emptyLabel="None"
          onValueChange={material => onUpdateLayer(index, { gapMaterial: material ?? undefined })}
          placeholder="Select material..."
          size="1"
        />
      </Grid>
    </>
  )
}
