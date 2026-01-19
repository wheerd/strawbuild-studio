import { ComponentInstanceIcon, CopyIcon, PlusIcon, ResetIcon, SquareIcon, TrashIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import { AlertDialog, Badge, Button, DropdownMenu, IconButton, Separator, TextField } from '@radix-ui/themes'
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
    <div className="flex flex-col gap-3">
      <h2>{t($ => $.roofs.sections.monolithicConfiguration)}</h2>

      <div className="grid grid-cols-2 gap-2 gap-x-3">
        <div className="flex flex-col gap-1">
          <Label.Root>
            <span className="text-sm font-medium text-gray-900">{t($ => $.common.materialLabel)}</span>
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
        </div>

        <div className="flex flex-col gap-1">
          <Label.Root>
            <span className="text-sm font-medium text-gray-900">{t($ => $.common.thickness)}</span>
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
        </div>
      </div>
    </div>
  )
}

interface PurlinRoofConfigFormProps {
  config: PurlinRoofConfig
  onUpdate: (updates: Partial<PurlinRoofConfig>) => void
}

function PurlinRoofConfigForm({ config, onUpdate }: PurlinRoofConfigFormProps): React.JSX.Element {
  const { t } = useTranslation('config')
  return (
    <div className="flex flex-col gap-3">
      {/* Straw Configuration */}

      <h2>{t($ => $.roofs.sections.straw)}</h2>

      <div className="grid grid-cols-2 gap-2 gap-x-3">
        <div className="flex flex-col gap-1">
          <Label.Root>
            <span className="text-sm font-medium text-gray-900">{t($ => $.common.layerThickness)}</span>
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
        </div>

        <div className="flex flex-col gap-1">
          <Label.Root>
            <span className="text-sm font-medium text-gray-900">{t($ => $.common.strawMaterialOverride)}</span>
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
        </div>
      </div>

      <Separator size="4" />

      {/* Purlin Configuration */}
      <h2>{t($ => $.roofs.sections.purlins)}</h2>
      <div className="grid grid-cols-2 gap-2 gap-x-3">
        <div className="flex flex-col gap-1">
          <Label.Root>
            <span className="text-sm font-medium text-gray-900">{t($ => $.common.materialLabel)}</span>
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
        </div>

        <div className="flex flex-col gap-1">
          <Label.Root>
            <span className="text-sm font-medium text-gray-900">{t($ => $.common.height)}</span>
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
        </div>

        <div className="flex flex-col gap-1">
          <Label.Root>
            <span className="text-sm font-medium text-gray-900">{t($ => $.common.inset)}</span>
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
        </div>

        <div className="flex flex-col gap-1">
          <Label.Root>
            <span className="text-sm font-medium text-gray-900">{t($ => $.common.width)}</span>
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
        </div>

        <div className="flex flex-col gap-1">
          <Label.Root>
            <span className="text-sm font-medium text-gray-900">{t($ => $.common.spacing)}</span>
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
        </div>
      </div>

      <Separator size="4" />

      {/* Rafter Configuration */}
      <h2>{t($ => $.roofs.sections.rafters)}</h2>
      <div className="grid grid-cols-2 gap-2 gap-x-3">
        <div className="flex flex-col gap-1">
          <Label.Root>
            <span className="text-sm font-medium text-gray-900">{t($ => $.common.materialLabel)}</span>
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
        </div>

        <div className="flex flex-col gap-1">
          <Label.Root>
            <span className="text-sm font-medium text-gray-900">{t($ => $.common.width)}</span>
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
        </div>

        <div className="flex flex-col gap-1">
          <Label.Root>
            <span className="text-sm font-medium text-gray-900">{t($ => $.roofs.labels.spacingMin)}</span>
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
        </div>

        <div className="flex flex-col gap-1">
          <Label.Root>
            <span className="text-sm font-medium text-gray-900">{t($ => $.roofs.labels.spacingTarget)}</span>
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
        </div>
      </div>

      <Separator size="4" />

      <h2>{t($ => $.roofs.sections.decking)}</h2>

      <div className="grid grid-cols-2 gap-2 gap-x-3">
        <div className="flex flex-col gap-1">
          <Label.Root>
            <span className="text-sm font-medium text-gray-900">{t($ => $.common.materialLabel)}</span>
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
        </div>

        <div className="flex flex-col gap-1">
          <Label.Root>
            <span className="text-sm font-medium text-gray-900">{t($ => $.common.thickness)}</span>
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
        </div>
      </div>

      <Separator size="4" />

      <h2>{t($ => $.roofs.sections.ceilingSheathing)}</h2>

      <div className="grid grid-cols-2 gap-2 gap-x-3">
        <div className="flex flex-col gap-1">
          <Label.Root>
            <span className="text-sm font-medium text-gray-900">{t($ => $.common.materialLabel)}</span>
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
        </div>

        <div className="flex flex-col gap-1">
          <Label.Root>
            <span className="text-sm font-medium text-gray-900">{t($ => $.common.thickness)}</span>
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
        </div>
      </div>
    </div>
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
    <div className="flex flex-col gap-3">
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
    </div>
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
    <div
      className="flex flex-col
      gap-3
      p-3
      "
      style={{ border: '1px solid var(--gray-6)', borderRadius: 'var(--radius-2)' }}
    >
      {/* Basic Info - Full Width */}
      <div className="grid grid-cols-2 gap-2 gap-x-3 items-center">
        <div className="grid grid-cols-[auto_1fr] gap-x-2 items-center">
          <Label.Root>
            <span className="text-base font-medium text-gray-900">{t($ => $.common.name)}</span>
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
        </div>

        <div className="grid grid-cols-2 gap-2 gap-x-3 items-center">
          <div className="flex gap-2 items-center">
            <Label.Root>
              <span className="text-base font-medium text-gray-900">{t($ => $.common.type)}</span>
            </Label.Root>
            <div className="flex gap-2 items-center">
              {React.createElement(getRoofAssemblyTypeIcon(assembly.type))}
              <span className="text-base text-gray-900">{t($ => $.roofs.types[assembly.type])}</span>
            </div>
          </div>

          <div className="flex gap-2 items-center">
            <Label.Root>
              <span className="text-base font-medium text-gray-900">{t($ => $.common.totalThickness)}</span>
            </Label.Root>
            <span className="text-base text-gray-900">{totalThickness}</span>
          </div>
        </div>
      </div>
      <Separator size="4" />
      {/* Two Column Layout */}
      <div className="grid grid-cols-2 gap-4 style={{ gridTemplateColumns: '1fr 1fr' }}">
        {/* Left Column - Type-specific configuration */}
        <div className="flex flex-col gap-3">
          {assembly.type === 'monolithic' && <MonolithicRoofConfigForm config={assembly} onUpdate={updateConfig} />}
          {assembly.type === 'purlin' && <PurlinRoofConfigForm config={assembly} onUpdate={updateConfig} />}
        </div>

        {/* Right Column - Layer sections */}
        <div className="flex flex-col gap-3">
          <LayerSections assemblyId={assembly.id} config={assembly} />
        </div>
      </div>
    </div>
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
    <div className="flex flex-col gap-4" style={{ width: '100%' }}>
      {/* Selector + Actions */}
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex gap-2 items-end">
            <div className="flex flex-col gap-1 grow-1">
              <RoofAssemblySelect
                value={selectedAssemblyId as RoofAssemblyId | undefined}
                onValueChange={setSelectedAssemblyId}
                showDefaultIndicator
                defaultAssemblyId={defaultAssemblyId}
              />
            </div>

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
                  <div className="flex items-center gap-1">
                    <SquareIcon />
                    {t($ => $.roofs.types.monolithic)}
                  </div>
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={() => {
                    handleAddNew('purlin')
                  }}
                >
                  <div className="flex items-center gap-1">
                    <ComponentInstanceIcon />
                    {t($ => $.roofs.types.purlin)}
                  </div>
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
                <div className="flex gap-3 mt-4 justify-end">
                  <AlertDialog.Cancel>
                    <Button variant="soft" className="text-gray-900">
                      {t($ => $.common.cancel)}
                    </Button>
                  </AlertDialog.Cancel>
                  <AlertDialog.Action>
                    <Button variant="solid" color="red" onClick={handleDelete}>
                      {t($ => $.common.delete)}
                    </Button>
                  </AlertDialog.Action>
                </div>
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
                <div className="flex gap-3 mt-4 justify-end">
                  <AlertDialog.Cancel>
                    <Button variant="soft" className="text-gray-900">
                      {t($ => $.common.cancel)}
                    </Button>
                  </AlertDialog.Cancel>
                  <AlertDialog.Action>
                    <Button variant="solid" color="red" onClick={handleReset}>
                      {t($ => $.common.reset)}
                    </Button>
                  </AlertDialog.Action>
                </div>
              </AlertDialog.Content>
            </AlertDialog.Root>
          </div>

          <div className="grid grid-cols-[auto_1fr] gap-2 items-center">
            <Label.Root>
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-gray-900">{t($ => $.roofs.defaultRoofAssembly)}</span>
                <RoofMeasurementInfo highlightedAssembly="roofAssembly" />
              </div>
            </Label.Root>
            <RoofAssemblySelect
              value={defaultAssemblyId}
              onValueChange={value => {
                setDefaultRoofAssembly(value)
              }}
              placeholder={t($ => $.common.placeholders.selectDefault)}
              size="2"
            />
          </div>
        </div>
      </div>
      {/* Form */}
      {selectedAssembly && <ConfigForm assembly={selectedAssembly} />}
      {!selectedAssembly && roofAssemblies.length === 0 && (
        <div className="justify-center items-center p-5">
          <span className="text-gray-900">{t($ => $.roofs.emptyList)}</span>
        </div>
      )}
      {usage.isUsed && <UsageDisplay usage={usage} />}
    </div>
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
    <div className="grid grid-cols-[auto_1fr] gap-2 gap-x-3 items-center">
      <Label.Root>
        <span className="text-base font-medium text-gray-900">{t($ => $.usage.usedBy)}</span>
      </Label.Root>
      <div className="flex gap-1 flex-wrap">
        {usage.isDefault && (
          <Badge size="2" variant="soft" color="blue">
            {t($ => $.usage.globalDefault_roof)}
          </Badge>
        )}
        {usage.storeyIds.map(id => (
          <UsageBadge key={id} id={id} />
        ))}
      </div>
    </div>
  )
}
