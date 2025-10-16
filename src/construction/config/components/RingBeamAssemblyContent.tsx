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
  IconButton,
  Separator,
  Text,
  TextField
} from '@radix-ui/themes'
import React, { useCallback, useMemo, useState } from 'react'

import type { RingBeamAssemblyId } from '@/building/model/ids'
import { usePerimeters, useStoreysOrderedByLevel } from '@/building/store'
import {
  useConfigActions,
  useDefaultBaseRingBeamAssemblyId,
  useDefaultTopRingBeamAssemblyId,
  useRingBeamAssemblies
} from '@/construction/config/store'
import { getRingBeamAssemblyUsage } from '@/construction/config/usage'
import { MaterialSelectWithEdit } from '@/construction/materials/components/MaterialSelectWithEdit'
import type { MaterialId } from '@/construction/materials/material'
import type { RingBeamConfig } from '@/construction/ringBeams'
import { LengthField } from '@/shared/components/LengthField/LengthField'

import { getRingBeamTypeIcon } from './Icons'
import { RingBeamAssemblySelect } from './RingBeamAssemblySelect'

type RingBeamType = 'full' | 'double'

export interface RingBeamAssemblyContentProps {
  initialSelectionId?: string
}

export function RingBeamAssemblyContent({ initialSelectionId }: RingBeamAssemblyContentProps): React.JSX.Element {
  const ringBeamAssemblies = useRingBeamAssemblies()
  const perimeters = usePerimeters()
  const storeys = useStoreysOrderedByLevel()
  const {
    addRingBeamAssembly,
    updateRingBeamAssemblyName,
    updateRingBeamAssemblyConfig,
    removeRingBeamAssembly,
    setDefaultBaseRingBeamAssembly,
    setDefaultTopRingBeamAssembly
  } = useConfigActions()

  const defaultBaseId = useDefaultBaseRingBeamAssemblyId()
  const defaultTopId = useDefaultTopRingBeamAssemblyId()

  const [selectedAssemblyId, setSelectedAssemblyId] = useState<string | null>(() => {
    if (initialSelectionId && ringBeamAssemblies.some(m => m.id === initialSelectionId)) {
      return initialSelectionId
    }
    return ringBeamAssemblies.length > 0 ? ringBeamAssemblies[0].id : null
  })

  const selectedAssembly = ringBeamAssemblies.find(m => m.id === selectedAssemblyId) ?? null

  const usage = useMemo(
    () =>
      selectedAssembly
        ? getRingBeamAssemblyUsage(selectedAssembly.id, Object.values(perimeters), Object.values(storeys))
        : { isUsed: false, usedByPerimeters: [] },
    [selectedAssembly, perimeters, storeys]
  )

  const handleAddNew = useCallback(
    (type: RingBeamType) => {
      const defaultMaterial = '' as MaterialId

      let config: RingBeamConfig
      if (type === 'full') {
        config = {
          type: 'full',
          height: 60,
          material: defaultMaterial,
          width: 360,
          offsetFromEdge: 0
        }
      } else {
        config = {
          type: 'double',
          height: 60,
          material: defaultMaterial,
          thickness: 120,
          infillMaterial: defaultMaterial,
          offsetFromEdge: 0,
          spacing: 100
        }
      }

      const newAssembly = addRingBeamAssembly(`New ${type} ring beam`, config)
      setSelectedAssemblyId(newAssembly.id)
    },
    [addRingBeamAssembly]
  )

  const handleDuplicate = useCallback(() => {
    if (!selectedAssembly) return

    const { id: _id, name: _name, ...config } = selectedAssembly
    const duplicated = addRingBeamAssembly(`${selectedAssembly.name} (Copy)`, config)
    setSelectedAssemblyId(duplicated.id)
  }, [selectedAssembly, addRingBeamAssembly])

  const handleDelete = useCallback(() => {
    if (!selectedAssembly || usage.isUsed) return

    const currentIndex = ringBeamAssemblies.findIndex(m => m.id === selectedAssemblyId)
    removeRingBeamAssembly(selectedAssembly.id)

    if (ringBeamAssemblies.length > 1) {
      const nextAssembly = ringBeamAssemblies[currentIndex + 1] ?? ringBeamAssemblies[currentIndex - 1]
      setSelectedAssemblyId(nextAssembly?.id ?? null)
    } else {
      setSelectedAssemblyId(null)
    }
  }, [selectedAssembly, selectedAssemblyId, ringBeamAssemblies, removeRingBeamAssembly, usage.isUsed])

  const handleUpdateName = useCallback(
    (name: string) => {
      if (!selectedAssembly) return
      updateRingBeamAssemblyName(selectedAssembly.id, name)
    },
    [selectedAssembly, updateRingBeamAssemblyName]
  )

  const handleUpdateConfig = useCallback(
    (updates: Partial<RingBeamConfig>) => {
      if (!selectedAssembly) return
      const { id: _id, ...config } = selectedAssembly
      const updatedConfig = { ...config, ...updates }
      updateRingBeamAssemblyConfig(selectedAssembly.id, updatedConfig)
    },
    [selectedAssembly, updateRingBeamAssemblyConfig]
  )

  return (
    <Flex direction="column" gap="4" width="100%">
      {/* Selector + Actions */}
      <Flex direction="column" gap="2">
        <Flex gap="2" align="end">
          <Flex direction="column" gap="1" flexGrow="1">
            <RingBeamAssemblySelect
              value={selectedAssemblyId as RingBeamAssemblyId | undefined}
              onValueChange={value => setSelectedAssemblyId(value ?? null)}
              showDefaultIndicator
              defaultAssemblyIds={[defaultBaseId, defaultTopId].filter(Boolean) as RingBeamAssemblyId[]}
            />
          </Flex>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <IconButton title="Add New">
                <PlusIcon />
              </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item onSelect={() => handleAddNew('full')}>
                <Flex align="center" gap="1">
                  {React.createElement(getRingBeamTypeIcon('full'))}
                  Full Ring Beam
                </Flex>
              </DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => handleAddNew('double')}>
                <Flex align="center" gap="1">
                  {React.createElement(getRingBeamTypeIcon('double'))}
                  Double Ring Beam
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
              <AlertDialog.Title>Delete Ring Beam Assembly</AlertDialog.Title>
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
      </Flex>

      {/* Form */}
      {selectedAssembly && (
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
              value={selectedAssembly.name}
              onChange={e => handleUpdateName(e.target.value)}
              placeholder="Ring beam assembly name"
              size="2"
            />

            <Label.Root>
              <Text size="2" weight="medium" color="gray">
                Type
              </Text>
            </Label.Root>
            <Flex gap="2" align="center">
              {React.createElement(getRingBeamTypeIcon(selectedAssembly.type))}
              <Text size="2" color="gray">
                {selectedAssembly.type === 'full' ? 'Full' : 'Double'}
              </Text>
            </Flex>
          </Grid>

          {selectedAssembly.type === 'full' && (
            <FullRingBeamFields config={selectedAssembly} onUpdate={handleUpdateConfig} />
          )}

          {selectedAssembly.type === 'double' && (
            <DoubleRingBeamFields config={selectedAssembly} onUpdate={handleUpdateConfig} />
          )}
        </Flex>
      )}

      {!selectedAssembly && ringBeamAssemblies.length === 0 && (
        <Flex justify="center" align="center" p="5">
          <Text color="gray">No ring beam assemblies yet. Create one using the "New" button above.</Text>
        </Flex>
      )}

      {/* Defaults Section */}
      <Separator size="4" />
      <Flex direction="column" gap="3">
        <Grid columns="auto 1fr auto 1fr" gap="2" gapX="3" align="center">
          <Label.Root>
            <Text size="2" weight="medium" color="gray">
              Default Base Plate
            </Text>
          </Label.Root>
          <RingBeamAssemblySelect
            value={defaultBaseId}
            onValueChange={setDefaultBaseRingBeamAssembly}
            placeholder="Select default..."
            size="2"
            allowNone
          />

          <Label.Root>
            <Text size="2" weight="medium" color="gray">
              Default Top Plate
            </Text>
          </Label.Root>
          <RingBeamAssemblySelect
            value={defaultTopId}
            onValueChange={setDefaultTopRingBeamAssembly}
            placeholder="Select default..."
            size="2"
            allowNone
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
              {usage.usedByPerimeters.map((use, index) => (
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

function FullRingBeamFields({
  config,
  onUpdate
}: {
  config: RingBeamConfig & { type: 'full' }
  onUpdate: (updates: Partial<RingBeamConfig>) => void
}) {
  return (
    <>
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

        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Height
          </Text>
        </Label.Root>
        <LengthField value={config.height} onChange={height => onUpdate({ height })} unit="mm" size="2" />

        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Width
          </Text>
        </Label.Root>
        <LengthField value={config.width} onChange={width => onUpdate({ width })} unit="mm" size="2" />

        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Offset from Edge
          </Text>
        </Label.Root>
        <LengthField
          value={config.offsetFromEdge}
          onChange={offsetFromEdge => onUpdate({ offsetFromEdge })}
          unit="mm"
          size="2"
        />
      </Grid>
    </>
  )
}

function DoubleRingBeamFields({
  config,
  onUpdate
}: {
  config: RingBeamConfig & { type: 'double' }
  onUpdate: (updates: Partial<RingBeamConfig>) => void
}) {
  return (
    <>
      <Callout.Root color="amber">
        <Callout.Text>
          Double ring beam construction is not yet supported. Please use a full ring beam configuration for now.
        </Callout.Text>
      </Callout.Root>

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

        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Infill Material
          </Text>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.infillMaterial}
          onValueChange={infillMaterial => onUpdate({ infillMaterial })}
          placeholder="Select infill material..."
          size="2"
        />

        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Height
          </Text>
        </Label.Root>
        <LengthField value={config.height} onChange={height => onUpdate({ height })} unit="mm" size="2" />

        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Thickness
          </Text>
        </Label.Root>
        <LengthField value={config.thickness} onChange={thickness => onUpdate({ thickness })} unit="mm" size="2" />

        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Spacing
          </Text>
        </Label.Root>
        <LengthField value={config.spacing} onChange={spacing => onUpdate({ spacing })} unit="mm" size="2" />

        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Offset from Edge
          </Text>
        </Label.Root>
        <LengthField
          value={config.offsetFromEdge}
          onChange={offsetFromEdge => onUpdate({ offsetFromEdge })}
          unit="mm"
          size="2"
        />
      </Grid>
    </>
  )
}
