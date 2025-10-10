import {
  CircleIcon,
  CopyIcon,
  Cross2Icon,
  CubeIcon,
  LayersIcon,
  OpacityIcon,
  PlusIcon,
  TrashIcon
} from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import { AlertDialog, Badge, Button, DropdownMenu, Flex, Grid, IconButton, Text, TextField } from '@radix-ui/themes'
import React, { useCallback, useState } from 'react'

import { usePerimeterConstructionMethods, useRingBeamConstructionMethods } from '@/construction/config/store'
import { LengthField } from '@/shared/components/LengthField/LengthField'
import type { Length } from '@/shared/geometry'

import type {
  DimensionalMaterial,
  GenericMaterial,
  Material,
  MaterialId,
  SheetMaterial,
  VolumeMaterial
} from '../material'
import { useMaterialActions, useMaterials } from '../store'
import { getMaterialUsage } from '../usage'
import { MaterialSelect, getMaterialTypeIcon, getMaterialTypeName } from './MaterialSelect'

export interface MaterialsConfigModalProps {
  trigger: React.ReactNode
}

type MaterialType = Material['type']

export function MaterialsConfigContent(): React.JSX.Element {
  const materials = useMaterials()
  const { addMaterial, updateMaterial, removeMaterial, duplicateMaterial } = useMaterialActions()
  const ringBeamMethods = useRingBeamConstructionMethods()
  const perimeterMethods = usePerimeterConstructionMethods()

  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(
    materials.length > 0 ? materials[0].id : null
  )

  const selectedMaterial = materials.find(m => m.id === selectedMaterialId) ?? null

  const usage = React.useMemo(
    () =>
      selectedMaterial
        ? getMaterialUsage(selectedMaterial.id, ringBeamMethods, perimeterMethods)
        : { isUsed: false, usedByConfigs: [] },
    [selectedMaterial, ringBeamMethods, perimeterMethods]
  )

  const handleAddNew = useCallback(
    (type: MaterialType) => {
      let newMaterial: Material

      switch (type) {
        case 'dimensional':
          newMaterial = addMaterial({
            name: 'New dimensional material',
            type: 'dimensional',
            color: '#808080',
            width: 100 as Length,
            thickness: 50 as Length,
            availableLengths: [3000 as Length]
          } as Omit<DimensionalMaterial, 'id'>)
          break
        case 'sheet':
          newMaterial = addMaterial({
            name: 'New sheet material',
            type: 'sheet',
            color: '#808080',
            width: 1000 as Length,
            length: 2000 as Length,
            thickness: 10 as Length
          } as Omit<SheetMaterial, 'id'>)
          break
        case 'volume':
          newMaterial = addMaterial({
            name: 'New volume material',
            type: 'volume',
            color: '#808080',
            availableVolumes: [1000]
          } as Omit<VolumeMaterial, 'id'>)
          break
        case 'generic':
          newMaterial = addMaterial({
            name: 'New generic material',
            type: 'generic',
            color: '#808080'
          } as Omit<GenericMaterial, 'id'>)
          break
      }

      setSelectedMaterialId(newMaterial.id)
    },
    [addMaterial]
  )

  const handleDuplicate = useCallback(() => {
    if (!selectedMaterial) return

    const duplicated = duplicateMaterial(selectedMaterial.id, `${selectedMaterial.name} (Copy)`)
    setSelectedMaterialId(duplicated.id)
  }, [selectedMaterial, duplicateMaterial])

  const handleDelete = useCallback(() => {
    if (!selectedMaterial || usage.isUsed) return

    const currentIndex = materials.findIndex(m => m.id === selectedMaterialId)
    removeMaterial(selectedMaterial.id)

    if (materials.length > 1) {
      const nextMaterial = materials[currentIndex + 1] ?? materials[currentIndex - 1]
      setSelectedMaterialId(nextMaterial?.id ?? null)
    } else {
      setSelectedMaterialId(null)
    }
  }, [selectedMaterial, selectedMaterialId, materials, removeMaterial, usage.isUsed])

  const handleUpdate = useCallback(
    (updates: Partial<Omit<Material, 'id' | 'type'>>) => {
      if (!selectedMaterial) return
      updateMaterial(selectedMaterial.id, updates)
    },
    [selectedMaterial, updateMaterial]
  )

  const Icon = selectedMaterial ? getMaterialTypeIcon(selectedMaterial.type) : null

  return (
    <Flex direction="column" gap="4" style={{ width: '100%' }}>
      {/* Selector + Actions */}
      <Flex gap="2" align="center" width="100%">
        <Flex direction="column" flexGrow="1">
          <MaterialSelect
            value={(selectedMaterialId ?? undefined) as MaterialId | undefined}
            onValueChange={setSelectedMaterialId}
            placeholder="Select material..."
          />
        </Flex>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <IconButton title="Add New">
              <PlusIcon />
            </IconButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Item onSelect={() => handleAddNew('dimensional')}>
              <Flex align="center" gap="1">
                <CubeIcon />
                Dimensional
              </Flex>
            </DropdownMenu.Item>
            <DropdownMenu.Item onSelect={() => handleAddNew('sheet')}>
              <Flex align="center" gap="1">
                <LayersIcon />
                Sheet
              </Flex>
            </DropdownMenu.Item>
            <DropdownMenu.Item onSelect={() => handleAddNew('volume')}>
              <Flex align="center" gap="1">
                <OpacityIcon />
                Volume
              </Flex>
            </DropdownMenu.Item>
            <DropdownMenu.Item onSelect={() => handleAddNew('generic')}>
              <Flex align="center" gap="1">
                <CircleIcon />
                Generic
              </Flex>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
        <IconButton onClick={handleDuplicate} disabled={!selectedMaterial} title="Duplicate" variant="soft">
          <CopyIcon />
        </IconButton>
        <AlertDialog.Root>
          <AlertDialog.Trigger>
            <IconButton
              disabled={!selectedMaterial || usage.isUsed}
              color="red"
              title={usage.isUsed ? 'In Use - Cannot Delete' : 'Delete'}
            >
              <TrashIcon />
            </IconButton>
          </AlertDialog.Trigger>
          <AlertDialog.Content>
            <AlertDialog.Title>Delete Material</AlertDialog.Title>
            <AlertDialog.Description>
              Are you sure you want to delete "{selectedMaterial?.name}"? This action cannot be undone.
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

      {/* Form */}
      {selectedMaterial && (
        <Flex
          direction="column"
          gap="3"
          p="3"
          style={{ border: '1px solid var(--gray-6)', borderRadius: 'var(--radius-2)' }}
        >
          <Grid columns="4em 1fr" gap="2" gapX="3" align="center">
            <Label.Root>
              <Text size="2" weight="medium" color="gray">
                Name
              </Text>
            </Label.Root>
            <TextField.Root
              value={selectedMaterial.name}
              onChange={e => handleUpdate({ name: e.target.value })}
              placeholder="Material name"
              size="2"
            />
          </Grid>
          <Grid columns="4em 1fr 4em 1fr" gap="2" gapX="3" align="center">
            <Label.Root>
              <Text size="2" weight="medium" color="gray">
                Type
              </Text>
            </Label.Root>
            <Flex gap="2" align="center">
              {Icon && <Icon width="12" height="12" />}
              <Text size="2" color="gray">
                {getMaterialTypeName(selectedMaterial.type)}
              </Text>
            </Flex>

            <Label.Root>
              <Text size="2" weight="medium" color="gray">
                Color
              </Text>
            </Label.Root>
            <input
              type="color"
              value={selectedMaterial.color}
              onChange={e => handleUpdate({ color: e.target.value })}
              style={{ width: '60px', height: '24px', cursor: 'pointer' }}
            />
          </Grid>

          {selectedMaterial.type === 'dimensional' && (
            <DimensionalMaterialFields material={selectedMaterial} onUpdate={handleUpdate} />
          )}

          {selectedMaterial.type === 'sheet' && (
            <SheetMaterialFields material={selectedMaterial} onUpdate={handleUpdate} />
          )}

          {selectedMaterial.type === 'volume' && (
            <VolumeMaterialFields material={selectedMaterial} onUpdate={handleUpdate} />
          )}
        </Flex>
      )}

      {!selectedMaterial && materials.length === 0 && (
        <Flex justify="center" align="center" p="5">
          <Text color="gray">No materials yet. Create one using the "New" button above.</Text>
        </Flex>
      )}

      {usage.isUsed && (
        <Grid columns="auto 1fr" gap="2" gapX="3" align="baseline">
          <Label.Root>
            <Text size="2" weight="medium" color="gray">
              Used By:
            </Text>
          </Label.Root>
          <Flex gap="1" wrap="wrap">
            {usage.usedByConfigs.map((use, index) => (
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

function DimensionalMaterialFields({
  material,
  onUpdate
}: {
  material: DimensionalMaterial
  onUpdate: (updates: Partial<DimensionalMaterial>) => void
}) {
  const [newLengthInput, setNewLengthInput] = useState<Length>(3000 as Length)

  const handleAddLength = useCallback(() => {
    if (material.availableLengths.includes(newLengthInput)) {
      return
    }

    const updated = [...material.availableLengths, newLengthInput].sort((a, b) => a - b)
    onUpdate({ availableLengths: updated as Length[] })
    setNewLengthInput(3000 as Length)
  }, [material.availableLengths, newLengthInput, onUpdate])

  const handleRemoveLength = useCallback(
    (lengthToRemove: Length) => {
      const updated = material.availableLengths.filter(l => l !== lengthToRemove)
      onUpdate({ availableLengths: updated })
    },
    [material.availableLengths, onUpdate]
  )

  return (
    <>
      {/* Compact 2x4 Grid for Width and Thickness */}
      <Grid columns="4em 1fr 4em 1fr" rows="1" gap="2" gapX="3" align="center">
        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Width
          </Text>
        </Label.Root>
        <LengthField value={material.width} onChange={width => onUpdate({ width })} unit="mm" size="2" />

        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Thickness
          </Text>
        </Label.Root>
        <LengthField value={material.thickness} onChange={thickness => onUpdate({ thickness })} unit="mm" size="2" />
      </Grid>

      <Flex direction="column" gap="2">
        <Text size="2" weight="medium" color="gray">
          Available Lengths
        </Text>

        <Flex gap="2" wrap="wrap">
          {material.availableLengths.map(length => (
            <Badge key={length} size="3" variant="soft">
              <Flex align="center" gap="1">
                {length}mm
                <IconButton
                  size="2"
                  variant="ghost"
                  color="gray"
                  onClick={() => handleRemoveLength(length)}
                  style={{ cursor: 'pointer', marginLeft: '4px' }}
                >
                  <Cross2Icon width="12" height="12" />
                </IconButton>
              </Flex>
            </Badge>
          ))}
        </Flex>

        <Flex gap="2" align="end">
          <LengthField value={newLengthInput} onChange={setNewLengthInput} unit="mm" size="2" style={{ flexGrow: 1 }} />
          <Button onClick={handleAddLength} variant="surface" size="2">
            <PlusIcon />
            Add
          </Button>
        </Flex>
      </Flex>
    </>
  )
}

function SheetMaterialFields({
  material,
  onUpdate
}: {
  material: SheetMaterial
  onUpdate: (updates: Partial<SheetMaterial>) => void
}) {
  return (
    <Grid columns="4em 1fr 4em 1fr" gap="2" gapX="3" align="center">
      <Label.Root>
        <Text size="2" weight="medium" color="gray">
          Width
        </Text>
      </Label.Root>
      <LengthField value={material.width} onChange={width => onUpdate({ width })} unit="mm" size="2" />

      <Label.Root>
        <Text size="2" weight="medium" color="gray">
          Length
        </Text>
      </Label.Root>
      <LengthField value={material.length} onChange={length => onUpdate({ length })} unit="mm" size="2" />

      <Label.Root>
        <Text size="2" weight="medium" color="gray">
          Thickness
        </Text>
      </Label.Root>
      <LengthField value={material.thickness} onChange={thickness => onUpdate({ thickness })} unit="mm" size="2" />

      {/* Empty cell to complete the grid */}
      <div />
      <div />
    </Grid>
  )
}

function VolumeMaterialFields({
  material,
  onUpdate
}: {
  material: VolumeMaterial
  onUpdate: (updates: Partial<VolumeMaterial>) => void
}) {
  const [newVolumeInput, setNewVolumeInput] = useState<number>(1000)

  const handleAddVolume = useCallback(() => {
    if (material.availableVolumes.includes(newVolumeInput)) {
      return
    }

    const updated = [...material.availableVolumes, newVolumeInput].sort((a, b) => a - b)
    onUpdate({ availableVolumes: updated })
    setNewVolumeInput(1000)
  }, [material.availableVolumes, newVolumeInput, onUpdate])

  const handleRemoveVolume = useCallback(
    (volumeToRemove: number) => {
      const updated = material.availableVolumes.filter(v => v !== volumeToRemove)
      onUpdate({ availableVolumes: updated })
    },
    [material.availableVolumes, onUpdate]
  )

  return (
    <Flex direction="column" gap="2">
      <Text size="2" weight="medium">
        Available Volumes
      </Text>

      <Flex gap="2" wrap="wrap">
        {material.availableVolumes.map(volume => (
          <Badge key={volume} size="2" variant="soft">
            <Flex align="center" gap="1">
              {volume}
              <IconButton
                size="2"
                variant="ghost"
                color="gray"
                onClick={() => handleRemoveVolume(volume)}
                style={{ cursor: 'pointer', marginLeft: '4px' }}
              >
                <Cross2Icon width="12" height="12" />
              </IconButton>
            </Flex>
          </Badge>
        ))}
      </Flex>

      <Flex gap="2" align="end">
        <Flex direction="column" gap="1" flexGrow="1">
          <TextField.Root
            type="number"
            value={newVolumeInput.toString()}
            onChange={e => setNewVolumeInput(parseFloat(e.target.value) || 0)}
          />
        </Flex>
        <Button onClick={handleAddVolume} variant="surface">
          <PlusIcon />
          Add
        </Button>
      </Flex>
    </Flex>
  )
}
