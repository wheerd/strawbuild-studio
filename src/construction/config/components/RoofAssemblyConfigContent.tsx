import { ComponentInstanceIcon, CopyIcon, PlusIcon, ResetIcon, SquareIcon, TrashIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import {
  AlertDialog,
  Badge,
  Button,
  DropdownMenu,
  Flex,
  Grid,
  Heading,
  IconButton,
  Separator,
  Text,
  TextField
} from '@radix-ui/themes'
import React, { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { RoofAssemblyId } from '@/building/model/ids'
import { useRoofs } from '@/building/store'
import { type EntityId, useEntityLabel } from '@/construction/config/components/useEntityLabel'
import { useConfigActions, useDefaultRoofAssemblyId, useRoofAssemblies } from '@/construction/config/store'
import type { RoofAssemblyConfig } from '@/construction/config/types'
import { type RoofAssemblyUsage, getRoofAssemblyUsage } from '@/construction/config/usage'
import { CEILING_LAYER_PRESETS, ROOF_LAYER_PRESETS } from '@/construction/layers/defaults'
import { MaterialSelectWithEdit } from '@/construction/materials/components/MaterialSelectWithEdit'
import type { MaterialId } from '@/construction/materials/material'
import { resolveRoofAssembly } from '@/construction/roofs'
import type { MonolithicRoofConfig, PurlinRoofConfig, RoofAssemblyType, RoofConfig } from '@/construction/roofs/types'
import { RoofMeasurementInfo } from '@/editor/components/RoofMeasurementInfo'
import { LengthField } from '@/shared/components/LengthField/LengthField'
import { useDebouncedInput } from '@/shared/hooks/useDebouncedInput'
import { useFormatters } from '@/shared/i18n/useFormatters'

import { getRoofAssemblyTypeIcon } from './Icons'
import { RoofAssemblySelect } from './RoofAssemblySelect'
import { type LayerCopySource, LayerListEditor } from './layers/LayerListEditor'

interface MonolithicRoofConfigFormProps {
  config: MonolithicRoofConfig
  onUpdate: (updates: Partial<MonolithicRoofConfig>) => void
}

function MonolithicRoofConfigForm({ config, onUpdate }: MonolithicRoofConfigFormProps): React.JSX.Element {
  const { t } = useTranslation('config')
  return (
    <Flex direction="column" gap="3">
      <Heading size="2">{t($ => $.roofs.sections.monolithicConfiguration)}</Heading>

      <Grid columns="2" gap="2" gapX="3">
        <Flex direction="column" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              {t($ => $.common.materialLabel)}
            </Text>
          </Label.Root>
          <MaterialSelectWithEdit
            value={config.material}
            onValueChange={material => {
              if (!material) return
              onUpdate({ ...config, material })
            }}
            size="1"
            preferredTypes={['sheet']}
          />
        </Flex>

        <Flex direction="column" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              {t($ => $.common.thickness)}
            </Text>
          </Label.Root>
          <LengthField
            value={config.thickness}
            onChange={value => {
              onUpdate({ ...config, thickness: value })
            }}
            unit="cm"
            min={0}
            step={10}
            size="1"
          />
        </Flex>
      </Grid>
    </Flex>
  )
}

interface PurlinRoofConfigFormProps {
  config: PurlinRoofConfig
  onUpdate: (updates: Partial<PurlinRoofConfig>) => void
}

function PurlinRoofConfigForm({ config, onUpdate }: PurlinRoofConfigFormProps): React.JSX.Element {
  const { t } = useTranslation('config')
  return (
    <Flex direction="column" gap="3">
      {/* Straw Configuration */}

      <Heading size="2">{t($ => $.roofs.sections.straw)}</Heading>

      <Grid columns="2" gap="2" gapX="3">
        <Flex direction="column" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              {t($ => $.common.layerThickness)}
            </Text>
          </Label.Root>
          <LengthField
            value={config.thickness}
            onChange={value => {
              onUpdate({ ...config, thickness: value })
            }}
            unit="cm"
            min={0}
            step={10}
            size="1"
          />
        </Flex>

        <Flex direction="column" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              {t($ => $.common.strawMaterialOverride)}
            </Text>
          </Label.Root>
          <MaterialSelectWithEdit
            value={config.strawMaterial ?? null}
            allowEmpty
            emptyLabel={t($ => $.common.useGlobalStrawSettings)}
            onValueChange={strawMaterial => {
              onUpdate({ ...config, strawMaterial: strawMaterial ?? undefined })
            }}
            size="1"
            preferredTypes={['strawbale']}
          />
        </Flex>
      </Grid>

      <Separator size="4" />

      {/* Purlin Configuration */}
      <Heading size="2">{t($ => $.roofs.sections.purlins)}</Heading>
      <Grid columns="2" gap="2" gapX="3">
        <Flex direction="column" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              {t($ => $.common.materialLabel)}
            </Text>
          </Label.Root>
          <MaterialSelectWithEdit
            value={config.purlinMaterial}
            onValueChange={material => {
              if (!material) return
              onUpdate({ ...config, purlinMaterial: material })
            }}
            size="1"
            preferredTypes={['dimensional']}
          />
        </Flex>

        <Flex direction="column" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              {t($ => $.common.height)}
            </Text>
          </Label.Root>
          <LengthField
            value={config.purlinHeight}
            onChange={value => {
              onUpdate({ ...config, purlinHeight: value })
            }}
            unit="cm"
            min={0}
            step={10}
            size="1"
          />
        </Flex>

        <Flex direction="column" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              {t($ => $.common.inset)}
            </Text>
          </Label.Root>
          <LengthField
            value={config.purlinInset}
            onChange={value => {
              onUpdate({ ...config, purlinInset: value })
            }}
            unit="mm"
            min={0}
            size="1"
          />
        </Flex>

        <Flex direction="column" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              {t($ => $.common.width)}
            </Text>
          </Label.Root>
          <LengthField
            value={config.purlinWidth}
            onChange={value => {
              onUpdate({ ...config, purlinWidth: value })
            }}
            unit="cm"
            min={0}
            step={10}
            size="1"
          />
        </Flex>

        <Flex direction="column" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              {t($ => $.common.spacing)}
            </Text>
          </Label.Root>
          <LengthField
            value={config.purlinSpacing}
            onChange={value => {
              onUpdate({ ...config, purlinSpacing: value })
            }}
            unit="cm"
            min={0}
            step={100}
            size="1"
          />
        </Flex>
      </Grid>

      <Separator size="4" />

      {/* Rafter Configuration */}
      <Heading size="2">{t($ => $.roofs.sections.rafters)}</Heading>
      <Grid columns="2" gap="2" gapX="3">
        <Flex direction="column" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              {t($ => $.common.materialLabel)}
            </Text>
          </Label.Root>
          <MaterialSelectWithEdit
            value={config.rafterMaterial}
            onValueChange={material => {
              if (!material) return
              onUpdate({ ...config, rafterMaterial: material })
            }}
            size="1"
            preferredTypes={['dimensional']}
          />
        </Flex>

        <Flex direction="column" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              {t($ => $.common.width)}
            </Text>
          </Label.Root>
          <LengthField
            value={config.rafterWidth}
            onChange={value => {
              onUpdate({ ...config, rafterWidth: value })
            }}
            unit="cm"
            min={0}
            step={10}
            size="1"
          />
        </Flex>

        <Flex direction="column" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              {t($ => $.roofs.labels.spacingMin)}
            </Text>
          </Label.Root>
          <LengthField
            value={config.rafterSpacingMin}
            onChange={value => {
              onUpdate({ ...config, rafterSpacingMin: value })
            }}
            unit="cm"
            min={0}
            step={10}
            size="1"
          />
        </Flex>

        <Flex direction="column" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              {t($ => $.roofs.labels.spacingTarget)}
            </Text>
          </Label.Root>
          <LengthField
            value={config.rafterSpacing}
            onChange={value => {
              onUpdate({ ...config, rafterSpacing: value })
            }}
            unit="cm"
            min={0}
            step={100}
            size="1"
          />
        </Flex>
      </Grid>

      <Separator size="4" />

      <Heading size="2">{t($ => $.roofs.sections.decking)}</Heading>

      <Grid columns="2" gap="2" gapX="3">
        <Flex direction="column" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              {t($ => $.common.materialLabel)}
            </Text>
          </Label.Root>
          <MaterialSelectWithEdit
            value={config.deckingMaterial}
            onValueChange={material => {
              if (!material) return
              onUpdate({ ...config, deckingMaterial: material })
            }}
            size="1"
            preferredTypes={['sheet']}
          />
        </Flex>

        <Flex direction="column" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              {t($ => $.common.thickness)}
            </Text>
          </Label.Root>
          <LengthField
            value={config.deckingThickness}
            onChange={value => {
              onUpdate({ ...config, deckingThickness: value })
            }}
            unit="mm"
            min={0}
            size="1"
          />
        </Flex>
      </Grid>

      <Separator size="4" />

      <Heading size="2">{t($ => $.roofs.sections.ceilingSheathing)}</Heading>

      <Grid columns="2" gap="2" gapX="3">
        <Flex direction="column" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              {t($ => $.common.materialLabel)}
            </Text>
          </Label.Root>
          <MaterialSelectWithEdit
            value={config.ceilingSheathingMaterial}
            onValueChange={material => {
              if (!material) return
              onUpdate({ ...config, ceilingSheathingMaterial: material })
            }}
            size="1"
            preferredTypes={['sheet']}
          />
        </Flex>

        <Flex direction="column" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              {t($ => $.common.thickness)}
            </Text>
          </Label.Root>
          <LengthField
            value={config.ceilingSheathingThickness}
            onChange={value => {
              onUpdate({ ...config, ceilingSheathingThickness: value })
            }}
            unit="mm"
            min={0}
            size="1"
          />
        </Flex>
      </Grid>
    </Flex>
  )
}

interface LayerSectionsProps {
  assemblyId: RoofAssemblyId
  config: RoofAssemblyConfig
}

function LayerSections({ assemblyId, config }: LayerSectionsProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const {
    addRoofAssemblyInsideLayer,
    setRoofAssemblyInsideLayers,
    updateRoofAssemblyInsideLayer,
    removeRoofAssemblyInsideLayer,
    moveRoofAssemblyInsideLayer,
    addRoofAssemblyTopLayer,
    setRoofAssemblyTopLayers,
    updateRoofAssemblyTopLayer,
    removeRoofAssemblyTopLayer,
    moveRoofAssemblyTopLayer,
    addRoofAssemblyOverhangLayer,
    setRoofAssemblyOverhangLayers,
    updateRoofAssemblyOverhangLayer,
    removeRoofAssemblyOverhangLayer,
    moveRoofAssemblyOverhangLayer
  } = useConfigActions()

  const allAssemblies = useRoofAssemblies()

  const topLayerSources = useMemo(
    () =>
      allAssemblies.map(
        a =>
          ({
            name: a.name,
            totalThickness: a.layers.topThickness,
            layerSource: () => a.layers.topLayers
          }) satisfies LayerCopySource
      ),
    [allAssemblies]
  )
  const insideLayerSources = useMemo(
    () =>
      allAssemblies.map(
        a =>
          ({
            name: a.name,
            totalThickness: a.layers.insideThickness,
            layerSource: () => a.layers.insideLayers
          }) satisfies LayerCopySource
      ),
    [allAssemblies]
  )
  const overhangLayerSources = useMemo(
    () =>
      allAssemblies.map(
        a =>
          ({
            name: a.name,
            totalThickness: a.layers.overhangThickness,
            layerSource: () => a.layers.overhangLayers
          }) satisfies LayerCopySource
      ),
    [allAssemblies]
  )

  // Reverse top layers for display (top layer = outside, shown first)
  const topLayers = config.layers.topLayers
  const displayedTopLayers = [...topLayers].reverse()
  const mapTopIndex = (displayIndex: number) => topLayers.length - 1 - displayIndex

  return (
    <Flex direction="column" gap="3">
      <LayerListEditor
        title={t($ => $.roofs.layers.insideLayers)}
        layers={config.layers.insideLayers}
        measurementInfo={<RoofMeasurementInfo highlightedPart="roofBottomLayers" />}
        onAddLayer={layer => {
          addRoofAssemblyInsideLayer(assemblyId, layer)
        }}
        onReplaceLayers={layers => {
          setRoofAssemblyInsideLayers(assemblyId, layers)
        }}
        onUpdateLayer={(index, updates) => {
          updateRoofAssemblyInsideLayer(assemblyId, index, updates)
        }}
        onRemoveLayer={index => {
          removeRoofAssemblyInsideLayer(assemblyId, index)
        }}
        onMoveLayer={(fromIndex, toIndex) => {
          moveRoofAssemblyInsideLayer(assemblyId, fromIndex, toIndex)
        }}
        addLabel={t($ => $.roofs.addInsideLayer)}
        emptyHint={t($ => $.roofs.noInsideLayers)}
        layerPresets={CEILING_LAYER_PRESETS}
        layerCopySources={insideLayerSources}
        beforeLabel={t($ => $.roofs.roofConstruction)}
        afterLabel={t($ => $.roofs.layers.insideLayers)}
      />

      <Separator size="4" />

      <LayerListEditor
        title={t($ => $.roofs.topLayers)}
        layers={displayedTopLayers}
        measurementInfo={<RoofMeasurementInfo highlightedPart="roofTopLayers" />}
        onAddLayer={layer => {
          addRoofAssemblyTopLayer(assemblyId, layer)
        }}
        onReplaceLayers={layers => {
          setRoofAssemblyTopLayers(assemblyId, layers)
        }}
        onUpdateLayer={(index, updates) => {
          updateRoofAssemblyTopLayer(assemblyId, mapTopIndex(index), updates)
        }}
        onRemoveLayer={index => {
          removeRoofAssemblyTopLayer(assemblyId, mapTopIndex(index))
        }}
        onMoveLayer={(fromIndex, toIndex) => {
          moveRoofAssemblyTopLayer(assemblyId, mapTopIndex(fromIndex), mapTopIndex(toIndex))
        }}
        addLabel={t($ => $.roofs.addTopLayer)}
        emptyHint={t($ => $.roofs.noTopLayers)}
        layerPresets={ROOF_LAYER_PRESETS}
        layerCopySources={topLayerSources}
        beforeLabel={t($ => $.roofs.finishedTop)}
        afterLabel={t($ => $.roofs.roofConstruction)}
      />

      <Separator size="4" />

      <LayerListEditor
        title={t($ => $.roofs.layers.overhangLayers)}
        layers={config.layers.overhangLayers}
        measurementInfo={<RoofMeasurementInfo highlightedPart="overhangBottomLayers" />}
        onAddLayer={layer => {
          addRoofAssemblyOverhangLayer(assemblyId, layer)
        }}
        onReplaceLayers={layers => {
          setRoofAssemblyOverhangLayers(assemblyId, layers)
        }}
        onUpdateLayer={(index, updates) => {
          updateRoofAssemblyOverhangLayer(assemblyId, index, updates)
        }}
        onRemoveLayer={index => {
          removeRoofAssemblyOverhangLayer(assemblyId, index)
        }}
        onMoveLayer={(fromIndex, toIndex) => {
          moveRoofAssemblyOverhangLayer(assemblyId, fromIndex, toIndex)
        }}
        addLabel={t($ => $.roofs.addOverhangLayer)}
        emptyHint={t($ => $.roofs.noOverhangLayers)}
        layerPresets={[]}
        layerCopySources={overhangLayerSources}
        beforeLabel={t($ => $.roofs.overhang)}
        afterLabel={t($ => $.roofs.outside)}
      />
    </Flex>
  )
}

interface ConfigFormProps {
  assembly: RoofAssemblyConfig
}

function ConfigForm({ assembly }: ConfigFormProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const { formatLength } = useFormatters()
  const { updateRoofAssemblyName, updateRoofAssemblyConfig } = useConfigActions()

  const nameKey = assembly.nameKey

  const nameInput = useDebouncedInput(
    nameKey ? t(nameKey) : assembly.name,
    (name: string) => {
      updateRoofAssemblyName(assembly.id, name)
    },
    {
      debounceMs: 1000
    }
  )

  const updateConfig = useCallback(
    (updates: Partial<RoofConfig>) => {
      updateRoofAssemblyConfig(assembly.id, updates)
    },
    [assembly.id, updateRoofAssemblyConfig]
  )

  const totalThickness = useMemo(() => {
    const assemblyImpl = resolveRoofAssembly(assembly)
    return formatLength(assemblyImpl.totalThickness)
  }, [assembly, formatLength])

  return (
    <Flex
      direction="column"
      gap="3"
      p="3"
      style={{ border: '1px solid var(--gray-6)', borderRadius: 'var(--radius-2)' }}
    >
      {/* Basic Info - Full Width */}
      <Grid columns="1fr 1fr" gap="2" gapX="3" align="center">
        <Grid columns="auto 1fr" gapX="2" align="center">
          <Label.Root>
            <Text size="2" weight="medium" color="gray">
              {t($ => $.common.name)}
            </Text>
          </Label.Root>
          <TextField.Root
            value={nameInput.value}
            onChange={e => {
              nameInput.handleChange(e.target.value)
            }}
            onBlur={nameInput.handleBlur}
            onKeyDown={nameInput.handleKeyDown}
            placeholder={t($ => $.common.placeholders.name)}
            size="2"
          />
        </Grid>

        <Grid columns="1fr 1fr" gap="2" gapX="3" align="center">
          <Flex gap="2" align="center">
            <Label.Root>
              <Text size="2" weight="medium" color="gray">
                {t($ => $.common.type)}
              </Text>
            </Label.Root>
            <Flex gap="2" align="center">
              {React.createElement(getRoofAssemblyTypeIcon(assembly.type))}
              <Text size="2" color="gray">
                {t($ => $.roofs.types[assembly.type])}
              </Text>
            </Flex>
          </Flex>

          <Flex gap="2" align="center">
            <Label.Root>
              <Text size="2" weight="medium" color="gray">
                {t($ => $.common.totalThickness)}
              </Text>
            </Label.Root>
            <Text size="2" color="gray">
              {totalThickness}
            </Text>
          </Flex>
        </Grid>
      </Grid>
      <Separator size="4" />
      {/* Two Column Layout */}
      <Grid columns="2" gap="4" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* Left Column - Type-specific configuration */}
        <Flex direction="column" gap="3">
          {assembly.type === 'monolithic' && <MonolithicRoofConfigForm config={assembly} onUpdate={updateConfig} />}
          {assembly.type === 'purlin' && <PurlinRoofConfigForm config={assembly} onUpdate={updateConfig} />}
        </Flex>

        {/* Right Column - Layer sections */}
        <Flex direction="column" gap="3">
          <LayerSections assemblyId={assembly.id} config={assembly} />
        </Flex>
      </Grid>
    </Flex>
  )
}

export interface RoofAssemblyConfigContentProps {
  initialSelectionId?: string
}

export function RoofAssemblyConfigContent({ initialSelectionId }: RoofAssemblyConfigContentProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const roofAssemblies = useRoofAssemblies()
  const roofs = useRoofs()
  const {
    addRoofAssembly,
    duplicateRoofAssembly,
    removeRoofAssembly,
    setDefaultRoofAssembly,
    resetRoofAssembliesToDefaults
  } = useConfigActions()

  const defaultAssemblyId = useDefaultRoofAssemblyId()

  const [selectedAssemblyId, setSelectedAssemblyId] = useState<string | null>(() => {
    if (initialSelectionId && roofAssemblies.some(a => a.id === initialSelectionId)) {
      return initialSelectionId
    }
    return roofAssemblies.length > 0 ? roofAssemblies[0].id : null
  })

  const selectedAssembly = roofAssemblies.find(a => a.id === selectedAssemblyId) ?? null

  const usage = useMemo(
    () =>
      selectedAssembly
        ? getRoofAssemblyUsage(selectedAssembly.id, Object.values(roofs), defaultAssemblyId)
        : { isUsed: false, isDefault: false, storeyIds: [] },
    [selectedAssembly, roofs, defaultAssemblyId]
  )

  const handleAddNew = useCallback(
    (type: RoofAssemblyType) => {
      const defaultMaterial = '' as MaterialId

      let name: string
      let config: RoofConfig
      if (type === 'monolithic') {
        name = t($ => $.roofs.newName.monolithic)
        config = {
          type: 'monolithic',
          thickness: 180,
          material: defaultMaterial,
          infillMaterial: defaultMaterial,
          layers: {
            insideThickness: 0,
            insideLayers: [],
            topThickness: 0,
            topLayers: [],
            overhangThickness: 0,
            overhangLayers: []
          }
        }
      } else {
        name = t($ => $.roofs.newName.purlin)
        config = {
          type: 'purlin',
          thickness: 360,
          purlinMaterial: defaultMaterial,
          purlinHeight: 200,
          purlinWidth: 120,
          purlinSpacing: 6000,
          purlinInset: 20,
          infillMaterial: defaultMaterial,
          rafterMaterial: defaultMaterial,
          rafterWidth: 60,
          rafterSpacingMin: 70,
          rafterSpacing: 500,
          ceilingSheathingMaterial: defaultMaterial,
          ceilingSheathingThickness: 40,
          deckingMaterial: defaultMaterial,
          deckingThickness: 22,
          layers: {
            insideThickness: 0,
            insideLayers: [],
            topThickness: 0,
            topLayers: [],
            overhangThickness: 0,
            overhangLayers: []
          }
        }
      }

      const newAssembly = addRoofAssembly(name, config)
      setSelectedAssemblyId(newAssembly.id)
    },
    [addRoofAssembly]
  )

  const handleDuplicate = useCallback(() => {
    if (!selectedAssembly) return

    const newName = t($ => $.roofs.copyNameTemplate, {
      defaultValue: `{{name}} (Copy)`,
      name: selectedAssembly.name
    })
    const duplicated = duplicateRoofAssembly(selectedAssembly.id, newName)
    setSelectedAssemblyId(duplicated.id)
  }, [selectedAssembly, duplicateRoofAssembly])

  const handleDelete = useCallback(() => {
    if (!selectedAssembly || usage.isUsed) return

    const currentIndex = roofAssemblies.findIndex(a => a.id === selectedAssemblyId)
    removeRoofAssembly(selectedAssembly.id)

    if (roofAssemblies.length > 1) {
      const nextAssembly = roofAssemblies[currentIndex + 1] ?? roofAssemblies[currentIndex - 1]
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      setSelectedAssemblyId(nextAssembly?.id ?? null)
    } else {
      setSelectedAssemblyId(null)
    }
  }, [selectedAssembly, selectedAssemblyId, roofAssemblies, removeRoofAssembly, usage.isUsed])

  const handleReset = useCallback(() => {
    resetRoofAssembliesToDefaults()
    // Keep selection if it still exists after reset
    const stillExists = roofAssemblies.some(a => a.id === selectedAssemblyId)
    if (!stillExists && roofAssemblies.length > 0) {
      setSelectedAssemblyId(roofAssemblies[0].id)
    }
  }, [resetRoofAssembliesToDefaults, selectedAssemblyId, roofAssemblies])

  return (
    <Flex direction="column" gap="4" style={{ width: '100%' }}>
      {/* Selector + Actions */}
      <Flex direction="column" gap="2">
        <Grid columns="2" gap="2">
          <Flex gap="2" align="end">
            <Flex direction="column" gap="1" flexGrow="1">
              <RoofAssemblySelect
                value={selectedAssemblyId as RoofAssemblyId | undefined}
                onValueChange={setSelectedAssemblyId}
                showDefaultIndicator
                defaultAssemblyId={defaultAssemblyId}
              />
            </Flex>

            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                <IconButton title={t($ => $.common.addNew)}>
                  <PlusIcon />
                </IconButton>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.Item
                  onSelect={() => {
                    handleAddNew('monolithic')
                  }}
                >
                  <Flex align="center" gap="1">
                    <SquareIcon />
                    {t($ => $.roofs.types.monolithic)}
                  </Flex>
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={() => {
                    handleAddNew('purlin')
                  }}
                >
                  <Flex align="center" gap="1">
                    <ComponentInstanceIcon />
                    {t($ => $.roofs.types.purlin)}
                  </Flex>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>

            <IconButton
              onClick={handleDuplicate}
              disabled={!selectedAssembly}
              title={t($ => $.common.duplicate)}
              variant="soft"
            >
              <CopyIcon />
            </IconButton>

            <AlertDialog.Root>
              <AlertDialog.Trigger>
                <IconButton
                  disabled={!selectedAssembly || usage.isUsed}
                  color="red"
                  title={usage.isUsed ? t($ => $.common.inUseCannotDelete) : t($ => $.common.delete)}
                >
                  <TrashIcon />
                </IconButton>
              </AlertDialog.Trigger>
              <AlertDialog.Content>
                <AlertDialog.Title>{t($ => $.roofs.deleteTitle)}</AlertDialog.Title>
                <AlertDialog.Description>
                  {t($ => $.roofs.deleteConfirm, { name: selectedAssembly?.name })}
                </AlertDialog.Description>
                <Flex gap="3" mt="4" justify="end">
                  <AlertDialog.Cancel>
                    <Button variant="soft" color="gray">
                      {t($ => $.common.cancel)}
                    </Button>
                  </AlertDialog.Cancel>
                  <AlertDialog.Action>
                    <Button variant="solid" color="red" onClick={handleDelete}>
                      {t($ => $.common.delete)}
                    </Button>
                  </AlertDialog.Action>
                </Flex>
              </AlertDialog.Content>
            </AlertDialog.Root>

            <AlertDialog.Root>
              <AlertDialog.Trigger>
                <IconButton color="red" variant="outline" title={t($ => $.common.resetToDefaults)}>
                  <ResetIcon />
                </IconButton>
              </AlertDialog.Trigger>
              <AlertDialog.Content>
                <AlertDialog.Title>{t($ => $.roofs.resetTitle)}</AlertDialog.Title>
                <AlertDialog.Description>{t($ => $.roofs.resetConfirm)}</AlertDialog.Description>
                <Flex gap="3" mt="4" justify="end">
                  <AlertDialog.Cancel>
                    <Button variant="soft" color="gray">
                      {t($ => $.common.cancel)}
                    </Button>
                  </AlertDialog.Cancel>
                  <AlertDialog.Action>
                    <Button variant="solid" color="red" onClick={handleReset}>
                      {t($ => $.common.reset)}
                    </Button>
                  </AlertDialog.Action>
                </Flex>
              </AlertDialog.Content>
            </AlertDialog.Root>
          </Flex>

          <Grid columns="auto 1fr" gap="2" align="center">
            <Label.Root>
              <Flex align="center" gap="1">
                <Text size="1" weight="medium" color="gray">
                  {t($ => $.roofs.defaultRoofAssembly)}
                </Text>
                <RoofMeasurementInfo highlightedAssembly="roofAssembly" />
              </Flex>
            </Label.Root>
            <RoofAssemblySelect
              value={defaultAssemblyId}
              onValueChange={value => {
                setDefaultRoofAssembly(value)
              }}
              placeholder={t($ => $.common.placeholders.selectDefault)}
              size="2"
            />
          </Grid>
        </Grid>
      </Flex>
      {/* Form */}
      {selectedAssembly && <ConfigForm assembly={selectedAssembly} />}
      {!selectedAssembly && roofAssemblies.length === 0 && (
        <Flex justify="center" align="center" p="5">
          <Text color="gray">{t($ => $.roofs.emptyList)}</Text>
        </Flex>
      )}
      {usage.isUsed && <UsageDisplay usage={usage} />}
    </Flex>
  )
}

function UsageBadge({ id }: { id: EntityId }) {
  const label = useEntityLabel(id)
  return (
    <Badge key={id} size="2" variant="soft">
      {label}
    </Badge>
  )
}

function UsageDisplay({ usage }: { usage: RoofAssemblyUsage }): React.JSX.Element {
  const { t } = useTranslation('config')

  return (
    <Grid columns="auto 1fr" gap="2" gapX="3" align="center">
      <Label.Root>
        <Text size="2" weight="medium" color="gray">
          {t($ => $.usage.usedBy)}
        </Text>
      </Label.Root>
      <Flex gap="1" wrap="wrap">
        {usage.isDefault && (
          <Badge size="2" variant="soft" color="blue">
            {t($ => $.usage.globalDefault_roof)}
          </Badge>
        )}
        {usage.storeyIds.map(id => (
          <UsageBadge key={id} id={id} />
        ))}
      </Flex>
    </Grid>
  )
}
