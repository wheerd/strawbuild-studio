import { CopyIcon, InfoCircledIcon, PlusIcon, ResetIcon, TrashIcon } from '@radix-ui/react-icons'
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
  TextField,
  Tooltip
} from '@radix-ui/themes'
import React, { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { FloorAssemblyId } from '@/building/model/ids'
import { useStoreysOrderedByLevel } from '@/building/store'
import type { FloorAssemblyConfig } from '@/construction/config'
import { type EntityId, useEntityLabel } from '@/construction/config/components/useEntityLabel'
import { useConfigActions, useDefaultFloorAssemblyId, useFloorAssemblies } from '@/construction/config/store'
import { type FloorAssemblyUsage, getFloorAssemblyUsage } from '@/construction/config/usage'
import { resolveFloorAssembly } from '@/construction/floors'
import type {
  FilledFloorConfig,
  FloorAssemblyType,
  FloorConfig,
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
      } else {
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
    <Flex direction="column" gap="4" width="100%">
      {/* Selector + Actions */}
      <Flex direction="column" gap="2">
        <Flex gap="2" align="end">
          <Flex direction="column" gap="1" flexGrow="1">
            <FloorAssemblySelect
              value={selectedConfigId as FloorAssemblyId | undefined}
              onValueChange={value => {
                setSelectedConfigId(value)
              }}
              showDefaultIndicator
              defaultConfigId={defaultConfigId}
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
                  {React.createElement(getFloorAssemblyTypeIcon('monolithic'))}
                  {t($ => $.floors.types.monolithic)}
                </Flex>
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={() => {
                  handleAddNew('joist')
                }}
              >
                <Flex align="center" gap="1">
                  {React.createElement(getFloorAssemblyTypeIcon('joist'))}
                  {t($ => $.floors.types.joist)}
                </Flex>
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={() => {
                  handleAddNew('filled')
                }}
              >
                <Flex align="center" gap="1">
                  {React.createElement(getFloorAssemblyTypeIcon('filled'))}
                  {t($ => $.floors.types.straw)}
                </Flex>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>

          <IconButton
            onClick={handleDuplicate}
            disabled={!selectedConfig}
            title={t($ => $.common.duplicate)}
            variant="soft"
          >
            <CopyIcon />
          </IconButton>

          <AlertDialog.Root>
            <AlertDialog.Trigger>
              <IconButton
                disabled={!selectedConfig || usage.isUsed || floorAssemblies.length === 1}
                color="red"
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
              </IconButton>
            </AlertDialog.Trigger>
            <AlertDialog.Content>
              <AlertDialog.Title>{t($ => $.floors.delete.confirmTitle)}</AlertDialog.Title>
              <AlertDialog.Description>
                {t($ => $.floors.delete.confirm, { name: selectedConfig?.name })}
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
              <AlertDialog.Title>{t($ => $.floors.reset.title)}</AlertDialog.Title>
              <AlertDialog.Description>{t($ => $.floors.reset.confirm)}</AlertDialog.Description>
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
      </Flex>
      {/* Form */}
      {selectedConfig && <ConfigForm assembly={selectedConfig} />}
      {!selectedConfig && floorAssemblies.length === 0 && (
        <Flex justify="center" align="center" p="5">
          <Text color="gray">{t($ => $.floors.emptyList)}</Text>
        </Flex>
      )}
      {/* Defaults Section */}
      <Separator size="4" />
      <Flex direction="column" gap="3">
        <Grid columns="auto 1fr" gap="2" gapX="3" align="center">
          <Flex align="center" gap="1">
            <Label.Root>
              <Text size="2" weight="medium" color="gray">
                {t($ => $.floors.defaultFloorAssembly)}
              </Text>
            </Label.Root>
            <MeasurementInfo highlightedAssembly="floorAssembly" />
          </Flex>
          <FloorAssemblySelect value={defaultConfigId} onValueChange={setDefaultFloorAssembly} size="2" />
        </Grid>

        {usage.isUsed && <UsageDisplay usage={usage} />}
      </Flex>
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

function UsageDisplay({ usage }: { usage: FloorAssemblyUsage }): React.JSX.Element {
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
            {t($ => $.usage.globalDefault_floor)}
          </Badge>
        )}
        {usage.storeyIds.map(id => (
          <UsageBadge key={id} id={id} />
        ))}
      </Flex>
    </Grid>
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
    <Flex
      direction="column"
      gap="3"
      p="3"
      style={{ border: '1px solid var(--gray-6)', borderRadius: 'var(--radius-2)' }}
    >
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
              {React.createElement(getFloorAssemblyTypeIcon(assembly.type))}
              <Text size="2" color="gray">
                {assembly.type === 'monolithic'
                  ? t($ => $.floors.types.monolithic)
                  : assembly.type === 'joist'
                    ? t($ => $.floors.types.joist)
                    : t($ => $.floors.types.straw)}
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

      {assembly.type === 'monolithic' && <MonolithicConfigFields config={assembly} onUpdate={handleUpdateConfig} />}
      {assembly.type === 'joist' && <JoistConfigFields config={assembly} onUpdate={handleUpdateConfig} />}
      {assembly.type === 'filled' && <FilledConfigFields config={assembly} onUpdate={handleUpdateConfig} />}

      <Separator size="4" />

      <LayersFields assemblyId={assembly.id} config={assembly} />
    </Flex>
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
      <Heading size="3">{t($ => $.floors.types.monolithic)}</Heading>
      <Grid columns="auto 1fr auto 1fr" gap="2" gapX="3" align="center">
        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            {t($ => $.common.materialLabel)}
          </Text>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.material}
          onValueChange={material => {
            if (!material) return
            onUpdate({ material })
          }}
          placeholder={t($ => $.common.placeholders.selectMaterial)}
          size="2"
          preferredTypes={['sheet', 'volume']}
        />

        <Flex align="center" gap="1">
          <Label.Root>
            <Text size="2" weight="medium" color="gray">
              {t($ => $.common.thickness)}
            </Text>
          </Label.Root>
          <MeasurementInfo highlightedPart="floorConstruction" />
        </Flex>
        <LengthField
          value={config.thickness}
          onChange={thickness => {
            onUpdate({ thickness })
          }}
          unit="mm"
          size="2"
        />
      </Grid>
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
      <Heading size="3">{t($ => $.floors.types.joist)}</Heading>

      {/* Beam Height - Full Width */}
      <Grid columns="auto 1fr" gap="2" gapX="3" align="center">
        <Flex align="center" gap="1">
          <Label.Root>
            <Text size="2" weight="medium" color="gray">
              {t($ => $.floors.labels.beamHeight)}
            </Text>
          </Label.Root>
          <Tooltip content={t($ => $.floors.tips.beamHeight)}>
            <IconButton style={{ cursor: 'help' }} color="gray" radius="full" variant="ghost" size="1">
              <InfoCircledIcon width={12} height={12} />
            </IconButton>
          </Tooltip>
        </Flex>
        <LengthField
          value={config.constructionHeight}
          onChange={constructionHeight => {
            onUpdate({ constructionHeight })
          }}
          unit="mm"
          size="2"
        />
      </Grid>

      <Separator size="4" />

      {/* Joists Section */}
      <Heading size="2">{t($ => $.floors.sections.joists)}</Heading>
      <Grid columns="auto 1fr auto 1fr" gap="2" gapX="3" align="center">
        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            {t($ => $.common.materialLabel)}
          </Text>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.joistMaterial}
          onValueChange={joistMaterial => {
            if (!joistMaterial) return
            onUpdate({ joistMaterial })
          }}
          placeholder={t($ => $.common.placeholders.selectMaterial)}
          size="2"
          preferredTypes={['dimensional']}
        />

        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            {t($ => $.common.thickness)}
          </Text>
        </Label.Root>
        <LengthField
          value={config.joistThickness}
          onChange={joistThickness => {
            onUpdate({ joistThickness })
          }}
          unit="mm"
          size="2"
        />

        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            {t($ => $.common.spacing)}
          </Text>
        </Label.Root>
        <LengthField
          value={config.joistSpacing}
          onChange={joistSpacing => {
            onUpdate({ joistSpacing })
          }}
          unit="mm"
          size="2"
        />
      </Grid>

      <Separator size="4" />

      {/* Wall Beams Section */}
      <Heading size="2">{t($ => $.floors.sections.wallBeams)}</Heading>
      <Grid columns="auto 1fr auto 1fr" gap="2" gapX="3" align="center">
        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            {t($ => $.common.materialLabel)}
          </Text>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.wallBeamMaterial}
          onValueChange={wallBeamMaterial => {
            if (!wallBeamMaterial) return
            onUpdate({ wallBeamMaterial })
          }}
          placeholder={t($ => $.common.placeholders.selectMaterial)}
          size="2"
          preferredTypes={['dimensional']}
        />

        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            {t($ => $.common.thickness)}
          </Text>
        </Label.Root>
        <LengthField
          value={config.wallBeamThickness}
          onChange={wallBeamThickness => {
            onUpdate({ wallBeamThickness })
          }}
          unit="mm"
          size="2"
        />

        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            {t($ => $.floors.labels.wallBeamInsideOffset)}
          </Text>
        </Label.Root>
        <LengthField
          value={config.wallBeamInsideOffset}
          onChange={wallBeamInsideOffset => {
            onUpdate({ wallBeamInsideOffset })
          }}
          unit="mm"
          size="2"
        />

        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            {t($ => $.common.infillMaterial)}
          </Text>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.wallInfillMaterial}
          onValueChange={wallInfillMaterial => {
            if (!wallInfillMaterial) return
            onUpdate({ wallInfillMaterial })
          }}
          placeholder={t($ => $.common.placeholders.selectMaterial)}
          size="2"
        />
      </Grid>

      <Separator size="4" />

      {/* Subfloor Section */}
      <Heading size="2">{t($ => $.floors.sections.subfloor)}</Heading>
      <Grid columns="auto 1fr auto 1fr" gap="2" gapX="3" align="center">
        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            {t($ => $.common.materialLabel)}
          </Text>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.subfloorMaterial}
          onValueChange={subfloorMaterial => {
            if (!subfloorMaterial) return
            onUpdate({ subfloorMaterial })
          }}
          placeholder={t($ => $.common.placeholders.selectMaterial)}
          size="2"
          preferredTypes={['sheet']}
        />

        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            {t($ => $.common.thickness)}
          </Text>
        </Label.Root>
        <LengthField
          value={config.subfloorThickness}
          onChange={subfloorThickness => {
            onUpdate({ subfloorThickness })
          }}
          unit="mm"
          size="2"
        />
      </Grid>

      <Separator size="4" />

      {/* Opening Sides Section */}
      <Heading size="2">{t($ => $.floors.sections.openingSides)}</Heading>
      <Grid columns="auto 1fr auto 1fr" gap="2" gapX="3" align="center">
        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            {t($ => $.common.materialLabel)}
          </Text>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.openingSideMaterial}
          onValueChange={openingSideMaterial => {
            if (!openingSideMaterial) return
            onUpdate({ openingSideMaterial })
          }}
          placeholder={t($ => $.common.placeholders.selectMaterial)}
          size="2"
          preferredTypes={['dimensional']}
        />

        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            {t($ => $.common.thickness)}
          </Text>
        </Label.Root>
        <LengthField
          value={config.openingSideThickness}
          onChange={openingSideThickness => {
            onUpdate({ openingSideThickness })
          }}
          unit="mm"
          size="2"
        />
      </Grid>
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
      <Heading size="3">{t($ => $.floors.types.straw)}</Heading>

      <Grid columns="auto 1fr" gap="2" gapX="3" align="center">
        <Flex align="center" gap="1">
          <Label.Root>
            <Text size="2" weight="medium" color="gray">
              {t($ => $.floors.labels.constructionHeight)}
            </Text>
          </Label.Root>
          <Tooltip content={t($ => $.floors.tips.constructionHeight)}>
            <IconButton style={{ cursor: 'help' }} color="gray" radius="full" variant="ghost" size="1">
              <InfoCircledIcon width={12} height={12} />
            </IconButton>
          </Tooltip>
        </Flex>
        <LengthField
          value={config.constructionHeight}
          onChange={constructionHeight => {
            onUpdate({ constructionHeight })
          }}
          unit="mm"
          size="2"
        />
      </Grid>

      <Separator size="4" />

      {/* Joists Section */}
      <Heading size="2">{t($ => $.floors.sections.joists)}</Heading>
      <Grid columns="auto 1fr auto 1fr" gap="2" gapX="3" align="center">
        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            {t($ => $.common.materialLabel)}
          </Text>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.joistMaterial}
          onValueChange={joistMaterial => {
            if (!joistMaterial) return
            onUpdate({ joistMaterial })
          }}
          placeholder={t($ => $.common.placeholders.selectMaterial)}
          size="2"
          preferredTypes={['dimensional']}
        />

        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            {t($ => $.common.thickness)}
          </Text>
        </Label.Root>
        <LengthField
          value={config.joistThickness}
          onChange={joistThickness => {
            onUpdate({ joistThickness })
          }}
          unit="mm"
          size="2"
        />

        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            {t($ => $.common.spacing)}
          </Text>
        </Label.Root>
        <LengthField
          value={config.joistSpacing}
          onChange={joistSpacing => {
            onUpdate({ joistSpacing })
          }}
          unit="mm"
          size="2"
        />
      </Grid>

      <Separator size="4" />

      {/* Frame Section */}
      <Heading size="2">{t($ => $.floors.sections.perimeterFrame)}</Heading>
      <Grid columns="auto 1fr auto 1fr" gap="2" gapX="3" align="center">
        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            {t($ => $.common.materialLabel)}
          </Text>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.frameMaterial}
          onValueChange={frameMaterial => {
            if (!frameMaterial) return
            onUpdate({ frameMaterial })
          }}
          placeholder={t($ => $.common.placeholders.selectMaterial)}
          size="2"
          preferredTypes={['dimensional']}
        />

        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            {t($ => $.common.thickness)}
          </Text>
        </Label.Root>
        <LengthField
          value={config.frameThickness}
          onChange={frameThickness => {
            onUpdate({ frameThickness })
          }}
          unit="mm"
          size="2"
        />
      </Grid>

      <Separator size="4" />

      {/* Subfloor Section */}
      <Heading size="2">{t($ => $.floors.sections.subfloor)}</Heading>
      <Grid columns="auto 1fr auto 1fr" gap="2" gapX="3" align="center">
        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            {t($ => $.common.materialLabel)}
          </Text>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.subfloorMaterial}
          onValueChange={subfloorMaterial => {
            if (!subfloorMaterial) return
            onUpdate({ subfloorMaterial })
          }}
          placeholder={t($ => $.common.placeholders.selectMaterial)}
          size="2"
          preferredTypes={['sheet']}
        />

        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            {t($ => $.common.thickness)}
          </Text>
        </Label.Root>
        <LengthField
          value={config.subfloorThickness}
          onChange={subfloorThickness => {
            onUpdate({ subfloorThickness })
          }}
          unit="mm"
          size="2"
        />
      </Grid>

      <Separator size="4" />

      {/* Ceiling Sheathing Section */}
      <Heading size="2">{t($ => $.floors.sections.ceilingSheathing)}</Heading>
      <Grid columns="auto 1fr auto 1fr" gap="2" gapX="3" align="center">
        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            {t($ => $.common.materialLabel)}
          </Text>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.ceilingSheathingMaterial}
          onValueChange={ceilingSheathingMaterial => {
            if (!ceilingSheathingMaterial) return
            onUpdate({ ceilingSheathingMaterial })
          }}
          placeholder={t($ => $.common.placeholders.selectMaterial)}
          size="2"
          preferredTypes={['sheet']}
        />

        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            {t($ => $.common.thickness)}
          </Text>
        </Label.Root>
        <LengthField
          value={config.ceilingSheathingThickness}
          onChange={ceilingSheathingThickness => {
            onUpdate({ ceilingSheathingThickness })
          }}
          unit="mm"
          size="2"
        />
      </Grid>

      <Separator size="4" />

      {/* Opening Frame Section */}
      <Heading size="2">{t($ => $.floors.sections.openingFrame)}</Heading>
      <Grid columns="auto 1fr auto 1fr" gap="2" gapX="3" align="center">
        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            {t($ => $.common.materialLabel)}
          </Text>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.openingFrameMaterial}
          onValueChange={openingFrameMaterial => {
            if (!openingFrameMaterial) return
            onUpdate({ openingFrameMaterial })
          }}
          placeholder={t($ => $.common.placeholders.selectMaterial)}
          size="2"
          preferredTypes={['dimensional']}
        />

        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            {t($ => $.common.thickness)}
          </Text>
        </Label.Root>
        <LengthField
          value={config.openingFrameThickness}
          onChange={openingFrameThickness => {
            onUpdate({ openingFrameThickness })
          }}
          unit="mm"
          size="2"
        />
      </Grid>

      <Separator size="4" />

      {/* Straw Infill Section */}
      <Heading size="2">{t($ => $.floors.sections.strawInfill)}</Heading>
      <Grid columns="auto 1fr" gap="2" gapX="3" align="center">
        <Flex align="center" gap="1">
          <Label.Root>
            <Text size="2" weight="medium" color="gray">
              {t($ => $.common.strawMaterialOverride)}
            </Text>
          </Label.Root>
          <Tooltip content={t($ => $.floors.tips.strawMaterialOverride)}>
            <IconButton style={{ cursor: 'help' }} color="gray" radius="full" variant="ghost" size="1">
              <InfoCircledIcon width={12} height={12} />
            </IconButton>
          </Tooltip>
        </Flex>
        <MaterialSelectWithEdit
          value={config.strawMaterial ?? null}
          allowEmpty
          emptyLabel={t($ => $.common.useGlobalStrawSettings)}
          onValueChange={strawMaterial => {
            onUpdate({ strawMaterial: strawMaterial ?? undefined })
          }}
          placeholder={t($ => $.common.placeholders.selectMaterial)}
          size="2"
          preferredTypes={['strawbale']}
        />
      </Grid>
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
    <Flex direction="column" gap="3">
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

      <Separator size="4" />

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
    </Flex>
  )
}
