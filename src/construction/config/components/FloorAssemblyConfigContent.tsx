import { CopyIcon, InfoCircledIcon, PlusIcon, TrashIcon } from '@radix-ui/react-icons'
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

import type { FloorAssemblyId } from '@/building/model/ids'
import { useStoreysOrderedByLevel } from '@/building/store'
import type { FloorAssemblyConfig } from '@/construction/config'
import { useConfigActions, useDefaultFloorAssemblyId, useFloorAssemblies } from '@/construction/config/store'
import { getFloorAssemblyUsage } from '@/construction/config/usage'
import { FLOOR_ASSEMBLIES } from '@/construction/floors'
import type {
  FilledFloorConfig,
  FloorAssemblyType,
  FloorConfig,
  JoistFloorConfig,
  MonolithicFloorConfig
} from '@/construction/floors/types'
import { DEFAULT_CEILING_LAYER_SETS, DEFAULT_FLOOR_LAYER_SETS } from '@/construction/layers/defaults'
import { MaterialSelectWithEdit } from '@/construction/materials/components/MaterialSelectWithEdit'
import type { MaterialId } from '@/construction/materials/material'
import { MeasurementInfo } from '@/editor/components/MeasurementInfo'
import { LengthField } from '@/shared/components/LengthField/LengthField'
import { useDebouncedInput } from '@/shared/hooks/useDebouncedInput'
import { formatLength } from '@/shared/utils/formatting'

import { FloorAssemblySelect } from './FloorAssemblySelect'
import { getFloorAssemblyTypeIcon } from './Icons'
import { type LayerCopySource, LayerListEditor } from './layers/LayerListEditor'

export interface FloorAssemblyConfigContentProps {
  initialSelectionId?: string
}

export function FloorAssemblyConfigContent({ initialSelectionId }: FloorAssemblyConfigContentProps): React.JSX.Element {
  const floorAssemblies = useFloorAssemblies()
  const storeys = useStoreysOrderedByLevel()
  const { addFloorAssembly, duplicateFloorAssembly, removeFloorAssembly, setDefaultFloorAssembly } = useConfigActions()

  const defaultConfigId = useDefaultFloorAssemblyId()

  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(() => {
    if (initialSelectionId && floorAssemblies.some(c => c.id === initialSelectionId)) {
      return initialSelectionId
    }
    return floorAssemblies.length > 0 ? floorAssemblies[0].id : null
  })

  const selectedConfig = floorAssemblies.find(c => c.id === selectedConfigId) ?? null

  const usage = useMemo(
    () => (selectedConfig ? getFloorAssemblyUsage(selectedConfig.id, storeys) : { isUsed: false, usedByStoreys: [] }),
    [selectedConfig, storeys]
  )

  const handleAddNew = useCallback(
    (type: FloorAssemblyType) => {
      const defaultMaterial = '' as MaterialId

      let name: string
      let config: FloorConfig
      if (type === 'monolithic') {
        name = 'New Monolithic Floor'
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
        name = 'New Joist Floor'
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
        name = 'New Filled Floor'
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

    const duplicated = duplicateFloorAssembly(selectedConfig.id, `${selectedConfig.name} (Copy)`)
    setSelectedConfigId(duplicated.id)
  }, [selectedConfig, duplicateFloorAssembly])

  const handleDelete = useCallback(() => {
    if (!selectedConfig || usage.isUsed) return

    try {
      const currentIndex = floorAssemblies.findIndex(c => c.id === selectedConfigId)
      removeFloorAssembly(selectedConfig.id)

      if (floorAssemblies.length > 1) {
        const nextConfig = floorAssemblies[currentIndex + 1] ?? floorAssemblies[currentIndex - 1]
        setSelectedConfigId(nextConfig?.id ?? null)
      } else {
        setSelectedConfigId(null)
      }
    } catch (error) {
      // Handle error - probably tried to delete last config
      console.error('Failed to delete floor assembly:', error)
    }
  }, [selectedConfig, selectedConfigId, floorAssemblies, removeFloorAssembly, usage.isUsed])

  return (
    <Flex direction="column" gap="4" width="100%">
      {/* Selector + Actions */}
      <Flex direction="column" gap="2">
        <Flex gap="2" align="end">
          <Flex direction="column" gap="1" flexGrow="1">
            <FloorAssemblySelect
              value={selectedConfigId as FloorAssemblyId | undefined}
              onValueChange={value => setSelectedConfigId(value ?? null)}
              showDefaultIndicator
              defaultConfigId={defaultConfigId}
            />
          </Flex>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <IconButton title="Add New">
                <PlusIcon />
              </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item onSelect={() => handleAddNew('monolithic')}>
                <Flex align="center" gap="1">
                  {React.createElement(getFloorAssemblyTypeIcon('monolithic'))}
                  Monolithic Floor
                </Flex>
              </DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => handleAddNew('joist')}>
                <Flex align="center" gap="1">
                  {React.createElement(getFloorAssemblyTypeIcon('joist'))}
                  Joist Floor
                </Flex>
              </DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => handleAddNew('filled')}>
                <Flex align="center" gap="1">
                  {React.createElement(getFloorAssemblyTypeIcon('filled'))}
                  Straw Filled Floor
                </Flex>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>

          <IconButton onClick={handleDuplicate} disabled={!selectedConfig} title="Duplicate" variant="soft">
            <CopyIcon />
          </IconButton>

          <AlertDialog.Root>
            <AlertDialog.Trigger>
              <IconButton
                disabled={!selectedConfig || usage.isUsed || floorAssemblies.length === 1}
                color="red"
                title={
                  !selectedConfig
                    ? 'No config selected'
                    : floorAssemblies.length === 1
                      ? 'Cannot delete the last config'
                      : usage.isUsed
                        ? 'In Use - Cannot Delete'
                        : 'Delete'
                }
              >
                <TrashIcon />
              </IconButton>
            </AlertDialog.Trigger>
            <AlertDialog.Content>
              <AlertDialog.Title>Delete Floor Assembly</AlertDialog.Title>
              <AlertDialog.Description>
                Are you sure you want to delete "{selectedConfig?.name}"? This action cannot be undone.
              </AlertDialog.Description>
              <Flex gap="3" mt="4" justify="end">
                <AlertDialog.Cancel>
                  <Button variant="soft" color="gray">
                    Cancel
                  </Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action>
                  <Button variant="solid" color="red" onClick={handleDelete}>
                    Delete
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
          <Text color="gray">No floor assemblies yet. Create one using the "New" button above.</Text>
        </Flex>
      )}

      {/* Defaults Section */}
      <Separator size="4" />
      <Flex direction="column" gap="3">
        <Grid columns="auto 1fr" gap="2" gapX="3" align="center">
          <Flex align="center" gap="1">
            <Label.Root>
              <Text size="2" weight="medium" color="gray">
                Default Floor Assembly
              </Text>
            </Label.Root>
            <MeasurementInfo highlightedAssembly="floorAssembly" />
          </Flex>
          <FloorAssemblySelect
            value={defaultConfigId}
            onValueChange={setDefaultFloorAssembly}
            placeholder="Select default..."
            size="2"
          />
        </Grid>

        {usage.isUsed && (
          <Grid columns="auto 1fr" gap="2" gapX="3" align="center">
            <Label.Root>
              <Text size="2" weight="medium" color="gray">
                Used By:
              </Text>
            </Label.Root>
            <Flex gap="1" wrap="wrap">
              {usage.usedByStoreys.map((use, index) => (
                <Badge key={index} size="2" variant="soft">
                  {use}
                </Badge>
              ))}
            </Flex>
          </Grid>
        )}
      </Flex>
    </Flex>
  )
}

function ConfigForm({ assembly }: { assembly: FloorAssemblyConfig }): React.JSX.Element {
  const { updateFloorAssemblyName, updateFloorAssemblyConfig } = useConfigActions()

  const nameInput = useDebouncedInput(assembly.name, (name: string) => updateFloorAssemblyName(assembly.id, name), {
    debounceMs: 1000
  })

  const handleUpdateConfig = useCallback(
    (updates: Partial<FloorConfig>) => updateFloorAssemblyConfig(assembly.id, updates),
    [assembly.id, updateFloorAssemblyConfig]
  )

  const totalThickness = useMemo(() => {
    const assemblyImpl = FLOOR_ASSEMBLIES[assembly.type]
    const totalThickness = assemblyImpl.getTotalThickness(assembly)
    return formatLength(totalThickness)
  }, [assembly])

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
              Name
            </Text>
          </Label.Root>
          <TextField.Root
            value={nameInput.value}
            onChange={e => nameInput.handleChange(e.target.value)}
            onBlur={nameInput.handleBlur}
            onKeyDown={nameInput.handleKeyDown}
            placeholder="Floor assembly name"
            size="2"
          />
        </Grid>

        <Grid columns="1fr 1fr" gap="2" gapX="3" align="center">
          <Flex gap="2" align="center">
            <Label.Root>
              <Text size="2" weight="medium" color="gray">
                Type
              </Text>
            </Label.Root>
            <Flex gap="2" align="center">
              {React.createElement(getFloorAssemblyTypeIcon(assembly.type))}
              <Text size="2" color="gray">
                {assembly.type === 'monolithic' ? 'Monolithic' : assembly.type === 'joist' ? 'Joist' : 'Straw Filled'}
              </Text>
            </Flex>
          </Flex>

          <Flex gap="2" align="center">
            <Label.Root>
              <Text size="2" weight="medium" color="gray">
                Total Thickness
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
  return (
    <>
      <Heading size="2">Monolithic Floor</Heading>
      <Grid columns="auto 1fr auto 1fr" gap="2" gapX="3" align="center">
        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Material
          </Text>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.material}
          onValueChange={material => {
            if (!material) return
            onUpdate({ material })
          }}
          placeholder="Select material..."
          size="2"
        />

        <Flex align="center" gap="1">
          <Label.Root>
            <Text size="2" weight="medium" color="gray">
              Thickness
            </Text>
          </Label.Root>
          <MeasurementInfo highlightedPart="floorConstruction" />
        </Flex>
        <LengthField value={config.thickness} onChange={thickness => onUpdate({ thickness })} unit="mm" size="2" />
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
  return (
    <>
      <Heading size="2">Joist Floor</Heading>

      {/* Beam Height - Full Width */}
      <Grid columns="auto 1fr" gap="2" gapX="3" align="center">
        <Flex align="center" gap="1">
          <Label.Root>
            <Text size="2" weight="medium" color="gray">
              Beam Height
            </Text>
          </Label.Root>
          <Tooltip content="Height of structural beams. Applies to both joists and wall beams.">
            <IconButton style={{ cursor: 'help' }} color="gray" radius="full" variant="ghost" size="1">
              <InfoCircledIcon width={12} height={12} />
            </IconButton>
          </Tooltip>
        </Flex>
        <LengthField
          value={config.constructionHeight}
          onChange={constructionHeight => onUpdate({ constructionHeight })}
          unit="mm"
          size="2"
        />
      </Grid>

      <Separator size="4" />

      {/* Joists Section */}
      <Heading size="3">Joists</Heading>
      <Grid columns="auto 1fr auto 1fr" gap="2" gapX="3" align="center">
        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Joist Material
          </Text>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.joistMaterial}
          onValueChange={joistMaterial => {
            if (!joistMaterial) return
            onUpdate({ joistMaterial })
          }}
          placeholder="Select joist material..."
          size="2"
        />

        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Joist Thickness
          </Text>
        </Label.Root>
        <LengthField
          value={config.joistThickness}
          onChange={joistThickness => onUpdate({ joistThickness })}
          unit="mm"
          size="2"
        />

        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Joist Spacing
          </Text>
        </Label.Root>
        <LengthField
          value={config.joistSpacing}
          onChange={joistSpacing => onUpdate({ joistSpacing })}
          unit="mm"
          size="2"
        />
      </Grid>

      <Separator size="4" />

      {/* Wall Beams Section */}
      <Heading size="3">Wall Beams</Heading>
      <Grid columns="auto 1fr auto 1fr" gap="2" gapX="3" align="center">
        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Wall Beam Material
          </Text>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.wallBeamMaterial}
          onValueChange={wallBeamMaterial => {
            if (!wallBeamMaterial) return
            onUpdate({ wallBeamMaterial })
          }}
          placeholder="Select wall beam material..."
          size="2"
        />

        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Wall Beam Thickness
          </Text>
        </Label.Root>
        <LengthField
          value={config.wallBeamThickness}
          onChange={wallBeamThickness => onUpdate({ wallBeamThickness })}
          unit="mm"
          size="2"
        />

        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Wall Beam Inside Offset
          </Text>
        </Label.Root>
        <LengthField
          value={config.wallBeamInsideOffset}
          onChange={wallBeamInsideOffset => onUpdate({ wallBeamInsideOffset })}
          unit="mm"
          size="2"
        />

        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Wall Infill Material
          </Text>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.wallInfillMaterial}
          onValueChange={wallInfillMaterial => {
            if (!wallInfillMaterial) return
            onUpdate({ wallInfillMaterial })
          }}
          placeholder="Select wall infill material..."
          size="2"
        />
      </Grid>

      <Separator size="4" />

      {/* Subfloor Section */}
      <Heading size="3">Subfloor</Heading>
      <Grid columns="auto 1fr auto 1fr" gap="2" gapX="3" align="center">
        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Subfloor Material
          </Text>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.subfloorMaterial}
          onValueChange={subfloorMaterial => {
            if (!subfloorMaterial) return
            onUpdate({ subfloorMaterial })
          }}
          placeholder="Select subfloor material..."
          size="2"
        />

        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Subfloor Thickness
          </Text>
        </Label.Root>
        <LengthField
          value={config.subfloorThickness}
          onChange={subfloorThickness => onUpdate({ subfloorThickness })}
          unit="mm"
          size="2"
        />
      </Grid>

      <Separator size="4" />

      {/* Opening Sides Section */}
      <Heading size="3">Opening Sides</Heading>
      <Grid columns="auto 1fr auto 1fr" gap="2" gapX="3" align="center">
        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Opening Side Material
          </Text>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.openingSideMaterial}
          onValueChange={openingSideMaterial => {
            if (!openingSideMaterial) return
            onUpdate({ openingSideMaterial })
          }}
          placeholder="Select opening side material..."
          size="2"
        />

        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Opening Side Thickness
          </Text>
        </Label.Root>
        <LengthField
          value={config.openingSideThickness}
          onChange={openingSideThickness => onUpdate({ openingSideThickness })}
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
  return (
    <>
      <Heading size="2">Straw Filled Floor</Heading>

      {/* Construction Height - Full Width */}
      <Grid columns="auto 1fr" gap="2" gapX="3" align="center">
        <Flex align="center" gap="1">
          <Label.Root>
            <Text size="2" weight="medium" color="gray">
              Construction Height
            </Text>
          </Label.Root>
          <Tooltip content="Height of the floor structure (joist height).">
            <IconButton style={{ cursor: 'help' }} color="gray" radius="full" variant="ghost" size="1">
              <InfoCircledIcon width={12} height={12} />
            </IconButton>
          </Tooltip>
        </Flex>
        <LengthField
          value={config.constructionHeight}
          onChange={constructionHeight => onUpdate({ constructionHeight })}
          unit="mm"
          size="2"
        />
      </Grid>

      <Separator size="4" />

      {/* Joists Section */}
      <Heading size="3">Joists</Heading>
      <Grid columns="auto 1fr auto 1fr" gap="2" gapX="3" align="center">
        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Joist Material
          </Text>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.joistMaterial}
          onValueChange={joistMaterial => {
            if (!joistMaterial) return
            onUpdate({ joistMaterial })
          }}
          placeholder="Select joist material..."
          size="2"
        />

        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Joist Thickness
          </Text>
        </Label.Root>
        <LengthField
          value={config.joistThickness}
          onChange={joistThickness => onUpdate({ joistThickness })}
          unit="mm"
          size="2"
        />

        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Joist Spacing
          </Text>
        </Label.Root>
        <LengthField
          value={config.joistSpacing}
          onChange={joistSpacing => onUpdate({ joistSpacing })}
          unit="mm"
          size="2"
        />
      </Grid>

      <Separator size="4" />

      {/* Frame Section */}
      <Heading size="3">Perimeter Frame</Heading>
      <Grid columns="auto 1fr auto 1fr" gap="2" gapX="3" align="center">
        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Frame Material
          </Text>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.frameMaterial}
          onValueChange={frameMaterial => {
            if (!frameMaterial) return
            onUpdate({ frameMaterial })
          }}
          placeholder="Select frame material..."
          size="2"
        />

        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Frame Thickness
          </Text>
        </Label.Root>
        <LengthField
          value={config.frameThickness}
          onChange={frameThickness => onUpdate({ frameThickness })}
          unit="mm"
          size="2"
        />
      </Grid>

      <Separator size="4" />

      {/* Subfloor Section */}
      <Heading size="3">Subfloor</Heading>
      <Grid columns="auto 1fr auto 1fr" gap="2" gapX="3" align="center">
        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Subfloor Material
          </Text>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.subfloorMaterial}
          onValueChange={subfloorMaterial => {
            if (!subfloorMaterial) return
            onUpdate({ subfloorMaterial })
          }}
          placeholder="Select subfloor material..."
          size="2"
        />

        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Subfloor Thickness
          </Text>
        </Label.Root>
        <LengthField
          value={config.subfloorThickness}
          onChange={subfloorThickness => onUpdate({ subfloorThickness })}
          unit="mm"
          size="2"
        />
      </Grid>

      <Separator size="4" />

      {/* Ceiling Sheathing Section */}
      <Heading size="3">Ceiling Sheathing</Heading>
      <Grid columns="auto 1fr auto 1fr" gap="2" gapX="3" align="center">
        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Ceiling Sheathing Material
          </Text>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.ceilingSheathingMaterial}
          onValueChange={ceilingSheathingMaterial => {
            if (!ceilingSheathingMaterial) return
            onUpdate({ ceilingSheathingMaterial })
          }}
          placeholder="Select ceiling sheathing material..."
          size="2"
        />

        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Ceiling Sheathing Thickness
          </Text>
        </Label.Root>
        <LengthField
          value={config.ceilingSheathingThickness}
          onChange={ceilingSheathingThickness => onUpdate({ ceilingSheathingThickness })}
          unit="mm"
          size="2"
        />
      </Grid>

      <Separator size="4" />

      {/* Opening Frame Section */}
      <Heading size="3">Opening Frame</Heading>
      <Grid columns="auto 1fr auto 1fr" gap="2" gapX="3" align="center">
        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Opening Frame Material
          </Text>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.openingFrameMaterial}
          onValueChange={openingFrameMaterial => {
            if (!openingFrameMaterial) return
            onUpdate({ openingFrameMaterial })
          }}
          placeholder="Select opening frame material..."
          size="2"
        />

        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Opening Frame Thickness
          </Text>
        </Label.Root>
        <LengthField
          value={config.openingFrameThickness}
          onChange={openingFrameThickness => onUpdate({ openingFrameThickness })}
          unit="mm"
          size="2"
        />
      </Grid>

      <Separator size="4" />

      {/* Straw Infill Section */}
      <Heading size="3">Straw Infill</Heading>
      <Grid columns="auto 1fr" gap="2" gapX="3" align="center">
        <Flex align="center" gap="1">
          <Label.Root>
            <Text size="2" weight="medium" color="gray">
              Straw Material (Override)
            </Text>
          </Label.Root>
          <Tooltip content="Material used to fill spaces between joists. Leave empty to use global straw settings.">
            <IconButton style={{ cursor: 'help' }} color="gray" radius="full" variant="ghost" size="1">
              <InfoCircledIcon width={12} height={12} />
            </IconButton>
          </Tooltip>
        </Flex>
        <MaterialSelectWithEdit
          value={config.strawMaterial ?? null}
          allowEmpty
          emptyLabel="Use global straw settings"
          onValueChange={strawMaterial => onUpdate({ strawMaterial: strawMaterial ?? undefined })}
          placeholder="Select straw material..."
          size="2"
        />
      </Grid>
    </>
  )
}

function LayersFields({ assemblyId, config }: { assemblyId: FloorAssemblyId; config: FloorConfig }) {
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
        title="Top Layers"
        measurementInfo={<MeasurementInfo highlightedPart="floorTopLayers" />}
        layers={displayedTopLayers}
        onAddLayer={layer => addFloorAssemblyTopLayer(assemblyId, layer)}
        onReplaceLayers={layers => setFloorAssemblyTopLayers(assemblyId, [...layers].reverse())}
        onUpdateLayer={(index, updates) => updateFloorAssemblyTopLayer(assemblyId, mapTopIndex(index), updates)}
        onRemoveLayer={index => removeFloorAssemblyTopLayer(assemblyId, mapTopIndex(index))}
        onMoveLayer={(fromIndex, toIndex) =>
          moveFloorAssemblyTopLayer(assemblyId, mapTopIndex(fromIndex), mapTopIndex(toIndex))
        }
        addLabel="Add Top Layer"
        emptyHint="No top layers defined"
        layerPresets={DEFAULT_FLOOR_LAYER_SETS}
        layerCopySources={topLayerSources}
        beforeLabel="Finished Top"
        afterLabel="Floor Construction"
      />

      <Separator size="4" />

      <LayerListEditor
        title="Bottom Layers"
        measurementInfo={<MeasurementInfo highlightedPart="floorBottomLayers" />}
        layers={config.layers.bottomLayers}
        onAddLayer={layer => addFloorAssemblyBottomLayer(assemblyId, layer)}
        onReplaceLayers={layers => setFloorAssemblyBottomLayers(assemblyId, layers)}
        onUpdateLayer={(index, updates) => updateFloorAssemblyBottomLayer(assemblyId, index, updates)}
        onRemoveLayer={index => removeFloorAssemblyBottomLayer(assemblyId, index)}
        onMoveLayer={(fromIndex, toIndex) => moveFloorAssemblyBottomLayer(assemblyId, fromIndex, toIndex)}
        addLabel="Add Bottom Layer"
        emptyHint="No bottom layers defined"
        layerPresets={DEFAULT_CEILING_LAYER_SETS}
        layerCopySources={bottomLayerSources}
        beforeLabel="Floor Construction"
        afterLabel="Finished Bottom"
      />
    </Flex>
  )
}
