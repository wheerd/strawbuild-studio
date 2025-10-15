import { CopyIcon, PlusIcon, TrashIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import {
  AlertDialog,
  Badge,
  Button,
  Callout,
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

import type { FloorAssemblyId } from '@/building/model/ids'
import { createFloorAssemblyId } from '@/building/model/ids'
import { useStoreysOrderedByLevel } from '@/building/store'
import { useConfigActions, useDefaultFloorAssemblyId, useFloorAssemblyConfigs } from '@/construction/config/store'
import { getSlabConfigUsage } from '@/construction/config/usage'
import type { FloorAssemblyConfig, FloorAssemblyType, MonolithicFloorAssemblyConfig } from '@/construction/floors/types'
import { MaterialSelectWithEdit } from '@/construction/materials/components/MaterialSelectWithEdit'
import type { MaterialId } from '@/construction/materials/material'
import { LengthField } from '@/shared/components/LengthField/LengthField'
import '@/shared/geometry'

import { FloorAssemblySelect } from './FloorAssemblySelect'
import { getFloorAssemblyTypeIcon } from './Icons'

export interface FloorAssemblyConfigContentProps {
  initialSelectionId?: string
}

export function FloorAssemblyConfigContent({ initialSelectionId }: FloorAssemblyConfigContentProps): React.JSX.Element {
  const floorAssemblyConfigs = useFloorAssemblyConfigs()
  const storeys = useStoreysOrderedByLevel()
  const {
    addFloorAssemblyConfig,
    updateFloorAssemblyConfig,
    duplicateFloorAssemblyConfig,
    removeFloorAssemblyConfig,
    setDefaultFloorAssembly
  } = useConfigActions()

  const defaultConfigId = useDefaultFloorAssemblyId()

  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(() => {
    if (initialSelectionId && floorAssemblyConfigs.some(c => c.id === initialSelectionId)) {
      return initialSelectionId
    }
    return floorAssemblyConfigs.length > 0 ? floorAssemblyConfigs[0].id : null
  })

  const selectedConfig = floorAssemblyConfigs.find(c => c.id === selectedConfigId) ?? null

  const usage = useMemo(
    () => (selectedConfig ? getSlabConfigUsage(selectedConfig.id, storeys) : { isUsed: false, usedByStoreys: [] }),
    [selectedConfig, storeys]
  )

  const handleAddNew = useCallback(
    (type: FloorAssemblyType) => {
      const defaultMaterial = '' as MaterialId
      const newId = createFloorAssemblyId()

      let config: FloorAssemblyConfig
      if (type === 'monolithic') {
        config = {
          id: newId,
          name: 'New Monolithic Slab',
          type: 'monolithic',
          thickness: 180,
          material: defaultMaterial,
          layers: {
            topThickness: 0,
            bottomThickness: 0
          }
        }
      } else {
        config = {
          id: newId,
          name: 'New Joist Slab',
          type: 'joist',
          joistThickness: 60,
          joistHeight: 240,
          joistSpacing: 400,
          joistMaterial: defaultMaterial,
          subfloorThickness: 22,
          subfloorMaterial: defaultMaterial,
          layers: {
            topThickness: 0,
            bottomThickness: 0
          }
        }
      }

      const newConfig = addFloorAssemblyConfig(config)
      setSelectedConfigId(newConfig.id)
    },
    [addFloorAssemblyConfig]
  )

  const handleDuplicate = useCallback(() => {
    if (!selectedConfig) return

    const duplicated = duplicateFloorAssemblyConfig(selectedConfig.id, `${selectedConfig.name} (Copy)`)
    setSelectedConfigId(duplicated.id)
  }, [selectedConfig, duplicateFloorAssemblyConfig])

  const handleDelete = useCallback(() => {
    if (!selectedConfig || usage.isUsed) return

    try {
      const currentIndex = floorAssemblyConfigs.findIndex(c => c.id === selectedConfigId)
      removeFloorAssemblyConfig(selectedConfig.id)

      if (floorAssemblyConfigs.length > 1) {
        const nextConfig = floorAssemblyConfigs[currentIndex + 1] ?? floorAssemblyConfigs[currentIndex - 1]
        setSelectedConfigId(nextConfig?.id ?? null)
      } else {
        setSelectedConfigId(null)
      }
    } catch (error) {
      // Handle error - probably tried to delete last config
      console.error('Failed to delete floor assembly:', error)
    }
  }, [selectedConfig, selectedConfigId, floorAssemblyConfigs, removeFloorAssemblyConfig, usage.isUsed])

  const handleUpdateName = useCallback(
    (name: string) => {
      if (!selectedConfig) return
      updateFloorAssemblyConfig(selectedConfig.id, { ...selectedConfig, name })
    },
    [selectedConfig, updateFloorAssemblyConfig]
  )

  const handleUpdateConfig = useCallback(
    (updates: Partial<Omit<FloorAssemblyConfig, 'id'>>) => {
      if (!selectedConfig) return
      updateFloorAssemblyConfig(selectedConfig.id, { ...selectedConfig, ...updates })
    },
    [selectedConfig, updateFloorAssemblyConfig]
  )

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
                  Monolithic Slab
                </Flex>
              </DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => handleAddNew('joist')}>
                <Flex align="center" gap="1">
                  {React.createElement(getFloorAssemblyTypeIcon('joist'))}
                  Joist Slab
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
                disabled={!selectedConfig || usage.isUsed || floorAssemblyConfigs.length === 1}
                color="red"
                title={
                  !selectedConfig
                    ? 'No config selected'
                    : floorAssemblyConfigs.length === 1
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
              <AlertDialog.Title>Delete Slab Configuration</AlertDialog.Title>
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
      {selectedConfig && (
        <Flex
          direction="column"
          gap="3"
          p="3"
          style={{ border: '1px solid var(--gray-6)', borderRadius: 'var(--radius-2)' }}
        >
          <Grid columns="auto 1fr" gap="2" gapX="3" align="center">
            <Label.Root>
              <Text size="2" weight="medium" color="gray">
                Name
              </Text>
            </Label.Root>
            <TextField.Root
              value={selectedConfig.name}
              onChange={e => handleUpdateName(e.target.value)}
              placeholder="Floor assembly name"
              size="2"
            />

            <Label.Root>
              <Text size="2" weight="medium" color="gray">
                Type
              </Text>
            </Label.Root>
            <Flex gap="2" align="center">
              {React.createElement(getFloorAssemblyTypeIcon(selectedConfig.type))}
              <Text size="2" color="gray">
                {selectedConfig.type === 'monolithic' ? 'Monolithic' : 'Joist'}
              </Text>
            </Flex>
          </Grid>

          <Separator size="4" />

          {selectedConfig.type === 'monolithic' && (
            <MonolithicConfigFields
              config={selectedConfig}
              onUpdate={updates => handleUpdateConfig(updates as Partial<Omit<FloorAssemblyConfig, 'id'>>)}
            />
          )}

          {selectedConfig.type === 'joist' && <JoistConfigPlaceholder />}

          <Separator size="4" />

          <LayersFields config={selectedConfig} onUpdate={handleUpdateConfig} />
        </Flex>
      )}

      {!selectedConfig && floorAssemblyConfigs.length === 0 && (
        <Flex justify="center" align="center" p="5">
          <Text color="gray">No floor assemblies yet. Create one using the "New" button above.</Text>
        </Flex>
      )}

      {/* Defaults Section */}
      <Separator size="4" />
      <Flex direction="column" gap="3">
        <Grid columns="auto 1fr" gap="2" gapX="3" align="center">
          <Label.Root>
            <Text size="2" weight="medium" color="gray">
              Default Slab Configuration
            </Text>
          </Label.Root>
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

function MonolithicConfigFields({
  config,
  onUpdate
}: {
  config: MonolithicFloorAssemblyConfig
  onUpdate: (updates: Omit<MonolithicFloorAssemblyConfig, 'id'>) => void
}) {
  return (
    <>
      <Heading size="2">Monolithic Slab Configuration</Heading>
      <Grid columns="auto 1fr auto 1fr" gap="2" gapX="3" align="center">
        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Material
          </Text>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.material}
          onValueChange={material => onUpdate({ ...config, material })}
          placeholder="Select material..."
          size="2"
        />

        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Thickness
          </Text>
        </Label.Root>
        <LengthField
          value={config.thickness}
          onChange={thickness => onUpdate({ ...config, thickness })}
          unit="mm"
          size="2"
        />
      </Grid>
    </>
  )
}

function JoistConfigPlaceholder() {
  return (
    <>
      <Heading size="2">Joist Configuration</Heading>
      <Callout.Root color="amber">
        <Callout.Text>
          Joist construction is not yet supported. Please use monolithic configuration for now.
        </Callout.Text>
      </Callout.Root>
    </>
  )
}

function LayersFields({
  config,
  onUpdate
}: {
  config: FloorAssemblyConfig
  onUpdate: (updates: Partial<Omit<FloorAssemblyConfig, 'id'>>) => void
}) {
  return (
    <>
      <Heading size="2">Layers</Heading>
      <Grid columns="auto 1fr auto 1fr" gap="2" gapX="3">
        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Top Thickness
          </Text>
        </Label.Root>
        <LengthField
          value={config.layers.topThickness}
          onChange={topThickness => onUpdate({ layers: { ...config.layers, topThickness } })}
          unit="mm"
          size="2"
        />

        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Bottom Thickness
          </Text>
        </Label.Root>
        <LengthField
          value={config.layers.bottomThickness}
          onChange={bottomThickness => onUpdate({ layers: { ...config.layers, bottomThickness } })}
          unit="mm"
          size="2"
        />
      </Grid>
    </>
  )
}
