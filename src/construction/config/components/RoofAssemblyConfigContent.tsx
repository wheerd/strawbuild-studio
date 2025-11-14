import { ComponentInstanceIcon, CopyIcon, PlusIcon, SquareIcon, TrashIcon } from '@radix-ui/react-icons'
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

import type { RoofAssemblyId } from '@/building/model/ids'
import { useRoofs, useStoreysOrderedByLevel } from '@/building/store'
import { useConfigActions, useDefaultRoofAssemblyId, useRoofAssemblies } from '@/construction/config/store'
import type { RoofAssemblyConfig } from '@/construction/config/types'
import { getRoofAssemblyUsage } from '@/construction/config/usage'
import { DEFAULT_CEILING_LAYER_SETS, DEFAULT_ROOF_LAYER_SETS } from '@/construction/layers/defaults'
import { MaterialSelectWithEdit } from '@/construction/materials/components/MaterialSelectWithEdit'
import type { MaterialId } from '@/construction/materials/material'
import type { MonolithicRoofConfig, PurlinRoofConfig, RoofAssemblyType, RoofConfig } from '@/construction/roofs/types'
import { LengthField } from '@/shared/components/LengthField/LengthField'

import { getRoofAssemblyTypeIcon } from './Icons'
import { RoofAssemblySelect } from './RoofAssemblySelect'
import { LayerListEditor } from './layers/LayerListEditor'

interface MonolithicRoofConfigFormProps {
  config: MonolithicRoofConfig
  onUpdate: (updates: Partial<MonolithicRoofConfig>) => void
}

function MonolithicRoofConfigForm({ config, onUpdate }: MonolithicRoofConfigFormProps): React.JSX.Element {
  return (
    <Flex direction="column" gap="3">
      <Heading size="2">Monolithic Configuration</Heading>

      <Grid columns="2" gap="2" gapX="3">
        <Flex direction="column" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              Material
            </Text>
          </Label.Root>
          <MaterialSelectWithEdit
            value={config.material}
            onValueChange={material => {
              if (!material) return
              onUpdate({ ...config, material })
            }}
            size="1"
          />
        </Flex>

        <Flex direction="column" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              Thickness
            </Text>
          </Label.Root>
          <LengthField
            value={config.thickness}
            onChange={value => onUpdate({ ...config, thickness: value })}
            unit="mm"
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
  return (
    <Flex direction="column" gap="3">
      <Heading size="2">Purlin Roof Configuration</Heading>

      {/* Main Configuration */}
      <Flex direction="column" gap="1">
        <Label.Root>
          <Text size="1" weight="medium" color="gray">
            Total Thickness
          </Text>
        </Label.Root>
        <LengthField
          value={config.thickness}
          onChange={value => onUpdate({ ...config, thickness: value })}
          unit="mm"
          size="1"
        />
      </Flex>

      <Separator size="4" />

      {/* Purlin Configuration */}
      <Heading size="2">Purlins</Heading>
      <Grid columns="2" gap="2" gapX="3">
        <Flex direction="column" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              Material
            </Text>
          </Label.Root>
          <MaterialSelectWithEdit
            value={config.purlinMaterial}
            onValueChange={material => {
              if (!material) return
              onUpdate({ ...config, purlinMaterial: material })
            }}
            size="1"
          />
        </Flex>

        <Flex direction="column" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              Height
            </Text>
          </Label.Root>
          <LengthField
            value={config.purlinHeight}
            onChange={value => onUpdate({ ...config, purlinHeight: value })}
            unit="mm"
            size="1"
          />
        </Flex>

        <Flex direction="column" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              Width
            </Text>
          </Label.Root>
          <LengthField
            value={config.purlinWidth}
            onChange={value => onUpdate({ ...config, purlinWidth: value })}
            unit="mm"
            size="1"
          />
        </Flex>

        <Flex direction="column" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              Spacing
            </Text>
          </Label.Root>
          <LengthField
            value={config.purlinSpacing}
            onChange={value => onUpdate({ ...config, purlinSpacing: value })}
            unit="mm"
            size="1"
          />
        </Flex>
      </Grid>

      <Separator size="4" />

      {/* Rafter Configuration */}
      <Heading size="2">Rafters</Heading>
      <Grid columns="2" gap="2" gapX="3">
        <Flex direction="column" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              Material
            </Text>
          </Label.Root>
          <MaterialSelectWithEdit
            value={config.rafterMaterial}
            onValueChange={material => {
              if (!material) return
              onUpdate({ ...config, rafterMaterial: material })
            }}
            size="1"
          />
        </Flex>

        <Flex direction="column" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              Width
            </Text>
          </Label.Root>
          <LengthField
            value={config.rafterWidth}
            onChange={value => onUpdate({ ...config, rafterWidth: value })}
            unit="mm"
            size="1"
          />
        </Flex>

        <Flex direction="column" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              Spacing (Min)
            </Text>
          </Label.Root>
          <LengthField
            value={config.rafterSpacingMin}
            onChange={value => onUpdate({ ...config, rafterSpacingMin: value })}
            unit="mm"
            size="1"
          />
        </Flex>

        <Flex direction="column" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              Spacing (Target)
            </Text>
          </Label.Root>
          <LengthField
            value={config.rafterSpacing}
            onChange={value => onUpdate({ ...config, rafterSpacing: value })}
            unit="mm"
            size="1"
          />
        </Flex>

        <Flex direction="column" gap="1" gridColumnEnd="span 2">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              Spacing (Max)
            </Text>
          </Label.Root>
          <LengthField
            value={config.rafterSpacingMax}
            onChange={value => onUpdate({ ...config, rafterSpacingMax: value })}
            unit="mm"
            size="1"
          />
        </Flex>
      </Grid>

      <Separator size="4" />

      {/* Cladding Configuration */}
      <Heading size="2">Cladding</Heading>
      <Grid columns="2" gap="2" gapX="3">
        <Flex direction="column" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              Inside Material
            </Text>
          </Label.Root>
          <MaterialSelectWithEdit
            value={config.insideCladdingMaterial}
            onValueChange={material => {
              if (!material) return
              onUpdate({ ...config, insideCladdingMaterial: material })
            }}
            size="1"
          />
        </Flex>

        <Flex direction="column" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              Inside Thickness
            </Text>
          </Label.Root>
          <LengthField
            value={config.insideCladdingThickness}
            onChange={value => onUpdate({ ...config, insideCladdingThickness: value })}
            unit="mm"
            size="1"
          />
        </Flex>

        <Flex direction="column" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              Top Material
            </Text>
          </Label.Root>
          <MaterialSelectWithEdit
            value={config.topCladdingMaterial}
            onValueChange={material => {
              if (!material) return
              onUpdate({ ...config, topCladdingMaterial: material })
            }}
            size="1"
          />
        </Flex>

        <Flex direction="column" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              Top Thickness
            </Text>
          </Label.Root>
          <LengthField
            value={config.topCladdingThickness}
            onChange={value => onUpdate({ ...config, topCladdingThickness: value })}
            unit="mm"
            size="1"
          />
        </Flex>
      </Grid>

      <Separator size="4" />

      {/* Optional Straw Material */}
      <Flex direction="column" gap="1">
        <Label.Root>
          <Text size="1" weight="medium" color="gray">
            Straw Material (Override)
          </Text>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.strawMaterial ?? null}
          allowEmpty
          emptyLabel="Use global straw settings"
          onValueChange={strawMaterial => onUpdate({ ...config, strawMaterial: strawMaterial ?? undefined })}
          size="1"
        />
      </Flex>
    </Flex>
  )
}

interface LayerSectionsProps {
  assemblyId: RoofAssemblyId
  config: RoofAssemblyConfig
}

function LayerSections({ assemblyId, config }: LayerSectionsProps): React.JSX.Element {
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

  // Reverse top layers for display (top layer = outside, shown first)
  const topLayers = config.layers.topLayers
  const displayedTopLayers = [...topLayers].reverse()
  const mapTopIndex = (displayIndex: number) => topLayers.length - 1 - displayIndex

  return (
    <Flex direction="column" gap="3">
      <LayerListEditor
        title="Inside Layers (Ceiling)"
        layers={config.layers.insideLayers}
        onAddLayer={layer => addRoofAssemblyInsideLayer(assemblyId, layer)}
        onReplaceLayers={layers => setRoofAssemblyInsideLayers(assemblyId, layers)}
        onUpdateLayer={(index, updates) => updateRoofAssemblyInsideLayer(assemblyId, index, updates)}
        onRemoveLayer={index => removeRoofAssemblyInsideLayer(assemblyId, index)}
        onMoveLayer={(fromIndex, toIndex) => moveRoofAssemblyInsideLayer(assemblyId, fromIndex, toIndex)}
        addLabel="Add Inside Layer"
        emptyHint="No inside layers defined"
        layerPresets={DEFAULT_CEILING_LAYER_SETS}
        beforeLabel="Roof Construction"
        afterLabel="Inside (Ceiling)"
      />

      <Separator size="4" />

      <LayerListEditor
        title="Top Layers (Roof Covering)"
        layers={displayedTopLayers}
        onAddLayer={layer => addRoofAssemblyTopLayer(assemblyId, layer)}
        onReplaceLayers={layers => setRoofAssemblyTopLayers(assemblyId, [...layers].reverse())}
        onUpdateLayer={(index, updates) => updateRoofAssemblyTopLayer(assemblyId, mapTopIndex(index), updates)}
        onRemoveLayer={index => removeRoofAssemblyTopLayer(assemblyId, mapTopIndex(index))}
        onMoveLayer={(fromIndex, toIndex) =>
          moveRoofAssemblyTopLayer(assemblyId, mapTopIndex(fromIndex), mapTopIndex(toIndex))
        }
        addLabel="Add Top Layer"
        emptyHint="No top layers defined"
        layerPresets={DEFAULT_ROOF_LAYER_SETS}
        beforeLabel="Finished Top"
        afterLabel="Roof Construction"
      />

      <Separator size="4" />

      <LayerListEditor
        title="Overhang Layers"
        layers={config.layers.overhangLayers}
        onAddLayer={layer => addRoofAssemblyOverhangLayer(assemblyId, layer)}
        onReplaceLayers={layers => setRoofAssemblyOverhangLayers(assemblyId, layers)}
        onUpdateLayer={(index, updates) => updateRoofAssemblyOverhangLayer(assemblyId, index, updates)}
        onRemoveLayer={index => removeRoofAssemblyOverhangLayer(assemblyId, index)}
        onMoveLayer={(fromIndex, toIndex) => moveRoofAssemblyOverhangLayer(assemblyId, fromIndex, toIndex)}
        addLabel="Add Overhang Layer"
        emptyHint="No overhang layers defined (optional)"
        layerPresets={{}}
        beforeLabel="Overhang"
        afterLabel="Outside"
      />
    </Flex>
  )
}

interface ConfigFormProps {
  assembly: RoofAssemblyConfig
  onUpdateName: (name: string) => void
}

function ConfigForm({ assembly, onUpdateName }: ConfigFormProps): React.JSX.Element {
  const { updateRoofAssemblyConfig } = useConfigActions()

  const updateConfig = useCallback(
    (updates: Partial<RoofConfig>) => updateRoofAssemblyConfig(assembly.id, updates),
    [assembly.id, updateRoofAssemblyConfig]
  )

  return (
    <Flex
      direction="column"
      gap="3"
      p="3"
      style={{ border: '1px solid var(--gray-6)', borderRadius: 'var(--radius-2)' }}
    >
      {/* Basic Info - Full Width */}
      <Grid columns="auto 1fr auto 1fr" gap="2" gapX="3" align="center">
        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Name
          </Text>
        </Label.Root>
        <TextField.Root
          value={assembly.name}
          onChange={e => onUpdateName(e.target.value)}
          placeholder="Assembly name"
          size="2"
        />

        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Type
          </Text>
        </Label.Root>

        <Flex gap="2" align="center">
          {React.createElement(getRoofAssemblyTypeIcon(assembly.type))}
          <Text size="2" color="gray">
            {assembly.type === 'monolithic' ? 'Monolithic' : 'Purlin'}
          </Text>
        </Flex>
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
  const roofAssemblies = useRoofAssemblies()
  const roofs = useRoofs()
  const storeys = useStoreysOrderedByLevel()
  const { addRoofAssembly, updateRoofAssemblyName, duplicateRoofAssembly, removeRoofAssembly, setDefaultRoofAssembly } =
    useConfigActions()

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
        ? getRoofAssemblyUsage(selectedAssembly.id, Object.values(roofs), storeys)
        : { isUsed: false, usedByRoofs: [] },
    [selectedAssembly, roofs, storeys]
  )

  const handleAddNew = useCallback(
    (type: RoofAssemblyType) => {
      const defaultMaterial = '' as MaterialId

      let name: string
      let config: RoofConfig
      if (type === 'monolithic') {
        name = 'New Monolithic Roof'
        config = {
          type: 'monolithic',
          thickness: 180,
          material: defaultMaterial,
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
        name = 'New Purlin Roof'
        config = {
          type: 'purlin',
          thickness: 500,
          purlinMaterial: defaultMaterial,
          purlinHeight: 220,
          purlinWidth: 60,
          purlinSpacing: 1000,
          rafterMaterial: defaultMaterial,
          rafterWidth: 60,
          rafterSpacingMin: 600,
          rafterSpacing: 800,
          rafterSpacingMax: 1000,
          insideCladdingMaterial: defaultMaterial,
          insideCladdingThickness: 25,
          topCladdingMaterial: defaultMaterial,
          topCladdingThickness: 25,
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

    const duplicated = duplicateRoofAssembly(selectedAssembly.id, `${selectedAssembly.name} (Copy)`)
    setSelectedAssemblyId(duplicated.id)
  }, [selectedAssembly, duplicateRoofAssembly])

  const handleDelete = useCallback(() => {
    if (!selectedAssembly || usage.isUsed) return

    const currentIndex = roofAssemblies.findIndex(a => a.id === selectedAssemblyId)
    removeRoofAssembly(selectedAssembly.id)

    if (roofAssemblies.length > 1) {
      const nextAssembly = roofAssemblies[currentIndex + 1] ?? roofAssemblies[currentIndex - 1]
      setSelectedAssemblyId(nextAssembly?.id ?? null)
    } else {
      setSelectedAssemblyId(null)
    }
  }, [selectedAssembly, selectedAssemblyId, roofAssemblies, removeRoofAssembly, usage.isUsed])

  const handleUpdateName = useCallback(
    (name: string) => {
      if (!selectedAssembly) return
      updateRoofAssemblyName(selectedAssembly.id, name)
    },
    [selectedAssembly, updateRoofAssemblyName]
  )

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
                <IconButton title="Add New">
                  <PlusIcon />
                </IconButton>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.Item onSelect={() => handleAddNew('monolithic')}>
                  <Flex align="center" gap="1">
                    <SquareIcon />
                    Monolithic
                  </Flex>
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => handleAddNew('purlin')}>
                  <Flex align="center" gap="1">
                    <ComponentInstanceIcon />
                    Purlin
                  </Flex>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>

            <IconButton onClick={handleDuplicate} disabled={!selectedAssembly} title="Duplicate" variant="soft">
              <CopyIcon />
            </IconButton>

            <AlertDialog.Root>
              <AlertDialog.Trigger>
                <IconButton
                  disabled={!selectedAssembly || usage.isUsed}
                  color="red"
                  title={usage.isUsed ? 'In Use - Cannot Delete' : 'Delete'}
                >
                  <TrashIcon />
                </IconButton>
              </AlertDialog.Trigger>
              <AlertDialog.Content>
                <AlertDialog.Title>Delete Roof Assembly</AlertDialog.Title>
                <AlertDialog.Description>
                  Are you sure you want to delete "{selectedAssembly?.name}"? This action cannot be undone.
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

          <Grid columns="auto 1fr" gap="2" align="center">
            <Label.Root>
              <Text size="1" weight="medium" color="gray">
                Default Roof Assembly
              </Text>
            </Label.Root>
            <RoofAssemblySelect
              value={defaultAssemblyId}
              onValueChange={value => setDefaultRoofAssembly(value)}
              placeholder="Select default..."
              size="2"
            />
          </Grid>
        </Grid>
      </Flex>

      {/* Form */}
      {selectedAssembly && <ConfigForm assembly={selectedAssembly} onUpdateName={handleUpdateName} />}

      {!selectedAssembly && roofAssemblies.length === 0 && (
        <Flex justify="center" align="center" p="5">
          <Text color="gray">No roof assemblies yet. Create one using the "New" button above.</Text>
        </Flex>
      )}

      {usage.isUsed && (
        <Grid columns="auto 1fr" gap="2" gapX="3" align="center">
          <Label.Root>
            <Text size="2" weight="medium" color="gray">
              Used By:
            </Text>
          </Label.Root>
          <Flex gap="1" wrap="wrap">
            {usage.usedByRoofs.map((use, index) => (
              <Badge key={index} size="2" variant="soft">
                {use}
              </Badge>
            ))}
          </Flex>
        </Grid>
      )}
    </Flex>
  )
}
