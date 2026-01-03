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
import {
  Card,
  Checkbox,
  DropdownMenu,
  Flex,
  Grid,
  IconButton,
  Select,
  Text,
  TextField,
  Tooltip
} from '@radix-ui/themes'
import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

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
    <Flex direction="column" gap="2">
      <Flex align="center" justify="between">
        <Flex align="center" gap="2">
          <Text size="2" weight="bold">
            {title}
          </Text>
          {measurementInfo}
          <Text size="1" color="gray">
            {t($ => $.layers.totalThicknessLabel, { thickness: totalThickness })}
          </Text>
        </Flex>
        <Flex gap="1">
          {layerCopySources && (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                <IconButton title={t($ => $.layers.copyFrom)} size="1" variant="soft">
                  <CopyIcon />
                </IconButton>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.Label>Copy from...</DropdownMenu.Label>
                {layerCopySources.map(({ name, totalThickness, layerSource }) => (
                  <DropdownMenu.Item key={name} onSelect={() => applyPreset(layerSource())}>
                    <Flex align="center" gap="2">
                      <Text>{name}</Text>
                      <Text size="1" color="gray">
                        · {formatLength(totalThickness)}
                      </Text>
                    </Flex>
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          )}

          {hasPresetMenu && (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                <IconButton title={t($ => $.layers.presetsLabel)} size="1" variant="soft">
                  <MagicWandIcon />
                </IconButton>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                {layerPresets.map(preset => (
                  <DropdownMenu.Item key={t(preset.nameKey)} onSelect={() => applyPreset(preset.layers)}>
                    <Flex align="center" gap="2">
                      <Text>{t(preset.nameKey)}</Text>
                      <Text size="1" color="gray">
                        · {formatLength(sumLayerThickness(preset.layers))}
                      </Text>
                    </Flex>
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          )}

          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <IconButton title={addLabel} size="1" variant="soft">
                <PlusIcon />
              </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item
                onSelect={() =>
                  onAddLayer(
                    getDefaultLayer(
                      'monolithic',
                      t($ => $.layers.defaultName_monolithic),
                      0
                    )
                  )
                }
              >
                <Flex align="center" gap="1">
                  <LayerTypeIcon type="monolithic" />
                  {t($ => $.layers.defaultName_monolithic)}
                </Flex>
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={() =>
                  onAddLayer(
                    getDefaultLayer(
                      'striped',
                      t($ => $.layers.defaultName_striped),
                      0
                    )
                  )
                }
              >
                <Flex align="center" gap="1">
                  <LayerTypeIcon type="striped" />
                  {t($ => $.layers.defaultName_striped)}
                </Flex>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </Flex>
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
        <Grid columns="1" gap="2" align="center" justify="center">
          <Flex justify="center">
            <Text size="1" color="gray">
              {beforeLabel}
            </Text>
          </Flex>
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
          <Flex justify="center">
            <Text size="1" color="gray">
              {afterLabel}
            </Text>
          </Flex>
        </Grid>
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
    <Card variant="surface" style={{ padding: '0.75rem' }}>
      <Flex direction="column" gap="2">
        <Grid columns="auto 1fr auto auto auto" align="center" gap="1">
          <LayerTypeIcon type={layer.type} />
          <TextField.Root
            title={t($ => $.common.name)}
            size="1"
            value={nameInput}
            onChange={event => setNameInput(event.target.value)}
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
            onChange={value => onUpdateLayer(index, { thickness: value })}
            unit="mm"
            size="1"
            style={{ width: '8em' }}
          >
            <TextField.Slot title={t($ => $.common.thickness)} side="left" className="pl-1 pr-0">
              <HeightIcon />
            </TextField.Slot>
          </LengthField>

          <Checkbox
            checked={layer.overlap}
            onCheckedChange={value => onUpdateLayer(index, { overlap: value === true })}
            title={t($ => $.layers.overlap)}
          />

          <Flex gap="1">
            <IconButton
              size="1"
              variant="soft"
              onClick={() => onMoveLayer(index, index - 1)}
              disabled={isFirst}
              title={t($ => $.layers.moveUp)}
            >
              <ChevronUpIcon />
            </IconButton>
            <IconButton
              size="1"
              variant="soft"
              onClick={() => onMoveLayer(index, index + 1)}
              disabled={isLast}
              title={t($ => $.layers.moveDown)}
            >
              <ChevronDownIcon />
            </IconButton>
            <IconButton
              size="1"
              variant="soft"
              color="red"
              onClick={() => onRemoveLayer(index)}
              title={t($ => $.layers.removeLayer)}
            >
              <TrashIcon />
            </IconButton>
          </Flex>
        </Grid>

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
          size="1"
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
            onValueChange={value => onUpdateLayer(index, { direction: value as StripeDirection })}
            size="1"
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
      <Grid columns="auto auto auto 1fr" align="center" gapX="2" gapY="2">
        <Text size="1" color="gray">
          {t($ => $.layers.stripe)}
        </Text>
        <LengthField
          value={layer.stripeWidth}
          onChange={value => onUpdateLayer(index, { stripeWidth: value })}
          unit="mm"
          size="1"
          style={{ width: '8em' }}
        >
          <TextField.Slot title={t($ => $.common.width)} side="left" className="pl-1 pr-0">
            <WidthIcon />
          </TextField.Slot>
        </LengthField>

        <Text size="1" color="gray">
          {t($ => $.common.materialLabel)}
        </Text>
        <MaterialSelectWithEdit
          value={layer.stripeMaterial}
          onValueChange={material => {
            if (!material) return
            onUpdateLayer(index, { stripeMaterial: material })
          }}
          placeholder={t($ => $.layers.selectMaterial)}
          size="1"
          preferredTypes={['dimensional']}
        />

        <Text size="1" color="gray">
          {t($ => $.layers.gap)}
        </Text>
        <LengthField
          value={layer.gapWidth}
          onChange={value => onUpdateLayer(index, { gapWidth: value })}
          unit="mm"
          size="1"
          style={{ width: '8em' }}
        >
          <TextField.Slot title={t($ => $.common.width)} side="left" className="pl-1 pr-0">
            <WidthIcon />
          </TextField.Slot>
        </LengthField>

        <Text size="1" color="gray">
          {t($ => $.common.materialLabel)}
        </Text>
        <MaterialSelectWithEdit
          value={layer.gapMaterial}
          allowEmpty
          emptyLabel={t($ => $.common.none)}
          onValueChange={material => onUpdateLayer(index, { gapMaterial: material ?? undefined })}
          placeholder={t($ => $.layers.selectMaterial)}
          size="1"
          preferredTypes={['sheet', 'volume']}
        />
      </Grid>
    </>
  )
}
