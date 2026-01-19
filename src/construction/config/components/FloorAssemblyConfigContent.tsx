import { CopyIcon, InfoCircledIcon, PlusIcon, ResetIcon, TrashIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import React, { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { FloorAssemblyId } from '@/building/model/ids'
import { useStoreysOrderedByLevel } from '@/building/store'
import { AlertDialog } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { TextField } from '@/components/ui/text-field'
import { Tooltip } from '@/components/ui/tooltip'
import type { FloorAssemblyConfig } from '@/construction/config'
import { type EntityId, useEntityLabel } from '@/construction/config/components/useEntityLabel'
import { useConfigActions, useDefaultFloorAssemblyId, useFloorAssemblies } from '@/construction/config/store'
import { type FloorAssemblyUsage, getFloorAssemblyUsage } from '@/construction/config/usage'
import { resolveFloorAssembly } from '@/construction/floors'
import type {
  FilledFloorConfig,
  FloorAssemblyType,
  FloorConfig,
  HangingJoistFloorConfig,
  JoistFloorConfig,
  MonolithicFloorConfig
} from '@/construction/floors/types'
import { CEILING_LAYER_PRESETS, FLOOR_LAYER_PRESETS } from '@/construction/layers/defaults'
import { MaterialSelectWithEdit } from '@/construction/materials/components/MaterialSelectWithEdit'
import type { MaterialId } from '@/construction/materials/material'
import { MeasurementInfo } from '@/editor/components/MeasurementInfo'
import { LengthField } from '@/shared/components/LengthField/LengthField'
import { useDebouncedInput } from '@/shared/hooks/useDebouncedInput'
import { useFormatters } from '@/shared/i18n/useFormatters'

import { FloorAssemblySelect } from './FloorAssemblySelect'
import { getFloorAssemblyTypeIcon } from './Icons'
import { type LayerCopySource, LayerListEditor } from './layers/LayerListEditor'

export interface FloorAssemblyConfigContentProps {
  initialSelectionId?: string
}

export function FloorAssemblyConfigContent({ initialSelectionId }: FloorAssemblyConfigContentProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const floorAssemblies = useFloorAssemblies()
  const storeys = useStoreysOrderedByLevel()
  const {
    addFloorAssembly,
    duplicateFloorAssembly,
    removeFloorAssembly,
    setDefaultFloorAssembly,
    resetFloorAssembliesToDefaults
  } = useConfigActions()

  const defaultConfigId = useDefaultFloorAssemblyId()

  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(() => {
    if (initialSelectionId && floorAssemblies.some(c => c.id === initialSelectionId)) {
      return initialSelectionId
    }
    return floorAssemblies.length > 0 ? floorAssemblies[0].id : null
  })

  const selectedConfig = floorAssemblies.find(c => c.id === selectedConfigId) ?? null

  const usage = useMemo(
    () =>
      selectedConfig
        ? getFloorAssemblyUsage(selectedConfig.id, storeys, defaultConfigId)
        : { isUsed: false, isDefault: false, storeyIds: [] },
    [selectedConfig, storeys, defaultConfigId]
  )

  const handleAddNew = useCallback(
    (type: FloorAssemblyType) => {
      const defaultMaterial = '' as MaterialId

      let name: string
      let config: FloorConfig
      if (type === 'monolithic') {
        name = t($ => $.floors.newName.monolithic)
        config = {
          type: 'monolithic',
          thickness: 180,
          material: defaultMaterial,
          layers: {
            topThickness: 0,
            topLayers: [],
            bottomThickness: 0,
            bottomLayers: []
          }
        }
      } else if (type === 'joist') {
        name = t($ => $.floors.newName.joist)
        config = {
          type: 'joist',
          constructionHeight: 240,
          joistThickness: 120,
          joistSpacing: 800,
          joistMaterial: defaultMaterial,
          wallBeamThickness: 120,
          wallBeamMaterial: defaultMaterial,
          wallBeamInsideOffset: 40,
          wallInfillMaterial: defaultMaterial,
          subfloorThickness: 22,
          subfloorMaterial: defaultMaterial,
          openingSideThickness: 60,
          openingSideMaterial: defaultMaterial,
          layers: {
            topThickness: 0,
            topLayers: [],
            bottomThickness: 0,
            bottomLayers: []
          }
        }
      } else if (type === 'filled') {
        name = t($ => $.floors.newName.filled)
        config = {
          type: 'filled',
          constructionHeight: 360,
          joistThickness: 60,
          joistSpacing: 500,
          joistMaterial: defaultMaterial,
          frameThickness: 60,
          frameMaterial: defaultMaterial,
          subfloorThickness: 22,
          subfloorMaterial: defaultMaterial,
          ceilingSheathingThickness: 22,
          ceilingSheathingMaterial: defaultMaterial,
          openingFrameThickness: 60,
          openingFrameMaterial: defaultMaterial,
          strawMaterial: undefined,
          layers: {
            topThickness: 0,
            topLayers: [],
            bottomThickness: 0,
            bottomLayers: []
          }
        }
      } else {
        name = t($ => $.floors.newName.hangingJoist)
        config = {
          type: 'hanging-joist',
          joistHeight: 240,
          joistThickness: 120,
          joistSpacing: 800,
          joistMaterial: defaultMaterial,
          subfloorThickness: 22,
          subfloorMaterial: defaultMaterial,
          openingSideThickness: 60,
          openingSideMaterial: defaultMaterial,
          verticalOffset: 0,
          layers: {
            topThickness: 0,
            topLayers: [],
            bottomThickness: 0,
            bottomLayers: []
          }
        }
      }

      const newConfig = addFloorAssembly(name, config)
      setSelectedConfigId(newConfig.id)
    },
    [addFloorAssembly]
  )

  const handleDuplicate = useCallback(() => {
    if (!selectedConfig) return

    const newName = t($ => $.floors.copyNameTemplate, {
      defaultValue: `{{name}} (Copy)`,
      name: selectedConfig.name
    })
    const duplicated = duplicateFloorAssembly(selectedConfig.id, newName)
    setSelectedConfigId(duplicated.id)
  }, [selectedConfig, duplicateFloorAssembly])

  const handleDelete = useCallback(() => {
    if (!selectedConfig || usage.isUsed) return

    try {
      const currentIndex = floorAssemblies.findIndex(c => c.id === selectedConfigId)
      removeFloorAssembly(selectedConfig.id)

      if (floorAssemblies.length > 1) {
        const nextConfig = floorAssemblies[currentIndex + 1] ?? floorAssemblies[currentIndex - 1]
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        setSelectedConfigId(nextConfig?.id ?? null)
      } else {
        setSelectedConfigId(null)
      }
    } catch (error) {
      // Handle error - probably tried to delete last config
      console.error('Failed to delete floor assembly:', error)
    }
  }, [selectedConfig, selectedConfigId, floorAssemblies, removeFloorAssembly, usage.isUsed])

  const handleReset = useCallback(() => {
    resetFloorAssembliesToDefaults()
    // Keep selection if it still exists after reset
    const stillExists = floorAssemblies.some(a => a.id === selectedConfigId)
    if (!stillExists && floorAssemblies.length > 0) {
      setSelectedConfigId(floorAssemblies[0].id)
    }
  }, [resetFloorAssembliesToDefaults, selectedConfigId, floorAssemblies])

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Selector + Actions */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2 items-end">
          <div className="flex flex-col gap-1 grow">
            <FloorAssemblySelect
              value={selectedConfigId as FloorAssemblyId | undefined}
              onValueChange={value => {
                setSelectedConfigId(value)
              }}
              showDefaultIndicator
              defaultConfigId={defaultConfigId}
            />
          </div>

          <DropdownMenu>
            <DropdownMenu.Trigger>
              <Button size="icon" title={t($ => $.common.addNew)}>
                <PlusIcon />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item
                onSelect={() => {
                  handleAddNew('monolithic')
                }}
              >
                <div className="flex items-center gap-1">
                  {React.createElement(getFloorAssemblyTypeIcon('monolithic'))}
                  {t($ => $.floors.types.monolithic)}
                </div>
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={() => {
                  handleAddNew('joist')
                }}
              >
                <div className="flex items-center gap-1">
                  {React.createElement(getFloorAssemblyTypeIcon('joist'))}
                  {t($ => $.floors.types.joist)}
                </div>
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={() => {
                  handleAddNew('filled')
                }}
              >
                <div className="flex items-center gap-1">
                  {React.createElement(getFloorAssemblyTypeIcon('filled'))}
                  {t($ => $.floors.types.straw)}
                </div>
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={() => {
                  handleAddNew('hanging-joist')
                }}
              >
                <div className="flex items-center gap-1">
                  {React.createElement(getFloorAssemblyTypeIcon('hanging-joist'))}
                  {t($ => $.floors.types.hangingJoist)}
                </div>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu>

          <Button
            size="icon"
            onClick={handleDuplicate}
            disabled={!selectedConfig}
            title={t($ => $.common.duplicate)}
            variant="soft"
          >
            <CopyIcon />
          </Button>

          <AlertDialog.Root>
            <AlertDialog.Trigger>
              <Button
                size="icon"
                disabled={!selectedConfig || usage.isUsed || floorAssemblies.length === 1}
                className="text-destructive"
                title={
                  !selectedConfig
                    ? t($ => $.floors.delete.noConfigSelected)
                    : floorAssemblies.length === 1
                      ? t($ => $.floors.delete.cannotDeleteLast)
                      : usage.isUsed
                        ? t($ => $.floors.delete.cannotDeleteInUse)
                        : t($ => $.common.delete)
                }
              >
                <TrashIcon />
              </Button>
            </AlertDialog.Trigger>
            <AlertDialog.Content>
              <AlertDialog.Title>{t($ => $.floors.delete.confirmTitle)}</AlertDialog.Title>
              <AlertDialog.Description>
                {t($ => $.floors.delete.confirm, { name: selectedConfig?.name })}
              </AlertDialog.Description>
              <div className="flex gap-3 mt-4 justify-end">
                <AlertDialog.Cancel>
                  <Button variant="soft" className="text-gray-900">
                    {t($ => $.common.cancel)}
                  </Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action>
                  <Button variant="destructive" onClick={handleDelete}>
                    {t($ => $.common.delete)}
                  </Button>
                </AlertDialog.Action>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Root>

          <AlertDialog.Root>
            <AlertDialog.Trigger>
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
              <AlertDialog.Title>{t($ => $.floors.reset.title)}</AlertDialog.Title>
              <AlertDialog.Description>{t($ => $.floors.reset.confirm)}</AlertDialog.Description>
              <div className="flex gap-3 mt-4 justify-end">
                <AlertDialog.Cancel>
                  <Button variant="soft" className="text-gray-900">
                    {t($ => $.common.cancel)}
                  </Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action>
                  <Button variant="destructive" onClick={handleReset}>
                    {t($ => $.common.reset)}
                  </Button>
                </AlertDialog.Action>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Root>
        </div>
      </div>
      {/* Form */}
      {selectedConfig && <ConfigForm assembly={selectedConfig} />}
      {!selectedConfig && floorAssemblies.length === 0 && (
        <div className="justify-center items-center p-5">
          <span className="text-gray-900">{t($ => $.floors.emptyList)}</span>
        </div>
      )}
      {/* Defaults Section */}
      <Separator />
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-[auto_1fr] gap-2 gap-x-3 items-center">
          <div className="flex items-center gap-1">
            <Label.Root>
              <span className="text-base font-medium ">{t($ => $.floors.defaultFloorAssembly)}</span>
            </Label.Root>
            <MeasurementInfo highlightedAssembly="floorAssembly" />
          </div>
          <FloorAssemblySelect value={defaultConfigId} onValueChange={setDefaultFloorAssembly} />
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

function UsageDisplay({ usage }: { usage: FloorAssemblyUsage }): React.JSX.Element {
  const { t } = useTranslation('config')

  return (
    <div className="grid grid-cols-[auto_1fr] gap-2 gap-x-3 items-center">
      <Label.Root>
        <span className="text-base font-medium ">{t($ => $.usage.usedBy)}</span>
      </Label.Root>
      <div className="flex gap-1 flex-wrap">
        {usage.isDefault && (
          <Badge variant="soft" color="blue">
            {t($ => $.usage.globalDefault_floor)}
          </Badge>
        )}
        {usage.storeyIds.map(id => (
          <UsageBadge key={id} id={id} />
        ))}
      </div>
    </div>
  )
}

function ConfigForm({ assembly }: { assembly: FloorAssemblyConfig }): React.JSX.Element {
  const { t } = useTranslation('config')
  const { formatLength } = useFormatters()
  const { updateFloorAssemblyName, updateFloorAssemblyConfig } = useConfigActions()

  const nameKey = assembly.nameKey

  const nameInput = useDebouncedInput(
    nameKey ? t(nameKey) : assembly.name,
    (name: string) => {
      updateFloorAssemblyName(assembly.id, name)
    },
    {
      debounceMs: 1000
    }
  )

  const handleUpdateConfig = useCallback(
    (updates: Partial<FloorConfig>) => {
      updateFloorAssemblyConfig(assembly.id, updates)
    },
    [assembly.id, updateFloorAssemblyConfig]
  )

  const totalThickness = useMemo(
    () => formatLength(resolveFloorAssembly(assembly).totalThickness),
    [assembly, formatLength]
  )

  return (
    <div
      className="flex flex-col      gap-3      p-3"
      style={{ border: '1px solid var(--color-gray-600)', borderRadius: 'var(--radius-2)' }}
    >
      <div className="grid grid-cols-2 gap-2 gap-x-3 items-center">
        <div className="grid grid-cols-[auto_1fr] gap-x-2 items-center">
          <Label.Root>
            <span className="text-base font-medium ">{t($ => $.common.name)}</span>
          </Label.Root>
          <TextField.Root
            value={nameInput.value}
            onChange={e => {
              nameInput.handleChange(e.target.value)
            }}
            onBlur={nameInput.handleBlur}
            onKeyDown={nameInput.handleKeyDown}
            placeholder={t($ => $.common.placeholders.name)}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 gap-x-3 items-center">
          <div className="flex gap-2 items-center">
            <Label.Root>
              <span className="text-base font-medium ">{t($ => $.common.type)}</span>
            </Label.Root>
            <div className="flex gap-2 items-center">
              {React.createElement(getFloorAssemblyTypeIcon(assembly.type))}
              <span className="text-base ">
                {assembly.type === 'monolithic'
                  ? t($ => $.floors.types.monolithic)
                  : assembly.type === 'joist'
                    ? t($ => $.floors.types.joist)
                    : assembly.type === 'hanging-joist'
                      ? t($ => $.floors.types.hangingJoist)
                      : t($ => $.floors.types.straw)}
              </span>
            </div>
          </div>

          <div className="flex gap-2 items-center">
            <Label.Root>
              <span className="text-base font-medium ">{t($ => $.common.totalThickness)}</span>
            </Label.Root>
            <span className="text-base ">{totalThickness}</span>
          </div>
        </div>
      </div>

      <Separator />

      {assembly.type === 'monolithic' && <MonolithicConfigFields config={assembly} onUpdate={handleUpdateConfig} />}
      {assembly.type === 'joist' && <JoistConfigFields config={assembly} onUpdate={handleUpdateConfig} />}
      {assembly.type === 'filled' && <FilledConfigFields config={assembly} onUpdate={handleUpdateConfig} />}
      {assembly.type === 'hanging-joist' && (
        <HangingJoistConfigFields config={assembly} onUpdate={handleUpdateConfig} />
      )}

      <Separator />

      <LayersFields assemblyId={assembly.id} config={assembly} />
    </div>
  )
}

function MonolithicConfigFields({
  config,
  onUpdate
}: {
  config: MonolithicFloorConfig
  onUpdate: (updates: Partial<MonolithicFloorConfig>) => void
}) {
  const { t } = useTranslation('config')
  return (
    <>
      <h3>{t($ => $.floors.types.monolithic)}</h3>
      <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-2 gap-x-3 items-center">
        <Label.Root>
          <span className="text-base font-medium ">{t($ => $.common.materialLabel)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.material}
          onValueChange={material => {
            if (!material) return
            onUpdate({ material })
          }}
          placeholder={t($ => $.common.placeholders.selectMaterial)}
          preferredTypes={['sheet', 'volume']}
        />

        <div className="flex items-center gap-1">
          <Label.Root>
            <span className="text-base font-medium ">{t($ => $.common.thickness)}</span>
          </Label.Root>
          <MeasurementInfo highlightedPart="floorConstruction" />
        </div>
        <LengthField
          value={config.thickness}
          onChange={thickness => {
            onUpdate({ thickness })
          }}
          unit="mm"
        />
      </div>
    </>
  )
}

function JoistConfigFields({
  config,
  onUpdate
}: {
  config: JoistFloorConfig
  onUpdate: (updates: Partial<JoistFloorConfig>) => void
}) {
  const { t } = useTranslation('config')
  return (
    <>
      <h3>{t($ => $.floors.types.joist)}</h3>

      {/* Beam Height - Full Width */}
      <div className="grid grid-cols-[auto_1fr] gap-2 gap-x-3 items-center">
        <div className="flex items-center gap-1">
          <Label.Root>
            <span className="text-base font-medium ">{t($ => $.floors.labels.beamHeight)}</span>
          </Label.Root>
          <Tooltip content={t($ => $.floors.tips.beamHeight)}>
            <Button size="icon" style={{ cursor: 'help' }} className="rounded-full" variant="ghost">
              <InfoCircledIcon width={12} height={12} />
            </Button>
          </Tooltip>
        </div>
        <LengthField
          value={config.constructionHeight}
          onChange={constructionHeight => {
            onUpdate({ constructionHeight })
          }}
          unit="mm"
        />
      </div>

      <Separator />

      {/* Joists Section */}
      <h2>{t($ => $.floors.sections.joists)}</h2>
      <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-2 gap-x-3 items-center">
        <Label.Root>
          <span className="text-base font-medium ">{t($ => $.common.materialLabel)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.joistMaterial}
          onValueChange={joistMaterial => {
            if (!joistMaterial) return
            onUpdate({ joistMaterial })
          }}
          placeholder={t($ => $.common.placeholders.selectMaterial)}
          preferredTypes={['dimensional']}
        />

        <Label.Root>
          <span className="text-base font-medium ">{t($ => $.common.thickness)}</span>
        </Label.Root>
        <LengthField
          value={config.joistThickness}
          onChange={joistThickness => {
            onUpdate({ joistThickness })
          }}
          unit="mm"
        />

        <Label.Root>
          <span className="text-base font-medium ">{t($ => $.common.spacing)}</span>
        </Label.Root>
        <LengthField
          value={config.joistSpacing}
          onChange={joistSpacing => {
            onUpdate({ joistSpacing })
          }}
          unit="mm"
        />
      </div>

      <Separator />

      {/* Wall Beams Section */}
      <h2>{t($ => $.floors.sections.wallBeams)}</h2>
      <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-2 gap-x-3 items-center">
        <Label.Root>
          <span className="text-base font-medium ">{t($ => $.common.materialLabel)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.wallBeamMaterial}
          onValueChange={wallBeamMaterial => {
            if (!wallBeamMaterial) return
            onUpdate({ wallBeamMaterial })
          }}
          placeholder={t($ => $.common.placeholders.selectMaterial)}
          preferredTypes={['dimensional']}
        />

        <Label.Root>
          <span className="text-base font-medium ">{t($ => $.common.thickness)}</span>
        </Label.Root>
        <LengthField
          value={config.wallBeamThickness}
          onChange={wallBeamThickness => {
            onUpdate({ wallBeamThickness })
          }}
          unit="mm"
        />

        <Label.Root>
          <span className="text-base font-medium ">{t($ => $.floors.labels.wallBeamInsideOffset)}</span>
        </Label.Root>
        <LengthField
          value={config.wallBeamInsideOffset}
          onChange={wallBeamInsideOffset => {
            onUpdate({ wallBeamInsideOffset })
          }}
          unit="mm"
        />

        <Label.Root>
          <span className="text-base font-medium ">{t($ => $.common.infillMaterial)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.wallInfillMaterial}
          onValueChange={wallInfillMaterial => {
            if (!wallInfillMaterial) return
            onUpdate({ wallInfillMaterial })
          }}
          placeholder={t($ => $.common.placeholders.selectMaterial)}
        />
      </div>

      <Separator />

      {/* Subfloor Section */}
      <h2>{t($ => $.floors.sections.subfloor)}</h2>
      <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-2 gap-x-3 items-center">
        <Label.Root>
          <span className="text-base font-medium ">{t($ => $.common.materialLabel)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.subfloorMaterial}
          onValueChange={subfloorMaterial => {
            if (!subfloorMaterial) return
            onUpdate({ subfloorMaterial })
          }}
          placeholder={t($ => $.common.placeholders.selectMaterial)}
          preferredTypes={['sheet']}
        />

        <Label.Root>
          <span className="text-base font-medium ">{t($ => $.common.thickness)}</span>
        </Label.Root>
        <LengthField
          value={config.subfloorThickness}
          onChange={subfloorThickness => {
            onUpdate({ subfloorThickness })
          }}
          unit="mm"
        />
      </div>

      <Separator />

      {/* Opening Sides Section */}
      <h2>{t($ => $.floors.sections.openingSides)}</h2>
      <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-2 gap-x-3 items-center">
        <Label.Root>
          <span className="text-base font-medium ">{t($ => $.common.materialLabel)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.openingSideMaterial}
          onValueChange={openingSideMaterial => {
            if (!openingSideMaterial) return
            onUpdate({ openingSideMaterial })
          }}
          placeholder={t($ => $.common.placeholders.selectMaterial)}
          preferredTypes={['dimensional']}
        />

        <Label.Root>
          <span className="text-base font-medium ">{t($ => $.common.thickness)}</span>
        </Label.Root>
        <LengthField
          value={config.openingSideThickness}
          onChange={openingSideThickness => {
            onUpdate({ openingSideThickness })
          }}
          unit="mm"
        />
      </div>
    </>
  )
}

function FilledConfigFields({
  config,
  onUpdate
}: {
  config: FilledFloorConfig
  onUpdate: (updates: Partial<FilledFloorConfig>) => void
}) {
  const { t } = useTranslation('config')
  return (
    <>
      <h3>{t($ => $.floors.types.straw)}</h3>

      <div className="grid grid-cols-[auto_1fr] gap-2 gap-x-3 items-center">
        <div className="flex items-center gap-1">
          <Label.Root>
            <span className="text-base font-medium ">{t($ => $.floors.labels.constructionHeight)}</span>
          </Label.Root>
          <Tooltip content={t($ => $.floors.tips.constructionHeight)}>
            <Button size="icon" style={{ cursor: 'help' }} className="rounded-full" variant="ghost">
              <InfoCircledIcon width={12} height={12} />
            </Button>
          </Tooltip>
        </div>
        <LengthField
          value={config.constructionHeight}
          onChange={constructionHeight => {
            onUpdate({ constructionHeight })
          }}
          unit="mm"
        />
      </div>

      <Separator />

      {/* Joists Section */}
      <h2>{t($ => $.floors.sections.joists)}</h2>
      <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-2 gap-x-3 items-center">
        <Label.Root>
          <span className="text-base font-medium ">{t($ => $.common.materialLabel)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.joistMaterial}
          onValueChange={joistMaterial => {
            if (!joistMaterial) return
            onUpdate({ joistMaterial })
          }}
          placeholder={t($ => $.common.placeholders.selectMaterial)}
          preferredTypes={['dimensional']}
        />

        <Label.Root>
          <span className="text-base font-medium ">{t($ => $.common.thickness)}</span>
        </Label.Root>
        <LengthField
          value={config.joistThickness}
          onChange={joistThickness => {
            onUpdate({ joistThickness })
          }}
          unit="mm"
        />

        <Label.Root>
          <span className="text-base font-medium ">{t($ => $.common.spacing)}</span>
        </Label.Root>
        <LengthField
          value={config.joistSpacing}
          onChange={joistSpacing => {
            onUpdate({ joistSpacing })
          }}
          unit="mm"
        />
      </div>

      <Separator />

      {/* Frame Section */}
      <h2>{t($ => $.floors.sections.perimeterFrame)}</h2>
      <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-2 gap-x-3 items-center">
        <Label.Root>
          <span className="text-base font-medium ">{t($ => $.common.materialLabel)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.frameMaterial}
          onValueChange={frameMaterial => {
            if (!frameMaterial) return
            onUpdate({ frameMaterial })
          }}
          placeholder={t($ => $.common.placeholders.selectMaterial)}
          preferredTypes={['dimensional']}
        />

        <Label.Root>
          <span className="text-base font-medium ">{t($ => $.common.thickness)}</span>
        </Label.Root>
        <LengthField
          value={config.frameThickness}
          onChange={frameThickness => {
            onUpdate({ frameThickness })
          }}
          unit="mm"
        />
      </div>

      <Separator />

      {/* Subfloor Section */}
      <h2>{t($ => $.floors.sections.subfloor)}</h2>
      <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-2 gap-x-3 items-center">
        <Label.Root>
          <span className="text-base font-medium ">{t($ => $.common.materialLabel)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.subfloorMaterial}
          onValueChange={subfloorMaterial => {
            if (!subfloorMaterial) return
            onUpdate({ subfloorMaterial })
          }}
          placeholder={t($ => $.common.placeholders.selectMaterial)}
          preferredTypes={['sheet']}
        />

        <Label.Root>
          <span className="text-base font-medium ">{t($ => $.common.thickness)}</span>
        </Label.Root>
        <LengthField
          value={config.subfloorThickness}
          onChange={subfloorThickness => {
            onUpdate({ subfloorThickness })
          }}
          unit="mm"
        />
      </div>

      <Separator />

      {/* Ceiling Sheathing Section */}
      <h2>{t($ => $.floors.sections.ceilingSheathing)}</h2>
      <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-2 gap-x-3 items-center">
        <Label.Root>
          <span className="text-base font-medium ">{t($ => $.common.materialLabel)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.ceilingSheathingMaterial}
          onValueChange={ceilingSheathingMaterial => {
            if (!ceilingSheathingMaterial) return
            onUpdate({ ceilingSheathingMaterial })
          }}
          placeholder={t($ => $.common.placeholders.selectMaterial)}
          preferredTypes={['sheet']}
        />

        <Label.Root>
          <span className="text-base font-medium ">{t($ => $.common.thickness)}</span>
        </Label.Root>
        <LengthField
          value={config.ceilingSheathingThickness}
          onChange={ceilingSheathingThickness => {
            onUpdate({ ceilingSheathingThickness })
          }}
          unit="mm"
        />
      </div>

      <Separator />

      {/* Opening Frame Section */}
      <h2>{t($ => $.floors.sections.openingFrame)}</h2>
      <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-2 gap-x-3 items-center">
        <Label.Root>
          <span className="text-base font-medium ">{t($ => $.common.materialLabel)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.openingFrameMaterial}
          onValueChange={openingFrameMaterial => {
            if (!openingFrameMaterial) return
            onUpdate({ openingFrameMaterial })
          }}
          placeholder={t($ => $.common.placeholders.selectMaterial)}
          preferredTypes={['dimensional']}
        />

        <Label.Root>
          <span className="text-base font-medium ">{t($ => $.common.thickness)}</span>
        </Label.Root>
        <LengthField
          value={config.openingFrameThickness}
          onChange={openingFrameThickness => {
            onUpdate({ openingFrameThickness })
          }}
          unit="mm"
        />
      </div>

      <Separator />

      {/* Straw Infill Section */}
      <h2>{t($ => $.floors.sections.strawInfill)}</h2>
      <div className="grid grid-cols-[auto_1fr] gap-2 gap-x-3 items-center">
        <div className="flex items-center gap-1">
          <Label.Root>
            <span className="text-base font-medium ">{t($ => $.common.strawMaterialOverride)}</span>
          </Label.Root>
          <Tooltip content={t($ => $.floors.tips.strawMaterialOverride)}>
            <Button size="icon" style={{ cursor: 'help' }} className="rounded-full" variant="ghost">
              <InfoCircledIcon width={12} height={12} />
            </Button>
          </Tooltip>
        </div>
        <MaterialSelectWithEdit
          value={config.strawMaterial ?? null}
          allowEmpty
          emptyLabel={t($ => $.common.useGlobalStrawSettings)}
          onValueChange={strawMaterial => {
            onUpdate({ strawMaterial: strawMaterial ?? undefined })
          }}
          placeholder={t($ => $.common.placeholders.selectMaterial)}
          preferredTypes={['strawbale']}
        />
      </div>
    </>
  )
}

function HangingJoistConfigFields({
  config,
  onUpdate
}: {
  config: HangingJoistFloorConfig
  onUpdate: (updates: Partial<HangingJoistFloorConfig>) => void
}) {
  const { t } = useTranslation('config')
  return (
    <>
      <h3>{t($ => $.floors.types.hangingJoist)}</h3>

      {/* Joists Section */}
      <h2>{t($ => $.floors.sections.joists)}</h2>
      <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-2 gap-x-3 items-center">
        <Label.Root>
          <span className="text-base font-medium ">{t($ => $.common.materialLabel)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.joistMaterial}
          onValueChange={joistMaterial => {
            if (!joistMaterial) return
            onUpdate({ joistMaterial })
          }}
          placeholder={t($ => $.common.placeholders.selectMaterial)}
          preferredTypes={['dimensional']}
        />

        <div className="flex items-center gap-1">
          <Label.Root>
            <span className="text-base font-medium ">{t($ => $.common.height)}</span>
          </Label.Root>
          <Tooltip content={t($ => $.floors.tips.joistHeight)}>
            <Button size="icon" style={{ cursor: 'help' }} className="rounded-full" variant="ghost">
              <InfoCircledIcon width={12} height={12} />
            </Button>
          </Tooltip>
        </div>
        <LengthField
          value={config.joistHeight}
          onChange={joistHeight => {
            onUpdate({ joistHeight })
          }}
          unit="mm"
        />

        <Label.Root>
          <span className="text-base font-medium ">{t($ => $.common.thickness)}</span>
        </Label.Root>
        <LengthField
          value={config.joistThickness}
          onChange={joistThickness => {
            onUpdate({ joistThickness })
          }}
          unit="mm"
        />

        <Label.Root>
          <span className="text-base font-medium ">{t($ => $.common.spacing)}</span>
        </Label.Root>
        <LengthField
          value={config.joistSpacing}
          onChange={joistSpacing => {
            onUpdate({ joistSpacing })
          }}
          unit="mm"
        />
      </div>

      {/* Vertical Offset Section */}
      <div className="grid grid-cols-[auto_1fr] gap-2 gap-x-3 items-center">
        <div className="flex items-center gap-1">
          <Label.Root>
            <span className="text-base font-medium ">{t($ => $.floors.labels.verticalOffset)}</span>
          </Label.Root>
          <Tooltip content={t($ => $.floors.tips.verticalOffset)}>
            <Button size="icon" style={{ cursor: 'help' }} className="rounded-full" variant="ghost">
              <InfoCircledIcon width={12} height={12} />
            </Button>
          </Tooltip>
        </div>
        <LengthField
          value={config.verticalOffset}
          onChange={verticalOffset => {
            onUpdate({ verticalOffset })
          }}
          unit="mm"
        />
      </div>

      <Separator />

      {/* Subfloor Section */}
      <h2>{t($ => $.floors.sections.subfloor)}</h2>
      <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-2 gap-x-3 items-center">
        <Label.Root>
          <span className="text-base font-medium ">{t($ => $.common.materialLabel)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.subfloorMaterial}
          onValueChange={subfloorMaterial => {
            if (!subfloorMaterial) return
            onUpdate({ subfloorMaterial })
          }}
          placeholder={t($ => $.common.placeholders.selectMaterial)}
          preferredTypes={['sheet']}
        />

        <Label.Root>
          <span className="text-base font-medium ">{t($ => $.common.thickness)}</span>
        </Label.Root>
        <LengthField
          value={config.subfloorThickness}
          onChange={subfloorThickness => {
            onUpdate({ subfloorThickness })
          }}
          unit="mm"
        />
      </div>

      <Separator />

      {/* Opening Sides Section */}
      <h2>{t($ => $.floors.sections.openingSides)}</h2>
      <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-2 gap-x-3 items-center">
        <Label.Root>
          <span className="text-base font-medium ">{t($ => $.common.materialLabel)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.openingSideMaterial}
          onValueChange={openingSideMaterial => {
            if (!openingSideMaterial) return
            onUpdate({ openingSideMaterial })
          }}
          placeholder={t($ => $.common.placeholders.selectMaterial)}
          preferredTypes={['dimensional']}
        />

        <Label.Root>
          <span className="text-base font-medium ">{t($ => $.common.thickness)}</span>
        </Label.Root>
        <LengthField
          value={config.openingSideThickness}
          onChange={openingSideThickness => {
            onUpdate({ openingSideThickness })
          }}
          unit="mm"
        />
      </div>
    </>
  )
}

function LayersFields({ assemblyId, config }: { assemblyId: FloorAssemblyId; config: FloorConfig }) {
  const { t } = useTranslation('config')
  const {
    addFloorAssemblyTopLayer,
    setFloorAssemblyTopLayers,
    updateFloorAssemblyTopLayer,
    removeFloorAssemblyTopLayer,
    moveFloorAssemblyTopLayer,
    addFloorAssemblyBottomLayer,
    setFloorAssemblyBottomLayers,
    updateFloorAssemblyBottomLayer,
    removeFloorAssemblyBottomLayer,
    moveFloorAssemblyBottomLayer
  } = useConfigActions()

  const topLayers = config.layers.topLayers
  const displayedTopLayers = [...topLayers].reverse()
  const mapTopIndex = (displayIndex: number) => topLayers.length - 1 - displayIndex

  const allAssemblies = useFloorAssemblies()

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
  const bottomLayerSources = useMemo(
    () =>
      allAssemblies.map(
        a =>
          ({
            name: a.name,
            totalThickness: a.layers.bottomThickness,
            layerSource: () => a.layers.bottomLayers
          }) satisfies LayerCopySource
      ),
    [allAssemblies]
  )

  return (
    <div className="flex flex-col gap-3">
      <LayerListEditor
        title={t($ => $.floors.layers.topLayers)}
        measurementInfo={<MeasurementInfo highlightedPart="floorTopLayers" />}
        layers={displayedTopLayers}
        onAddLayer={layer => {
          addFloorAssemblyTopLayer(assemblyId, layer)
        }}
        onReplaceLayers={layers => {
          setFloorAssemblyTopLayers(assemblyId, layers)
        }}
        onUpdateLayer={(index, updates) => {
          updateFloorAssemblyTopLayer(assemblyId, mapTopIndex(index), updates)
        }}
        onRemoveLayer={index => {
          removeFloorAssemblyTopLayer(assemblyId, mapTopIndex(index))
        }}
        onMoveLayer={(fromIndex, toIndex) => {
          moveFloorAssemblyTopLayer(assemblyId, mapTopIndex(fromIndex), mapTopIndex(toIndex))
        }}
        addLabel={t($ => $.floors.layers.addTopLayer)}
        emptyHint={t($ => $.floors.layers.noTopLayers)}
        layerPresets={FLOOR_LAYER_PRESETS}
        layerCopySources={topLayerSources}
        beforeLabel={t($ => $.floors.layers.finishedTop)}
        afterLabel={t($ => $.floors.layers.floorConstruction)}
      />

      <Separator />

      <LayerListEditor
        title={t($ => $.floors.layers.bottomLayers)}
        measurementInfo={<MeasurementInfo highlightedPart="floorBottomLayers" />}
        layers={config.layers.bottomLayers}
        onAddLayer={layer => {
          addFloorAssemblyBottomLayer(assemblyId, layer)
        }}
        onReplaceLayers={layers => {
          setFloorAssemblyBottomLayers(assemblyId, layers)
        }}
        onUpdateLayer={(index, updates) => {
          updateFloorAssemblyBottomLayer(assemblyId, index, updates)
        }}
        onRemoveLayer={index => {
          removeFloorAssemblyBottomLayer(assemblyId, index)
        }}
        onMoveLayer={(fromIndex, toIndex) => {
          moveFloorAssemblyBottomLayer(assemblyId, fromIndex, toIndex)
        }}
        addLabel={t($ => $.floors.layers.addBottomLayer)}
        emptyHint={t($ => $.floors.layers.noBottomLayers)}
        layerPresets={CEILING_LAYER_PRESETS}
        layerCopySources={bottomLayerSources}
        beforeLabel={t($ => $.floors.layers.floorConstruction)}
        afterLabel={t($ => $.floors.layers.finishedBottom)}
      />
    </div>
  )
}
