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
  IconButton,
  SegmentedControl,
  TextField
} from '@radix-ui/themes'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { type EntityId, useEntityLabel } from '@/construction/config/components/useEntityLabel'
import { useConfigActions, useDefaultStrawMaterialId } from '@/construction/config/store'
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
import { type MaterialUsage, useMaterialUsage } from '@/construction/materials/usage'
import { LengthField } from '@/shared/components/LengthField/LengthField'
import { VolumeField } from '@/shared/components/VolumeField/VolumeField'
import type { Length } from '@/shared/geometry'
import { useFormatters } from '@/shared/i18n/useFormatters'

import { MaterialSelect, getMaterialTypeIcon, useGetMaterialTypeName } from './MaterialSelect'

export interface MaterialsConfigModalProps {
  trigger: React.ReactNode
}

export interface MaterialsConfigContentProps {
  initialSelectionId?: string
}

type MaterialType = Material['type']

export function MaterialsConfigContent({ initialSelectionId }: MaterialsConfigContentProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const getMaterialTypeName = useGetMaterialTypeName()
  const materials = useMaterials()
  const { addMaterial, updateMaterial, removeMaterial, duplicateMaterial, reset } = useMaterialActions()
  const defaultStrawMaterialId = useDefaultStrawMaterialId()
  const { updateDefaultStrawMaterial } = useConfigActions()

  const [selectedMaterialId, setSelectedMaterialId] = useState<MaterialId | null>(() => {
    if (initialSelectionId && materials.some(m => m.id === initialSelectionId)) {
      return initialSelectionId as MaterialId
    }
    return materials.length > 0 ? materials[0].id : null
  })

  const selectedMaterial = materials.find(m => m.id === selectedMaterialId) ?? null

  // Use the hook to get material usage - it will return empty usage if selectedMaterial is null
  const usage = useMaterialUsage(selectedMaterial?.id ?? ('' as MaterialId))

  const handleAddNew = useCallback(
    (type: MaterialType) => {
      let newMaterial: Material

      switch (type) {
        case 'dimensional':
          newMaterial = addMaterial({
            name: t($ => $.materials.newName_dimensional),
            type: 'dimensional',
            color: '#808080',
            crossSections: [],
            lengths: []
          } satisfies Omit<DimensionalMaterial, 'id'>)
          break
        case 'sheet':
          newMaterial = addMaterial({
            name: t($ => $.materials.newName_sheet),
            type: 'sheet',
            color: '#808080',
            sizes: [],
            thicknesses: [],
            sheetType: 'solid'
          } satisfies Omit<SheetMaterial, 'id'>)
          break
        case 'volume':
          newMaterial = addMaterial({
            name: t($ => $.materials.newName_volume),
            type: 'volume',
            color: '#808080',
            availableVolumes: []
          } satisfies Omit<VolumeMaterial, 'id'>)
          break
        case 'generic':
          newMaterial = addMaterial({
            name: t($ => $.materials.newName_generic),
            type: 'generic',
            color: '#808080'
          } satisfies Omit<GenericMaterial, 'id'>)
          break
        case 'strawbale':
          newMaterial = addMaterial({
            name: t($ => $.materials.newName_strawbale),
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

    const duplicated = duplicateMaterial(
      selectedMaterial.id,
      t($ => $.materials.duplicateNamePattern, { name: selectedMaterial.name, defaultValue: '{{name}} (Copy)' })
    )
    setSelectedMaterialId(duplicated.id)
  }, [selectedMaterial, duplicateMaterial])

  const handleDelete = useCallback(() => {
    if (!selectedMaterial || usage.isUsed) return

    const currentIndex = materials.findIndex(m => m.id === selectedMaterialId)
    removeMaterial(selectedMaterial.id)

    if (materials.length > 1) {
      const nextMaterial = materials[currentIndex + 1] ?? materials[currentIndex - 1]
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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

  const handleReset = useCallback(() => {
    reset()
    const stillExists = materials.some(a => a.id === selectedMaterialId)
    if (!stillExists && materials.length > 0) {
      setSelectedMaterialId(materials[0].id)
    }
  }, [reset, setSelectedMaterialId, materials, selectedMaterialId])

  const Icon = selectedMaterial ? getMaterialTypeIcon(selectedMaterial.type) : null

  const nameKey = selectedMaterial?.nameKey
  return (
    <div className="flex flex-col gap-4" style={{ width: '100%' }}>
      <div className="grid grid-cols-2 gap-2">
        {/* Selector + Actions */}
        <div className="flex gap-2 items-center w-full">
          <div className="flex flex-col grow-1">
            <MaterialSelect
              value={selectedMaterialId ?? null}
              onValueChange={materialId => {
                setSelectedMaterialId(materialId ?? null)
              }}
              placeholder={t($ => $.common.placeholders.selectMaterial)}
            />
          </div>
          <DropdownMenu>
            <DropdownMenu.Trigger>
              <Button variant="icon" title={t($ => $.common.addNew)}>
                <PlusIcon />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item
                onSelect={() => {
                  handleAddNew('dimensional')
                }}
              >
                <div className="flex items-center gap-1">
                  <CubeIcon />
                  {t($ => $.materials.typeDimensional)}
                </div>
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={() => {
                  handleAddNew('strawbale')
                }}
              >
                <div className="flex items-center gap-1">
                  <CubeIcon />
                  {t($ => $.materials.typeStrawbale)}
                </div>
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={() => {
                  handleAddNew('sheet')
                }}
              >
                <div className="flex items-center gap-1">
                  <LayersIcon />
                  {t($ => $.materials.typeSheet)}
                </div>
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={() => {
                  handleAddNew('volume')
                }}
              >
                <div className="flex items-center gap-1">
                  <OpacityIcon />
                  {t($ => $.materials.typeVolume)}
                </div>
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={() => {
                  handleAddNew('generic')
                }}
              >
                <div className="flex items-center gap-1">
                  <CircleIcon />
                  {t($ => $.materials.typeGeneric)}
                </div>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu>
          <Button
            variant="icon"
            onClick={handleDuplicate}
            disabled={!selectedMaterial}
            title={t($ => $.common.duplicate)}
            variant="soft"
          >
            <CopyIcon />
          </Button>
          <AlertDialog.Root>
            <AlertDialog.Trigger>
              <Button
                variant="icon"
                disabled={!selectedMaterial || usage.isUsed}
                color="red"
                title={usage.isUsed ? t($ => $.common.inUseCannotDelete) : t($ => $.common.delete)}
              >
                <TrashIcon />
              </Button>
            </AlertDialog.Trigger>
            <AlertDialog.Content>
              <AlertDialog.Title>{t($ => $.materials.deleteTitle)}</AlertDialog.Title>
              <AlertDialog.Description>
                {t($ => $.materials.deleteConfirm, {
                  name: selectedMaterial?.name
                })}
              </AlertDialog.Description>
              <div className="flex gap-3 mt-4 justify-end">
                <AlertDialog.Cancel>
                  <Button variant="soft" className="text-gray-900">
                    {t($ => $.common.cancel)}
                  </Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action>
                  <Button variant="solid" color="red" onClick={handleDelete}>
                    {t($ => $.common.delete)}
                  </Button>
                </AlertDialog.Action>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Root>
          <AlertDialog.Root>
            <AlertDialog.Trigger>
              <Button variant="icon" color="red" variant="outline" title={t($ => $.common.resetToDefaults)}>
                <ResetIcon />
              </Button>
            </AlertDialog.Trigger>
            <AlertDialog.Content>
              <AlertDialog.Title>{t($ => $.materials.resetTitle)}</AlertDialog.Title>
              <AlertDialog.Description>{t($ => $.materials.resetConfirm)}</AlertDialog.Description>
              <div className="flex gap-3 mt-4 justify-end">
                <AlertDialog.Cancel>
                  <Button variant="soft" className="text-gray-900">
                    {t($ => $.common.cancel)}
                  </Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action>
                  <Button variant="solid" color="red" onClick={handleReset}>
                    {t($ => $.common.reset)}
                  </Button>
                </AlertDialog.Action>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Root>
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-2 items-center">
          <Label.Root>
            <span className="text-sm font-medium text-gray-900">{t($ => $.materials.defaultStrawMaterial)}</span>
          </Label.Root>
          <MaterialSelect
            value={defaultStrawMaterialId}
            onValueChange={materialId => {
              if (materialId) {
                updateDefaultStrawMaterial(materialId)
              }
            }}
            placeholder={t($ => $.materials.selectStrawMaterial)}
            size="2"
            materials={materials}
          />
        </div>
      </div>
      {/* Form */}
      {selectedMaterial && (
        <div
          className="flex flex-col
          gap-3
          p-3
          "
          style={{ border: '1px solid var(--gray-6)', borderRadius: 'var(--radius-2)' }}
        >
          <div className="grid grid-cols-[4em_1fr] gap-2 gap-x-3 items-center">
            <Label.Root>
              <span className="text-base font-medium text-gray-900">{t($ => $.common.name)}</span>
            </Label.Root>
            <TextField.Root
              value={nameKey ? t($ => $.materials.defaults[nameKey]) : selectedMaterial.name}
              onChange={e => {
                handleUpdate({ name: e.target.value })
              }}
              placeholder={t($ => $.materials.materialName)}
              size="2"
            />
          </div>
          <div className="grid grid-cols-[4em_1fr_auto_1fr_auto_auto] gap-2 gap-x-3 items-center">
            <Label.Root>
              <span className="text-base font-medium text-gray-900">{t($ => $.common.type)}</span>
            </Label.Root>
            <div className="flex gap-2 items-center">
              {Icon && <Icon width="12" height="12" />}
              <span className="text-base text-gray-900">{getMaterialTypeName(selectedMaterial.type)}</span>
            </div>

            <Label.Root>
              <span className="text-base font-medium text-gray-900">{t($ => $.common.color)}</span>
            </Label.Root>
            <input
              type="color"
              value={selectedMaterial.color}
              onChange={e => {
                handleUpdate({ color: e.target.value })
              }}
              style={{ width: '60px', height: '24px', cursor: 'pointer' }}
            />
            <Label.Root>
              <span className="text-base font-medium text-gray-900">{t($ => $.common.density)}</span>
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
                <span className="text-sm text-gray-900">{t($ => $.common.densityUnit)}</span>
              </TextField.Slot>
            </TextField.Root>
          </div>

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
        </div>
      )}
      {!selectedMaterial && materials.length === 0 && (
        <div className="justify-center items-center p-5">
          <span className="text-gray-900">{t($ => $.materials.noMaterialsYet)}</span>
        </div>
      )}
      {usage.isUsed && <UsageDisplay usage={usage} />}
    </div>
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

function UsageDisplay({ usage }: { usage: MaterialUsage }): React.JSX.Element {
  const { t } = useTranslation('config')

  return (
    <div className="grid grid-cols-[auto_1fr] gap-2 gap-x-3 items-baseline">
      <Label.Root>
        <span className="text-base font-medium text-gray-900">{t($ => $.usage.usedBy)}</span>
      </Label.Root>
      <div className="flex gap-1 flex-wrap">
        {usage.isDefaultStraw && (
          <Badge size="2" variant="soft" color="blue">
            {t($ => $.usage.globalDefault_straw)}
          </Badge>
        )}
        {usage.assemblyIds.map(id => (
          <UsageBadge key={id} id={id} />
        ))}
        {usage.usedInWallPosts && (
          <Badge size="2" variant="soft">
            {t($ => $.usage.usedInWallPosts)}
          </Badge>
        )}
      </div>
    </div>
  )
}

function DimensionalMaterialFields({
  material,
  onUpdate
}: {
  material: DimensionalMaterial
  onUpdate: (updates: Partial<DimensionalMaterial>) => void
}) {
  const { t } = useTranslation('config')
  const { formatLength, formatDimensions2D } = useFormatters()

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
    <div className="flex flex-col gap-3">
      <div className="flex flex-row justify-between items-end">
        <div className="flex flex-col gap-2">
          <span className="text-base font-medium text-gray-900" id="crossSections">
            {t($ => $.materials.crossSections)}
          </span>
          <div className="flex gap-2 flex-wrap" role="list" aria-labelledby="crossSections">
            {material.crossSections.map(section => (
              <Badge role="listitem" key={`${section.smallerLength}x${section.biggerLength}`} size="2" variant="soft">
                <div className="flex items-center gap-1">
                  {formatDimensions2D([section.smallerLength, section.biggerLength], false)}
                  <Button
                    variant="icon"
                    size="sm"
                    variant="ghost"
                    text-gray-900
                    onClick={() => {
                      handleRemoveCrossSection(section)
                    }}
                    style={{ cursor: 'pointer' }}
                    aria-label={t($ => $.materials.removeCrossSection)}
                  >
                    <Cross2Icon width="10" height="10" />
                  </Button>
                </div>
              </Badge>
            ))}
            {material.crossSections.length === 0 && (
              <Callout color="amber" size="1">
                <CalloutIcon>
                  <ExclamationTriangleIcon />
                </CalloutIcon>
                <CalloutText>{t($ => $.materials.noCrossSections)}</CalloutText>
              </Callout>
            )}
          </div>
        </div>
        <div className="grid grid-cols-[5em_auto_5em_auto] gap-2 items-center justify-end">
          <LengthField
            value={newDim1}
            onChange={setNewDim1}
            unit="cm"
            size="2"
            aria-label={t($ => $.materials.crossSectionSmaller)}
          />
          <span>x</span>
          <LengthField
            value={newDim2}
            onChange={setNewDim2}
            unit="cm"
            size="2"
            aria-label={t($ => $.materials.crossSectionLarger)}
          />
          <Button
            variant="icon"
            title={t($ => $.common.add)}
            aria-label={t($ => $.materials.addCrossSection)}
            onClick={handleAddCrossSection}
            variant="surface"
            size="2"
          >
            <PlusIcon />
          </Button>
        </div>
      </div>
      <div className="flex flex-row justify-between items-end">
        <div className="flex flex-col gap-2">
          <span className="text-base font-medium text-gray-900" id="stock-lengths">
            {t($ => $.materials.stockLengths)}
          </span>
          <div className="flex gap-2 flex-wrap" role="list" aria-labelledby="stock-lengths">
            {material.lengths.map(length => (
              <Badge role="listitem" key={length} size="2" variant="soft">
                <div className="flex items-center gap-1">
                  {formatLength(length)}
                  <Button
                    variant="icon"
                    size="sm"
                    variant="ghost"
                    text-gray-900
                    onClick={() => {
                      handleRemoveLength(length)
                    }}
                    style={{ cursor: 'pointer' }}
                    aria-label={t($ => $.materials.removeStockLength)}
                  >
                    <Cross2Icon width="10" height="10" />
                  </Button>
                </div>
              </Badge>
            ))}
            {material.lengths.length === 0 && (
              <Callout color="amber" size="1">
                <CalloutIcon>
                  <ExclamationTriangleIcon />
                </CalloutIcon>
                <CalloutText>{t($ => $.materials.noLengths)}</CalloutText>
              </Callout>
            )}
          </div>
        </div>
        <div className="flex gap-2 items-end">
          <LengthField
            value={newLengthInput}
            onChange={setNewLengthInput}
            unit="cm"
            size="2"
            style={{ width: '8em' }}
            aria-label={t($ => $.materials.stockLengthInput)}
          />
          <Button
            variant="icon"
            title={t($ => $.materials.add)}
            aria-label={t($ => $.materials.addStockLength)}
            onClick={handleAddLength}
            variant="surface"
            size="2"
          >
            <PlusIcon />
          </Button>
        </div>
      </div>
    </div>
  )
}

function SheetMaterialFields({
  material,
  onUpdate
}: {
  material: SheetMaterial
  onUpdate: (updates: Partial<SheetMaterial>) => void
}) {
  const { t } = useTranslation('config')
  const { formatLength, formatDimensions2D } = useFormatters()
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
    <div className="flex flex-col gap-3">
      <div className="flex flex-row justify-between items-end">
        <div className="flex flex-col gap-2">
          <span className="text-base font-medium text-gray-900" id="sheet-sizes">
            {t($ => $.materials.sheetSizes)}
          </span>
          <div className="flex gap-2 flex-wrap" role="list" aria-labelledby="sheet-sizes">
            {material.sizes.map(size => (
              <Badge role="listitem" key={`${size.smallerLength}x${size.biggerLength}`} size="2" variant="soft">
                <div className="flex items-center gap-1">
                  {formatDimensions2D([size.smallerLength, size.biggerLength], false)}
                  <Button
                    variant="icon"
                    size="sm"
                    variant="ghost"
                    text-gray-900
                    onClick={() => {
                      handleRemoveSize(size)
                    }}
                    style={{ cursor: 'pointer' }}
                    aria-label={t($ => $.materials.removeSheetSize)}
                  >
                    <Cross2Icon width="10" height="10" />
                  </Button>
                </div>
              </Badge>
            ))}
            {material.sizes.length === 0 && (
              <Callout color="amber" size="1">
                <CalloutIcon>
                  <ExclamationTriangleIcon />
                </CalloutIcon>
                <CalloutText>{t($ => $.materials.noSizes)}</CalloutText>
              </Callout>
            )}
          </div>
        </div>
        <div className="grid grid-cols-[6em_auto_6em_auto] gap-2 items-center justify-end">
          <LengthField
            value={newWidth}
            onChange={setNewWidth}
            unit="cm"
            size="2"
            aria-label={t($ => $.materials.sheetWidth)}
          />
          <span>x</span>
          <LengthField
            value={newLength}
            onChange={setNewLength}
            unit="cm"
            size="2"
            aria-label={t($ => $.materials.sheetLength)}
          />
          <Button
            variant="icon"
            title={t($ => $.materials.addSize)}
            aria-label={t($ => $.materials.addSheetSize)}
            onClick={handleAddSize}
            variant="surface"
            size="2"
          >
            <PlusIcon />
          </Button>
        </div>
      </div>
      <div className="flex flex-row justify-between items-end">
        <div className="flex flex-col gap-2">
          <span className="text-base font-medium text-gray-900" id="sheet-thicknesses">
            {t($ => $.materials.thicknesses)}
          </span>
          <div className="flex gap-2 flex-wrap" role="list" aria-labelledby="sheet-thicknesses">
            {material.thicknesses.map(thickness => (
              <Badge role="listitem" key={thickness} size="2" variant="soft">
                <div className="flex items-center gap-1">
                  {formatLength(thickness)}
                  <Button
                    variant="icon"
                    size="sm"
                    variant="ghost"
                    text-gray-900
                    onClick={() => {
                      handleRemoveThickness(thickness)
                    }}
                    style={{ cursor: 'pointer' }}
                    aria-label={t($ => $.materials.removeThickness)}
                  >
                    <Cross2Icon width="10" height="10" />
                  </Button>
                </div>
              </Badge>
            ))}
            {material.thicknesses.length === 0 && (
              <Callout color="amber" size="1">
                <CalloutIcon>
                  <ExclamationTriangleIcon />
                </CalloutIcon>
                <CalloutText>{t($ => $.materials.noThicknesses)}</CalloutText>
              </Callout>
            )}
          </div>
        </div>
        <div className="flex gap-2 items-end">
          <LengthField
            value={newThickness}
            onChange={setNewThickness}
            unit="mm"
            size="2"
            style={{ width: '8em' }}
            aria-label={t($ => $.materials.thicknessInput)}
          />
          <Button
            variant="icon"
            title={t($ => $.materials.addThickness)}
            aria-label={t($ => $.materials.addThickness)}
            onClick={handleAddThickness}
            variant="surface"
            size="2"
          >
            <PlusIcon />
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-base font-medium text-gray-900">{t($ => $.materials.sheetType)}</span>
        <SegmentedControl.Root
          value={material.sheetType}
          onValueChange={value => {
            onUpdate({ sheetType: value as SheetMaterial['sheetType'] })
          }}
          size="2"
        >
          <SegmentedControl.Item value="solid">{t($ => $.materials.sheetTypeSolid)}</SegmentedControl.Item>
          <SegmentedControl.Item value="tongueAndGroove">
            {t($ => $.materials.sheetTypeTongueAndGroove)}
          </SegmentedControl.Item>
          <SegmentedControl.Item value="flexible">{t($ => $.materials.sheetTypeFlexible)}</SegmentedControl.Item>
        </SegmentedControl.Root>
      </div>
    </div>
  )
}

function VolumeMaterialFields({
  material,
  onUpdate
}: {
  material: VolumeMaterial
  onUpdate: (updates: Partial<VolumeMaterial>) => void
}) {
  const { t } = useTranslation('config')
  const { formatVolume, formatVolumeInLiters } = useFormatters()
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
    <div className="flex flex-col gap-3">
      <div className="flex flex-row justify-between items-end">
        <div className="flex flex-col gap-2">
          <span className="text-base font-medium text-gray-900" id="available-volumes">
            {t($ => $.materials.availableVolumes)}
          </span>
          <div className="flex gap-2 flex-wrap" role="list" aria-labelledby="available-volumes">
            {material.availableVolumes.map(volume => (
              <Badge role="listitem" key={volume} size="2" variant="soft">
                <div className="flex items-center gap-1">
                  {volumeUnit === 'liter' ? formatVolumeInLiters(volume) : formatVolume(volume)}
                  <Button
                    variant="icon"
                    size="sm"
                    variant="ghost"
                    text-gray-900
                    onClick={() => {
                      handleRemoveVolume(volume)
                    }}
                    style={{ cursor: 'pointer' }}
                    aria-label={t($ => $.materials.removeVolume)}
                  >
                    <Cross2Icon width="10" height="10" />
                  </Button>
                </div>
              </Badge>
            ))}
            {material.availableVolumes.length === 0 && (
              <Callout color="amber" size="1">
                <CalloutIcon>
                  <ExclamationTriangleIcon />
                </CalloutIcon>
                <CalloutText>{t($ => $.materials.noVolumes)}</CalloutText>
              </Callout>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 items-end" style={{ minWidth: '14em' }}>
          <SegmentedControl.Root
            value={volumeUnit}
            onValueChange={value => {
              setVolumeUnit(value as 'liter' | 'm3')
            }}
            size="1"
          >
            <SegmentedControl.Item value="liter">{t($ => $.units.liter, { ns: 'common' })}</SegmentedControl.Item>
            <SegmentedControl.Item value="m3">{t($ => $.units.m3, { ns: 'common' })}</SegmentedControl.Item>
          </SegmentedControl.Root>
          <div className="flex gap-2 items-end">
            <VolumeField
              value={newVolumeInput}
              onChange={setNewVolumeInput}
              unit={volumeUnit}
              size="2"
              style={{ width: '8em' }}
              aria-label={t($ => $.materials.volumeInput)}
            />
            <Button
              variant="icon"
              title={t($ => $.materials.addVolume)}
              aria-label={t($ => $.materials.addVolumeOption)}
              onClick={handleAddVolume}
              variant="surface"
              size="2"
            >
              <PlusIcon />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function StrawbaleMaterialFields({
  material,
  onUpdate
}: {
  material: StrawbaleMaterial
  onUpdate: (updates: Partial<StrawbaleMaterial>) => void
}) {
  const { t } = useTranslation('config')
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[8em_1fr_8em_1fr] gap-3 gap-x-4">
        <Label.Root>
          <span className="text-sm font-medium text-gray-900">{t($ => $.materials.minBaleLength)}</span>
        </Label.Root>
        <LengthField
          value={material.baleMinLength}
          onChange={baleMinLength => {
            onUpdate({ baleMinLength })
          }}
          unit="cm"
          size="2"
        />

        <Label.Root>
          <span className="text-sm font-medium text-gray-900">{t($ => $.materials.maxBaleLength)}</span>
        </Label.Root>
        <LengthField
          value={material.baleMaxLength}
          onChange={baleMaxLength => {
            onUpdate({ baleMaxLength })
          }}
          unit="cm"
          size="2"
        />

        <Label.Root>
          <span className="text-sm font-medium text-gray-900">{t($ => $.materials.baleHeight)}</span>
        </Label.Root>
        <LengthField
          value={material.baleHeight}
          onChange={baleHeight => {
            onUpdate({ baleHeight })
          }}
          unit="cm"
          size="2"
        />

        <Label.Root>
          <span className="text-sm font-medium text-gray-900">{t($ => $.materials.baleWidth)}</span>
        </Label.Root>
        <LengthField
          value={material.baleWidth}
          onChange={baleWidth => {
            onUpdate({ baleWidth })
          }}
          unit="cm"
          size="2"
        />
      </div>
      <div className="grid grid-cols-[8em_1fr_8em_1fr] gap-3 gap-x-4">
        <Label.Root>
          <span className="text-sm font-medium text-gray-900">{t($ => $.materials.tolerance)}</span>
        </Label.Root>
        <LengthField
          value={material.tolerance}
          onChange={tolerance => {
            onUpdate({ tolerance })
          }}
          unit="mm"
          size="2"
        />

        <Label.Root>
          <span className="text-sm font-medium text-gray-900">{t($ => $.materials.topCutoffLimit)}</span>
        </Label.Root>
        <LengthField
          value={material.topCutoffLimit}
          onChange={topCutoffLimit => {
            onUpdate({ topCutoffLimit })
          }}
          unit="cm"
          size="2"
        />

        <Label.Root>
          <span className="text-sm font-medium text-gray-900">{t($ => $.materials.flakeSize)}</span>
        </Label.Root>
        <LengthField
          value={material.flakeSize}
          onChange={flakeSize => {
            onUpdate({ flakeSize })
          }}
          unit="cm"
          size="2"
        />
      </div>
    </div>
  )
}
