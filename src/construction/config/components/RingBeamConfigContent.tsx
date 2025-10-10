import { CopyIcon, PlusIcon, SquareIcon, TrashIcon, ViewVerticalIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import {
  AlertDialog,
  Badge,
  Button,
  DropdownMenu,
  Flex,
  Grid,
  IconButton,
  Select,
  Separator,
  Text,
  TextField
} from '@radix-ui/themes'
import React, { useCallback, useMemo, useState } from 'react'

import type { RingBeamConstructionMethodId } from '@/building/model/ids'
import { usePerimeters, useStoreysOrderedByLevel } from '@/building/store'
import { getRingBeamConfigUsage } from '@/construction/config/usage'
import { MaterialSelect } from '@/construction/materials/components/MaterialSelect'
import { LengthField } from '@/shared/components/LengthField/LengthField'
import type { Length } from '@/shared/geometry'

import {
  useConfigActions,
  useDefaultBaseRingBeamMethodId,
  useDefaultTopRingBeamMethodId,
  useRingBeamConstructionMethods
} from '../store'
import type { RingBeamConfig } from './../../ringBeams/ringBeams'

type RingBeamType = 'full' | 'double'

function getRingBeamTypeIcon(type: RingBeamType) {
  switch (type) {
    case 'full':
      return SquareIcon
    case 'double':
      return ViewVerticalIcon
  }
}

export function RingBeamConfigContent(): React.JSX.Element {
  const ringBeamMethods = useRingBeamConstructionMethods()
  const perimeters = usePerimeters()
  const storeys = useStoreysOrderedByLevel()
  const {
    addRingBeamConstructionMethod,
    updateRingBeamConstructionMethodName,
    updateRingBeamConstructionMethodConfig,
    removeRingBeamConstructionMethod,
    setDefaultBaseRingBeamMethod,
    setDefaultTopRingBeamMethod
  } = useConfigActions()

  const defaultBaseId = useDefaultBaseRingBeamMethodId()
  const defaultTopId = useDefaultTopRingBeamMethodId()

  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(
    ringBeamMethods.length > 0 ? ringBeamMethods[0].id : null
  )

  const selectedMethod = ringBeamMethods.find(m => m.id === selectedMethodId) ?? null

  const usage = useMemo(
    () =>
      selectedMethod
        ? getRingBeamConfigUsage(selectedMethod.id, Object.values(perimeters), Object.values(storeys))
        : { isUsed: false, usedByPerimeters: [] },
    [selectedMethod, perimeters, storeys]
  )

  const handleAddNew = useCallback(
    (type: RingBeamType) => {
      const defaultMaterial = '' as any

      let config: RingBeamConfig
      if (type === 'full') {
        config = {
          type: 'full',
          height: 60 as Length,
          material: defaultMaterial,
          width: 360 as Length,
          offsetFromEdge: 0 as Length
        }
      } else {
        config = {
          type: 'double',
          height: 60 as Length,
          material: defaultMaterial,
          thickness: 120 as Length,
          infillMaterial: defaultMaterial,
          offsetFromEdge: 0 as Length,
          spacing: 100 as Length
        }
      }

      const newMethod = addRingBeamConstructionMethod(`New ${type} ring beam`, config)
      setSelectedMethodId(newMethod.id)
    },
    [addRingBeamConstructionMethod]
  )

  const handleDuplicate = useCallback(() => {
    if (!selectedMethod) return

    const duplicated = addRingBeamConstructionMethod(`${selectedMethod.name} (Copy)`, selectedMethod.config)
    setSelectedMethodId(duplicated.id)
  }, [selectedMethod, addRingBeamConstructionMethod])

  const handleDelete = useCallback(() => {
    if (!selectedMethod || usage.isUsed) return

    const currentIndex = ringBeamMethods.findIndex(m => m.id === selectedMethodId)
    removeRingBeamConstructionMethod(selectedMethod.id)

    if (ringBeamMethods.length > 1) {
      const nextMethod = ringBeamMethods[currentIndex + 1] ?? ringBeamMethods[currentIndex - 1]
      setSelectedMethodId(nextMethod?.id ?? null)
    } else {
      setSelectedMethodId(null)
    }
  }, [selectedMethod, selectedMethodId, ringBeamMethods, removeRingBeamConstructionMethod, usage.isUsed])

  const handleUpdateName = useCallback(
    (name: string) => {
      if (!selectedMethod) return
      updateRingBeamConstructionMethodName(selectedMethod.id, name)
    },
    [selectedMethod, updateRingBeamConstructionMethodName]
  )

  const handleUpdateConfig = useCallback(
    (updates: Partial<RingBeamConfig>) => {
      if (!selectedMethod) return
      const updatedConfig = { ...selectedMethod.config, ...updates } as RingBeamConfig
      updateRingBeamConstructionMethodConfig(selectedMethod.id, updatedConfig)
    },
    [selectedMethod, updateRingBeamConstructionMethodConfig]
  )

  return (
    <Flex direction="column" gap="4" width="100%">
      {/* Selector + Actions */}
      <Flex direction="column" gap="2">
        <Flex gap="2" align="end">
          <Flex direction="column" gap="1" flexGrow="1">
            <Select.Root value={selectedMethodId ?? ''} onValueChange={setSelectedMethodId}>
              <Select.Trigger placeholder="Select ring beam method..." />
              <Select.Content>
                {ringBeamMethods.map(method => {
                  const Icon = getRingBeamTypeIcon(method.config.type)
                  const isDefault = method.id === defaultBaseId || method.id === defaultTopId
                  return (
                    <Select.Item key={method.id} value={method.id}>
                      <Flex align="center" gap="2">
                        <Icon style={{ flexShrink: 0 }} />
                        <Text>
                          {method.name}
                          {isDefault && <Text color="gray"> (default)</Text>}
                        </Text>
                      </Flex>
                    </Select.Item>
                  )
                })}
              </Select.Content>
            </Select.Root>
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
                  <SquareIcon />
                  Full Ring Beam
                </Flex>
              </DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => handleAddNew('double')}>
                <Flex align="center" gap="1">
                  <ViewVerticalIcon />
                  Double Ring Beam
                </Flex>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>

          <IconButton onClick={handleDuplicate} disabled={!selectedMethod} title="Duplicate" variant="soft">
            <CopyIcon />
          </IconButton>

          <AlertDialog.Root>
            <AlertDialog.Trigger>
              <IconButton
                disabled={!selectedMethod || usage.isUsed}
                color="red"
                title={usage.isUsed ? 'In Use - Cannot Delete' : 'Delete'}
              >
                <TrashIcon />
              </IconButton>
            </AlertDialog.Trigger>
            <AlertDialog.Content>
              <AlertDialog.Title>Delete Ring Beam Method</AlertDialog.Title>
              <AlertDialog.Description>
                Are you sure you want to delete "{selectedMethod?.name}"? This action cannot be undone.
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
      {selectedMethod && (
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
              value={selectedMethod.name}
              onChange={e => handleUpdateName(e.target.value)}
              placeholder="Ring beam method name"
              size="2"
            />

            <Label.Root>
              <Text size="2" weight="medium" color="gray">
                Type
              </Text>
            </Label.Root>
            <Flex gap="2" align="center">
              {selectedMethod.config.type === 'full' ? <SquareIcon /> : <ViewVerticalIcon />}
              <Text size="2" color="gray">
                {selectedMethod.config.type == 'full' ? 'Full' : 'Double'}
              </Text>
            </Flex>
          </Grid>

          {selectedMethod.config.type === 'full' && (
            <FullRingBeamFields config={selectedMethod.config} onUpdate={handleUpdateConfig} />
          )}

          {selectedMethod.config.type === 'double' && (
            <DoubleRingBeamFields config={selectedMethod.config} onUpdate={handleUpdateConfig} />
          )}
        </Flex>
      )}

      {!selectedMethod && ringBeamMethods.length === 0 && (
        <Flex justify="center" align="center" p="5">
          <Text color="gray">No ring beam methods yet. Create one using the "New" button above.</Text>
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
          <Select.Root
            value={defaultBaseId ?? 'none'}
            onValueChange={value =>
              setDefaultBaseRingBeamMethod(value === 'none' ? undefined : (value as RingBeamConstructionMethodId))
            }
          >
            <Select.Trigger placeholder="Select default..." />
            <Select.Content>
              <Select.Item value="none">
                <Text color="gray">None</Text>
              </Select.Item>
              {ringBeamMethods.map(method => (
                <Select.Item key={method.id} value={method.id}>
                  {method.name}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>

          <Label.Root>
            <Text size="2" weight="medium" color="gray">
              Default Top Plate
            </Text>
          </Label.Root>
          <Select.Root
            value={defaultTopId ?? 'none'}
            onValueChange={value =>
              setDefaultTopRingBeamMethod(value === 'none' ? undefined : (value as RingBeamConstructionMethodId))
            }
          >
            <Select.Trigger placeholder="Select default..." />
            <Select.Content>
              <Select.Item value="none">
                <Text color="gray">None</Text>
              </Select.Item>
              {ringBeamMethods.map(method => (
                <Select.Item key={method.id} value={method.id}>
                  {method.name}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
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
        <MaterialSelect
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
      <Grid columns="auto 1fr auto 1fr" gap="2" gapX="3" align="center">
        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Material
          </Text>
        </Label.Root>
        <MaterialSelect
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
        <MaterialSelect
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
