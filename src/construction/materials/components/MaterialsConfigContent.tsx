import {
  CircleIcon,
  CopyIcon,
  Cross2Icon,
  CubeIcon,
  ExclamationTriangleIcon,
  LayersIcon,
  OpacityIcon,
  PlusIcon,
  ResetIcon,
  TrashIcon
} from '@radix-ui/react-icons'
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
  SegmentedControl,
  Text,
  TextField
} from '@radix-ui/themes'
import React, { useCallback, useState } from 'react'

import {
  useConfigActions,
  useDefaultStrawMaterialId,
  useRingBeamAssemblies,
  useWallAssemblies
} from '@/construction/config/store'
import type {
  DimensionalMaterial,
  GenericMaterial,
  Material,
  MaterialId,
  SheetMaterial,
  StrawbaleMaterial,
  VolumeMaterial
} from '@/construction/materials/material'
import { strawbale } from '@/construction/materials/material'
import { useMaterialActions, useMaterials } from '@/construction/materials/store'
import { getMaterialUsage } from '@/construction/materials/usage'
import { LengthField } from '@/shared/components/LengthField/LengthField'
import { VolumeField } from '@/shared/components/VolumeField/VolumeField'
import type { Length } from '@/shared/geometry'
import { formatLength, formatVolume, formatVolumeInLiters } from '@/shared/utils/formatting'

import { MaterialSelect, getMaterialTypeIcon, getMaterialTypeName } from './MaterialSelect'

export interface MaterialsConfigModalProps {
  trigger: React.ReactNode
}

export interface MaterialsConfigContentProps {
  initialSelectionId?: string
}

type MaterialType = Material['type']

const formatCrossSectionLabel = (section: { smallerLength: number; biggerLength: number }) =>
  `${formatLength(section.smallerLength)} × ${formatLength(section.biggerLength)}`

export function MaterialsConfigContent({ initialSelectionId }: MaterialsConfigContentProps): React.JSX.Element {
  const materials = useMaterials()
  const { addMaterial, updateMaterial, removeMaterial, duplicateMaterial, reset } = useMaterialActions()
  const ringBeamAssemblies = useRingBeamAssemblies()
  const wallAssemblies = useWallAssemblies()
  const defaultStrawMaterialId = useDefaultStrawMaterialId()
  const { updateDefaultStrawMaterial } = useConfigActions()

  const [selectedMaterialId, setSelectedMaterialId] = useState<MaterialId | null>(() => {
    if (initialSelectionId && materials.some(m => m.id === initialSelectionId)) {
      return initialSelectionId as MaterialId
    }
    return materials.length > 0 ? materials[0].id : null
  })

  const selectedMaterial = materials.find(m => m.id === selectedMaterialId) ?? null

  const usage = React.useMemo(
    () =>
      selectedMaterial
        ? getMaterialUsage(selectedMaterial.id, ringBeamAssemblies, wallAssemblies, defaultStrawMaterialId)
        : { isUsed: false, usedByConfigs: [] },
    [selectedMaterial, ringBeamAssemblies, wallAssemblies, defaultStrawMaterialId]
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
            crossSections: [],
            lengths: []
          } satisfies Omit<DimensionalMaterial, 'id'>)
          break
        case 'sheet':
          newMaterial = addMaterial({
            name: 'New sheet material',
            type: 'sheet',
            color: '#808080',
            sizes: [],
            thicknesses: [],
            sheetType: 'solid'
          } satisfies Omit<SheetMaterial, 'id'>)
          break
        case 'volume':
          newMaterial = addMaterial({
            name: 'New volume material',
            type: 'volume',
            color: '#808080',
            availableVolumes: []
          } satisfies Omit<VolumeMaterial, 'id'>)
          break
        case 'generic':
          newMaterial = addMaterial({
            name: 'New generic material',
            type: 'generic',
            color: '#808080'
          } satisfies Omit<GenericMaterial, 'id'>)
          break
        case 'strawbale':
          newMaterial = addMaterial({
            name: 'New strawbale material',
            type: 'strawbale',
            color: strawbale.color,
            baleMinLength: strawbale.baleMinLength,
            baleMaxLength: strawbale.baleMaxLength,
            baleHeight: strawbale.baleHeight,
            baleWidth: strawbale.baleWidth,
            tolerance: strawbale.tolerance,
            topCutoffLimit: strawbale.topCutoffLimit,
            flakeSize: strawbale.flakeSize,
            density: strawbale.density
          } as Omit<StrawbaleMaterial, 'id'>)
          break
        default:
          return
      }

      setSelectedMaterialId(newMaterial.id)
    },
    [addMaterial, updateDefaultStrawMaterial]
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

  const handleReset = useCallback(() => reset(), [reset])

  const Icon = selectedMaterial ? getMaterialTypeIcon(selectedMaterial.type) : null

  return (
    <Flex direction="column" gap="4" style={{ width: '100%' }}>
      <Grid columns="2" gap="2">
        {/* Selector + Actions */}
        <Flex gap="2" align="center" width="100%">
          <Flex direction="column" flexGrow="1">
            <MaterialSelect
              value={selectedMaterialId ?? null}
              onValueChange={materialId => setSelectedMaterialId(materialId ?? null)}
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
              <DropdownMenu.Item onSelect={() => handleAddNew('strawbale')}>
                <Flex align="center" gap="1">
                  <CubeIcon />
                  Strawbale
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
          <AlertDialog.Root>
            <AlertDialog.Trigger>
              <IconButton color="red" variant="outline" title="Reset to Default">
                <ResetIcon />
              </IconButton>
            </AlertDialog.Trigger>
            <AlertDialog.Content>
              <AlertDialog.Title>Reset Materials</AlertDialog.Title>
              <AlertDialog.Description>
                Are you sure you want to reset all materials to default? This action cannot be undone.
              </AlertDialog.Description>
              <Flex gap="3" mt="4" justify="end">
                <AlertDialog.Cancel>
                  <Button variant="soft" color="gray">
                    Cancel
                  </Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action>
                  <Button variant="solid" color="red" onClick={handleReset}>
                    Reset
                  </Button>
                </AlertDialog.Action>
              </Flex>
            </AlertDialog.Content>
          </AlertDialog.Root>
        </Flex>

        <Grid columns="auto 1fr" gap="2" align="center">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              Default Straw Material
            </Text>
          </Label.Root>
          <MaterialSelect
            value={defaultStrawMaterialId}
            onValueChange={materialId => {
              if (materialId) {
                updateDefaultStrawMaterial(materialId)
              }
            }}
            placeholder={'Select straw material...'}
            size="2"
            materials={materials}
          />
        </Grid>
      </Grid>

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
          <Grid columns="4em 1fr auto 1fr auto auto" gap="2" gapX="3" align="center">
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
            <Label.Root>
              <Text size="2" weight="medium" color="gray">
                Density
              </Text>
            </Label.Root>
            <TextField.Root
              type="number"
              value={selectedMaterial.density ?? ''}
              onChange={e => {
                const next = e.target.value
                const parsed = Number(next)
                handleUpdate({ density: Number.isNaN(parsed) || parsed === 0 ? undefined : parsed })
              }}
              placeholder="—"
              size="2"
              min="0"
              step="1"
              style={{ textAlign: 'right', width: '6em' }}
            >
              <TextField.Slot side="right" style={{ paddingInline: '6px' }}>
                <Text size="1" color="gray">
                  kg/m³
                </Text>
              </TextField.Slot>
            </TextField.Root>
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

          {selectedMaterial.type === 'strawbale' && (
            <StrawbaleMaterialFields material={selectedMaterial} onUpdate={handleUpdate} />
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
  const [newDim1, setNewDim1] = useState<Length>(material.crossSections[0]?.smallerLength ?? 50)
  const [newDim2, setNewDim2] = useState<Length>(material.crossSections[0]?.biggerLength ?? 100)
  const [newLengthInput, setNewLengthInput] = useState<Length>(material.lengths[0] ?? 3000)

  const handleAddCrossSection = useCallback(() => {
    if (newDim1 <= 0 || newDim2 <= 0) return
    const normalized = {
      smallerLength: Math.min(newDim1, newDim2),
      biggerLength: Math.max(newDim1, newDim2)
    }
    if (
      material.crossSections.some(
        section =>
          section.smallerLength === normalized.smallerLength && section.biggerLength === normalized.biggerLength
      )
    ) {
      return
    }
    const updated = [...material.crossSections, normalized].sort(
      (a, b) => a.smallerLength - b.smallerLength || a.biggerLength - b.biggerLength
    )
    onUpdate({ crossSections: updated })
  }, [material.crossSections, newDim2, newDim1, onUpdate])

  const handleRemoveCrossSection = useCallback(
    (sectionToRemove: DimensionalMaterial['crossSections'][number]) => {
      const updated = material.crossSections.filter(
        section =>
          section.smallerLength !== sectionToRemove.smallerLength ||
          section.biggerLength !== sectionToRemove.biggerLength
      )
      onUpdate({ crossSections: updated })
    },
    [material.crossSections, onUpdate]
  )

  const handleAddLength = useCallback(() => {
    if (newLengthInput <= 0 || material.lengths.includes(newLengthInput)) {
      return
    }
    const updated = [...material.lengths, newLengthInput].sort((a, b) => a - b)
    onUpdate({ lengths: updated })
    setNewLengthInput(3000)
  }, [material.lengths, newLengthInput, onUpdate])

  const handleRemoveLength = useCallback(
    (lengthToRemove: Length) => {
      const updated = material.lengths.filter(l => l !== lengthToRemove)
      onUpdate({ lengths: updated })
    },
    [material.lengths, onUpdate]
  )

  return (
    <Flex direction="column" gap="3">
      <Flex direction="row" justify="between" align="end">
        <Flex direction="column" gap="2">
          <Text size="2" weight="medium" color="gray">
            Cross Sections
          </Text>
          <Flex gap="2" wrap="wrap">
            {material.crossSections.map(section => (
              <Badge key={`${section.smallerLength}x${section.biggerLength}`} size="2" variant="soft">
                <Flex align="center" gap="1">
                  {formatCrossSectionLabel(section)}
                  <IconButton
                    size="1"
                    variant="ghost"
                    color="gray"
                    onClick={() => handleRemoveCrossSection(section)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Cross2Icon width="10" height="10" />
                  </IconButton>
                </Flex>
              </Badge>
            ))}
            {material.crossSections.length === 0 && (
              <Callout.Root color="amber" size="1">
                <Callout.Icon>
                  <ExclamationTriangleIcon />
                </Callout.Icon>
                <Callout.Text>No cross sections configured</Callout.Text>
              </Callout.Root>
            )}
          </Flex>
        </Flex>
        <Grid columns="5em auto 5em auto" gap="2" align="center" justify="end">
          <LengthField value={newDim1} onChange={setNewDim1} unit="cm" size="2" />
          <Text>x</Text>
          <LengthField value={newDim2} onChange={setNewDim2} unit="cm" size="2" />
          <IconButton title="Add" onClick={handleAddCrossSection} variant="surface" size="2">
            <PlusIcon />
          </IconButton>
        </Grid>
      </Flex>

      <Flex direction="row" justify="between" align="end">
        <Flex direction="column" gap="2">
          <Text size="2" weight="medium" color="gray">
            Stock Lengths
          </Text>
          <Flex gap="2" wrap="wrap">
            {material.lengths.map(length => (
              <Badge key={length} size="2" variant="soft">
                <Flex align="center" gap="1">
                  {formatLength(length)}
                  <IconButton
                    size="1"
                    variant="ghost"
                    color="gray"
                    onClick={() => handleRemoveLength(length)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Cross2Icon width="10" height="10" />
                  </IconButton>
                </Flex>
              </Badge>
            ))}
            {material.lengths.length === 0 && (
              <Callout.Root color="amber" size="1">
                <Callout.Icon>
                  <ExclamationTriangleIcon />
                </Callout.Icon>
                <Callout.Text>No lengths configured</Callout.Text>
              </Callout.Root>
            )}
          </Flex>
        </Flex>
        <Flex gap="2" align="end">
          <LengthField
            value={newLengthInput}
            onChange={setNewLengthInput}
            unit="cm"
            size="2"
            style={{ width: '8em' }}
          />
          <IconButton title="Add" onClick={handleAddLength} variant="surface" size="2">
            <PlusIcon />
          </IconButton>
        </Flex>
      </Flex>
    </Flex>
  )
}

function SheetMaterialFields({
  material,
  onUpdate
}: {
  material: SheetMaterial
  onUpdate: (updates: Partial<SheetMaterial>) => void
}) {
  const [newWidth, setNewWidth] = useState<Length>(material.sizes[0]?.smallerLength ?? 600)
  const [newLength, setNewLength] = useState<Length>(material.sizes[0]?.biggerLength ?? 1200)
  const [newThickness, setNewThickness] = useState<Length>(material.thicknesses[0] ?? 18)

  const handleAddSize = useCallback(() => {
    if (newWidth <= 0 || newLength <= 0) return
    const normalized = {
      smallerLength: Math.min(newWidth, newLength),
      biggerLength: Math.max(newWidth, newLength)
    }
    if (
      material.sizes.some(
        size => size.smallerLength === normalized.smallerLength && size.biggerLength === normalized.biggerLength
      )
    ) {
      return
    }
    const updated = [...material.sizes, normalized].sort(
      (a, b) => a.smallerLength - b.smallerLength || a.biggerLength - b.biggerLength
    )
    onUpdate({ sizes: updated })
  }, [material.sizes, newLength, newWidth, onUpdate])

  const handleRemoveSize = useCallback(
    (sizeToRemove: SheetMaterial['sizes'][number]) => {
      const updated = material.sizes.filter(
        size => size.smallerLength !== sizeToRemove.smallerLength || size.biggerLength !== sizeToRemove.biggerLength
      )
      onUpdate({ sizes: updated })
    },
    [material.sizes, onUpdate]
  )

  const handleAddThickness = useCallback(() => {
    if (newThickness <= 0 || material.thicknesses.includes(newThickness)) {
      return
    }
    const updated = [...material.thicknesses, newThickness].sort((a, b) => a - b)
    onUpdate({ thicknesses: updated })
  }, [material.thicknesses, newThickness, onUpdate])

  const handleRemoveThickness = useCallback(
    (thicknessToRemove: Length) => {
      const updated = material.thicknesses.filter(t => t !== thicknessToRemove)
      onUpdate({ thicknesses: updated })
    },
    [material.thicknesses, onUpdate]
  )

  return (
    <Flex direction="column" gap="3">
      <Flex direction="row" justify="between" align="end">
        <Flex direction="column" gap="2">
          <Text size="2" weight="medium" color="gray">
            Sheet Sizes
          </Text>
          <Flex gap="2" wrap="wrap">
            {material.sizes.map(size => (
              <Badge key={`${size.smallerLength}x${size.biggerLength}`} size="2" variant="soft">
                <Flex align="center" gap="1">
                  {formatCrossSectionLabel(size)}
                  <IconButton
                    size="1"
                    variant="ghost"
                    color="gray"
                    onClick={() => handleRemoveSize(size)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Cross2Icon width="10" height="10" />
                  </IconButton>
                </Flex>
              </Badge>
            ))}
            {material.sizes.length === 0 && (
              <Callout.Root color="amber" size="1">
                <Callout.Icon>
                  <ExclamationTriangleIcon />
                </Callout.Icon>
                <Callout.Text>No sheet sizes configured</Callout.Text>
              </Callout.Root>
            )}
          </Flex>
        </Flex>
        <Grid columns="6em auto 6em auto" gap="2" align="center" justify="end">
          <LengthField value={newWidth} onChange={setNewWidth} unit="cm" size="2" />
          <Text>x</Text>
          <LengthField value={newLength} onChange={setNewLength} unit="cm" size="2" />
          <IconButton title="Add size" onClick={handleAddSize} variant="surface" size="2">
            <PlusIcon />
          </IconButton>
        </Grid>
      </Flex>

      <Flex direction="row" justify="between" align="end">
        <Flex direction="column" gap="2">
          <Text size="2" weight="medium" color="gray">
            Thicknesses
          </Text>
          <Flex gap="2" wrap="wrap">
            {material.thicknesses.map(thickness => (
              <Badge key={thickness} size="2" variant="soft">
                <Flex align="center" gap="1">
                  {formatLength(thickness)}
                  <IconButton
                    size="1"
                    variant="ghost"
                    color="gray"
                    onClick={() => handleRemoveThickness(thickness)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Cross2Icon width="10" height="10" />
                  </IconButton>
                </Flex>
              </Badge>
            ))}
            {material.thicknesses.length === 0 && (
              <Callout.Root color="amber" size="1">
                <Callout.Icon>
                  <ExclamationTriangleIcon />
                </Callout.Icon>
                <Callout.Text>No thicknesses configured</Callout.Text>
              </Callout.Root>
            )}
          </Flex>
        </Flex>
        <Flex gap="2" align="end">
          <LengthField value={newThickness} onChange={setNewThickness} unit="mm" size="2" style={{ width: '8em' }} />
          <IconButton title="Add thickness" onClick={handleAddThickness} variant="surface" size="2">
            <PlusIcon />
          </IconButton>
        </Flex>
      </Flex>

      <Flex direction="column" gap="2">
        <Text size="2" weight="medium" color="gray">
          Sheet Type
        </Text>
        <SegmentedControl.Root
          value={material.sheetType}
          onValueChange={value => onUpdate({ sheetType: value as SheetMaterial['sheetType'] })}
          size="2"
        >
          <SegmentedControl.Item value="solid">Solid</SegmentedControl.Item>
          <SegmentedControl.Item value="tongueAndGroove">Tongue &amp; Groove</SegmentedControl.Item>
          <SegmentedControl.Item value="flexible">Flexible</SegmentedControl.Item>
        </SegmentedControl.Root>
      </Flex>
    </Flex>
  )
}

function VolumeMaterialFields({
  material,
  onUpdate
}: {
  material: VolumeMaterial
  onUpdate: (updates: Partial<VolumeMaterial>) => void
}) {
  const [newVolumeInput, setNewVolumeInput] = useState<number>(1_000_000)
  const [volumeUnit, setVolumeUnit] = useState<'liter' | 'm3'>('liter')

  const handleAddVolume = useCallback(() => {
    if (material.availableVolumes.includes(newVolumeInput)) {
      return
    }

    const updated = [...material.availableVolumes, newVolumeInput].sort((a, b) => a - b)
    onUpdate({ availableVolumes: updated })
    setNewVolumeInput(1000_000)
  }, [material.availableVolumes, newVolumeInput, onUpdate])

  const handleRemoveVolume = useCallback(
    (volumeToRemove: number) => {
      const updated = material.availableVolumes.filter(v => v !== volumeToRemove)
      onUpdate({ availableVolumes: updated })
    },
    [material.availableVolumes, onUpdate]
  )

  return (
    <Flex direction="column" gap="3">
      <Flex direction="row" justify="between" align="end">
        <Flex direction="column" gap="2">
          <Text size="2" weight="medium" color="gray">
            Available Volumes
          </Text>
          <Flex gap="2" wrap="wrap">
            {material.availableVolumes.map(volume => (
              <Badge key={volume} size="2" variant="soft">
                <Flex align="center" gap="1">
                  {volumeUnit === 'liter' ? formatVolumeInLiters(volume) : formatVolume(volume)}
                  <IconButton
                    size="1"
                    variant="ghost"
                    color="gray"
                    onClick={() => handleRemoveVolume(volume)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Cross2Icon width="10" height="10" />
                  </IconButton>
                </Flex>
              </Badge>
            ))}
            {material.availableVolumes.length === 0 && (
              <Callout.Root color="amber" size="1">
                <Callout.Icon>
                  <ExclamationTriangleIcon />
                </Callout.Icon>
                <Callout.Text>No volumes configured</Callout.Text>
              </Callout.Root>
            )}
          </Flex>
        </Flex>

        <Flex direction="column" gap="2" align="end" style={{ minWidth: '14em' }}>
          <SegmentedControl.Root
            value={volumeUnit}
            onValueChange={value => setVolumeUnit(value as 'liter' | 'm3')}
            size="1"
          >
            <SegmentedControl.Item value="liter">L</SegmentedControl.Item>
            <SegmentedControl.Item value="m3">m³</SegmentedControl.Item>
          </SegmentedControl.Root>
          <Flex gap="2" align="end">
            <VolumeField
              value={newVolumeInput}
              onChange={setNewVolumeInput}
              unit={volumeUnit}
              size="2"
              style={{ width: '8em' }}
            />
            <IconButton title="Add volume" onClick={handleAddVolume} variant="surface" size="2">
              <PlusIcon />
            </IconButton>
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  )
}

function StrawbaleMaterialFields({
  material,
  onUpdate
}: {
  material: StrawbaleMaterial
  onUpdate: (updates: Partial<StrawbaleMaterial>) => void
}) {
  return (
    <Flex direction="column" gap="3">
      <Grid columns="8em 1fr 8em 1fr" gap="3" gapX="4">
        <Label.Root>
          <Text size="1" weight="medium" color="gray">
            Min Bale Length
          </Text>
        </Label.Root>
        <LengthField
          value={material.baleMinLength}
          onChange={baleMinLength => onUpdate({ baleMinLength })}
          unit="cm"
          size="2"
        />

        <Label.Root>
          <Text size="1" weight="medium" color="gray">
            Max Bale Length
          </Text>
        </Label.Root>
        <LengthField
          value={material.baleMaxLength}
          onChange={baleMaxLength => onUpdate({ baleMaxLength })}
          unit="cm"
          size="2"
        />

        <Label.Root>
          <Text size="1" weight="medium" color="gray">
            Bale Height
          </Text>
        </Label.Root>
        <LengthField value={material.baleHeight} onChange={baleHeight => onUpdate({ baleHeight })} unit="cm" size="2" />

        <Label.Root>
          <Text size="1" weight="medium" color="gray">
            Bale Width
          </Text>
        </Label.Root>
        <LengthField value={material.baleWidth} onChange={baleWidth => onUpdate({ baleWidth })} unit="cm" size="2" />
      </Grid>

      <Grid columns="8em 1fr 8em 1fr" gap="3" gapX="4">
        <Label.Root>
          <Text size="1" weight="medium" color="gray">
            Tolerance
          </Text>
        </Label.Root>
        <LengthField value={material.tolerance} onChange={tolerance => onUpdate({ tolerance })} unit="mm" size="2" />

        <Label.Root>
          <Text size="1" weight="medium" color="gray">
            Top Cutoff Limit
          </Text>
        </Label.Root>
        <LengthField
          value={material.topCutoffLimit}
          onChange={topCutoffLimit => onUpdate({ topCutoffLimit })}
          unit="cm"
          size="2"
        />

        <Label.Root>
          <Text size="1" weight="medium" color="gray">
            Flake Size
          </Text>
        </Label.Root>
        <LengthField value={material.flakeSize} onChange={flakeSize => onUpdate({ flakeSize })} unit="cm" size="2" />
      </Grid>
    </Flex>
  )
}
