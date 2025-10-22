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
import { useStoreysOrderedByLevel } from '@/building/store'
import { useConfigActions, useDefaultFloorAssemblyId, useFloorAssemblies } from '@/construction/config/store'
import { getFloorAssemblyUsage } from '@/construction/config/usage'
import type { FloorAssemblyType, FloorConfig, MonolithicFloorConfig } from '@/construction/floors/types'
import { MaterialSelectWithEdit } from '@/construction/materials/components/MaterialSelectWithEdit'
import type { MaterialId } from '@/construction/materials/material'
import { MeasurementInfo } from '@/editor/components/MeasurementInfo'
import { LengthField } from '@/shared/components/LengthField/LengthField'
import '@/shared/geometry'

import { FloorAssemblySelect } from './FloorAssemblySelect'
import { getFloorAssemblyTypeIcon } from './Icons'

export interface FloorAssemblyConfigContentProps {
  initialSelectionId?: string
}

export function FloorAssemblyConfigContent({ initialSelectionId }: FloorAssemblyConfigContentProps): React.JSX.Element {
  const floorAssemblies = useFloorAssemblies()
  const storeys = useStoreysOrderedByLevel()
  const {
    addFloorAssembly,
    updateFloorAssemblyName,
    updateFloorAssemblyConfig,
    duplicateFloorAssembly,
    removeFloorAssembly,
    setDefaultFloorAssembly
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
            bottomThickness: 0
          }
        }
      } else {
        name = 'New Joist Floor'
        config = {
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

  const handleUpdateName = useCallback(
    (name: string) => {
      if (!selectedConfig) return
      updateFloorAssemblyName(selectedConfig.id, name)
    },
    [selectedConfig, updateFloorAssemblyName]
  )

  const handleUpdateConfig = useCallback(
    (updates: Partial<FloorConfig>) => {
      if (!selectedConfig) return
      updateFloorAssemblyConfig(selectedConfig.id, updates)
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
                  Monolithic Floor
                </Flex>
              </DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => handleAddNew('joist')}>
                <Flex align="center" gap="1">
                  {React.createElement(getFloorAssemblyTypeIcon('joist'))}
                  Joist Floor
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
            <MonolithicConfigFields config={selectedConfig} onUpdate={handleUpdateConfig} />
          )}

          {selectedConfig.type === 'joist' && <JoistConfigPlaceholder />}

          <Separator size="4" />

          <LayersFields config={selectedConfig} onUpdate={handleUpdateConfig} />
        </Flex>
      )}

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
          onValueChange={material => onUpdate({ material })}
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
  config: FloorConfig
  onUpdate: (updates: Partial<FloorConfig>) => void
}) {
  return (
    <>
      <Heading size="2">Layers</Heading>
      <Grid columns="auto 1fr auto 1fr" gap="2" gapX="3">
        <Flex align="center" gap="1">
          <Label.Root>
            <Text size="2" weight="medium" color="gray">
              Top Thickness
            </Text>
          </Label.Root>
          <MeasurementInfo highlightedPart="floorTopLayers" />
        </Flex>
        <LengthField
          value={config.layers.topThickness}
          onChange={topThickness => onUpdate({ layers: { ...config.layers, topThickness } })}
          unit="mm"
          size="2"
        />

        <Flex align="center" gap="1">
          <Label.Root>
            <Text size="2" weight="medium" color="gray">
              Bottom Thickness
            </Text>
          </Label.Root>
          <MeasurementInfo highlightedPart="floorBottomLayers" />
        </Flex>
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
