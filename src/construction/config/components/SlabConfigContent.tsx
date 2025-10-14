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

import type { SlabConstructionConfigId } from '@/building/model/ids'
import { createSlabConstructionConfigId } from '@/building/model/ids'
import { useStoreysOrderedByLevel } from '@/building/store'
import { useConfigActions, useDefaultSlabConfigId, useSlabConstructionConfigs } from '@/construction/config/store'
import type {
  MonolithicSlabConstructionConfig,
  SlabConstructionConfig,
  SlabConstructionType
} from '@/construction/config/types'
import { getSlabConfigUsage } from '@/construction/config/usage'
import { MaterialSelectWithEdit } from '@/construction/materials/components/MaterialSelectWithEdit'
import type { MaterialId } from '@/construction/materials/material'
import { LengthField } from '@/shared/components/LengthField/LengthField'
import { createLength } from '@/shared/geometry'

import { getSlabConstructionTypeIcon } from './Icons'
import { SlabConfigSelect } from './SlabConfigSelect'

export interface SlabConfigContentProps {
  initialSelectionId?: string
}

export function SlabConfigContent({ initialSelectionId }: SlabConfigContentProps): React.JSX.Element {
  const slabConfigs = useSlabConstructionConfigs()
  const storeys = useStoreysOrderedByLevel()
  const {
    addSlabConstructionConfig,
    updateSlabConstructionConfig,
    duplicateSlabConstructionConfig,
    removeSlabConstructionConfig,
    setDefaultSlabConfig
  } = useConfigActions()

  const defaultConfigId = useDefaultSlabConfigId()

  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(() => {
    if (initialSelectionId && slabConfigs.some(c => c.id === initialSelectionId)) {
      return initialSelectionId
    }
    return slabConfigs.length > 0 ? slabConfigs[0].id : null
  })

  const selectedConfig = slabConfigs.find(c => c.id === selectedConfigId) ?? null

  const usage = useMemo(
    () => (selectedConfig ? getSlabConfigUsage(selectedConfig.id, storeys) : { isUsed: false, usedByStoreys: [] }),
    [selectedConfig, storeys]
  )

  const handleAddNew = useCallback(
    (type: SlabConstructionType) => {
      const defaultMaterial = '' as MaterialId
      const newId = createSlabConstructionConfigId()

      let config: SlabConstructionConfig
      if (type === 'monolithic') {
        config = {
          id: newId,
          name: 'New Monolithic Slab',
          type: 'monolithic',
          thickness: createLength(180),
          material: defaultMaterial,
          layers: {
            topThickness: createLength(0),
            bottomThickness: createLength(0)
          }
        }
      } else {
        config = {
          id: newId,
          name: 'New Joist Slab',
          type: 'joist',
          joistThickness: createLength(60),
          joistHeight: createLength(240),
          joistSpacing: createLength(400),
          joistMaterial: defaultMaterial,
          subfloorThickness: createLength(22),
          subfloorMaterial: defaultMaterial,
          layers: {
            topThickness: createLength(0),
            bottomThickness: createLength(0)
          }
        }
      }

      const newConfig = addSlabConstructionConfig(config)
      setSelectedConfigId(newConfig.id)
    },
    [addSlabConstructionConfig]
  )

  const handleDuplicate = useCallback(() => {
    if (!selectedConfig) return

    const duplicated = duplicateSlabConstructionConfig(selectedConfig.id, `${selectedConfig.name} (Copy)`)
    setSelectedConfigId(duplicated.id)
  }, [selectedConfig, duplicateSlabConstructionConfig])

  const handleDelete = useCallback(() => {
    if (!selectedConfig || usage.isUsed) return

    try {
      const currentIndex = slabConfigs.findIndex(c => c.id === selectedConfigId)
      removeSlabConstructionConfig(selectedConfig.id)

      if (slabConfigs.length > 1) {
        const nextConfig = slabConfigs[currentIndex + 1] ?? slabConfigs[currentIndex - 1]
        setSelectedConfigId(nextConfig?.id ?? null)
      } else {
        setSelectedConfigId(null)
      }
    } catch (error) {
      // Handle error - probably tried to delete last config
      console.error('Failed to delete slab config:', error)
    }
  }, [selectedConfig, selectedConfigId, slabConfigs, removeSlabConstructionConfig, usage.isUsed])

  const handleUpdateName = useCallback(
    (name: string) => {
      if (!selectedConfig) return
      updateSlabConstructionConfig(selectedConfig.id, { ...selectedConfig, name })
    },
    [selectedConfig, updateSlabConstructionConfig]
  )

  const handleUpdateConfig = useCallback(
    (updates: Partial<Omit<SlabConstructionConfig, 'id'>>) => {
      if (!selectedConfig) return
      updateSlabConstructionConfig(selectedConfig.id, { ...selectedConfig, ...updates })
    },
    [selectedConfig, updateSlabConstructionConfig]
  )

  return (
    <Flex direction="column" gap="4" width="100%">
      {/* Selector + Actions */}
      <Flex direction="column" gap="2">
        <Flex gap="2" align="end">
          <Flex direction="column" gap="1" flexGrow="1">
            <SlabConfigSelect
              value={selectedConfigId as SlabConstructionConfigId | undefined}
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
                  {React.createElement(getSlabConstructionTypeIcon('monolithic'))}
                  Monolithic Slab
                </Flex>
              </DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => handleAddNew('joist')}>
                <Flex align="center" gap="1">
                  {React.createElement(getSlabConstructionTypeIcon('joist'))}
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
                disabled={!selectedConfig || usage.isUsed || slabConfigs.length === 1}
                color="red"
                title={
                  !selectedConfig
                    ? 'No config selected'
                    : slabConfigs.length === 1
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
              placeholder="Slab configuration name"
              size="2"
            />

            <Label.Root>
              <Text size="2" weight="medium" color="gray">
                Type
              </Text>
            </Label.Root>
            <Flex gap="2" align="center">
              {React.createElement(getSlabConstructionTypeIcon(selectedConfig.type))}
              <Text size="2" color="gray">
                {selectedConfig.type === 'monolithic' ? 'Monolithic' : 'Joist'}
              </Text>
            </Flex>
          </Grid>

          <Separator size="4" />

          {selectedConfig.type === 'monolithic' && (
            <MonolithicConfigFields
              config={selectedConfig}
              onUpdate={updates => handleUpdateConfig(updates as Partial<Omit<SlabConstructionConfig, 'id'>>)}
            />
          )}

          {selectedConfig.type === 'joist' && <JoistConfigPlaceholder />}

          <Separator size="4" />

          <LayersFields config={selectedConfig} onUpdate={handleUpdateConfig} />
        </Flex>
      )}

      {!selectedConfig && slabConfigs.length === 0 && (
        <Flex justify="center" align="center" p="5">
          <Text color="gray">No slab configurations yet. Create one using the "New" button above.</Text>
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
          <SlabConfigSelect
            value={defaultConfigId}
            onValueChange={setDefaultSlabConfig}
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
  config: MonolithicSlabConstructionConfig
  onUpdate: (updates: Omit<MonolithicSlabConstructionConfig, 'id'>) => void
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
          Joist slab construction is not yet supported. Please use monolithic configuration for now.
        </Callout.Text>
      </Callout.Root>
    </>
  )
}

function LayersFields({
  config,
  onUpdate
}: {
  config: SlabConstructionConfig
  onUpdate: (updates: Partial<Omit<SlabConstructionConfig, 'id'>>) => void
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
