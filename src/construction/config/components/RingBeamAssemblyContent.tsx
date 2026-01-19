import { CopyIcon, PlusIcon, ResetIcon, TrashIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import {
  AlertDialog,
  Badge,
  Button,
  DropdownMenu,
  IconButton,
  SegmentedControl,
  Separator,
  TextField
} from '@radix-ui/themes'
import React, { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { RingBeamAssemblyId } from '@/building/model/ids'
import { usePerimeterWalls } from '@/building/store'
import type { RingBeamAssemblyConfig } from '@/construction/config'
import { type EntityId, useEntityLabel } from '@/construction/config/components/useEntityLabel'
import {
  useConfigActions,
  useDefaultBaseRingBeamAssemblyId,
  useDefaultTopRingBeamAssemblyId,
  useRingBeamAssemblies
} from '@/construction/config/store'
import { type RingBeamAssemblyUsage, getRingBeamAssemblyUsage } from '@/construction/config/usage'
import { MaterialSelectWithEdit } from '@/construction/materials/components/MaterialSelectWithEdit'
import { bitumen, brick, cork, roughWood, woodwool } from '@/construction/materials/material'
import { type CornerHandling, type RingBeamConfig, resolveRingBeamAssembly } from '@/construction/ringBeams'
import { MeasurementInfo } from '@/editor/components/MeasurementInfo'
import { LengthField } from '@/shared/components/LengthField/LengthField'
import { useDebouncedInput } from '@/shared/hooks/useDebouncedInput'
import { useFormatters } from '@/shared/i18n/useFormatters'

import { getRingBeamTypeIcon } from './Icons'
import { RingBeamAssemblySelect } from './RingBeamAssemblySelect'

type RingBeamType = 'full' | 'double' | 'brick'

export interface RingBeamAssemblyContentProps {
  initialSelectionId?: string
}

export function RingBeamAssemblyContent({ initialSelectionId }: RingBeamAssemblyContentProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const ringBeamAssemblies = useRingBeamAssemblies()
  const walls = usePerimeterWalls()
  const {
    addRingBeamAssembly,
    removeRingBeamAssembly,
    setDefaultBaseRingBeamAssembly,
    setDefaultTopRingBeamAssembly,
    resetRingBeamAssembliesToDefaults
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
        ? getRingBeamAssemblyUsage(selectedAssembly.id, walls, defaultBaseId, defaultTopId)
        : { isUsed: false, isDefaultBase: false, isDefaultTop: false, storeyIds: [] },
    [selectedAssembly, walls, defaultBaseId, defaultTopId]
  )

  const handleAddNew = useCallback(
    (type: RingBeamType) => {
      let name: string
      let config: RingBeamConfig
      if (type === 'full') {
        name = t($ => $.ringBeams.newName_full)
        config = {
          type: 'full',
          height: 60,
          material: roughWood.id,
          width: 360,
          offsetFromEdge: 0
        }
      } else if (type === 'double') {
        name = t($ => $.ringBeams.newName_double)
        config = {
          type: 'double',
          height: 60,
          material: roughWood.id,
          thickness: 120,
          infillMaterial: woodwool.id,
          offsetFromEdge: 0,
          spacing: 100,
          cornerHandling: 'interweave'
        }
      } else {
        name = t($ => $.ringBeams.newName_brick)
        config = {
          type: 'brick',
          wallHeight: 300,
          wallWidth: 250,
          wallMaterial: brick.id,
          beamThickness: 60,
          beamWidth: 360,
          beamMaterial: roughWood.id,
          waterproofingThickness: 2,
          waterproofingMaterial: bitumen.id,
          insulationThickness: 100,
          insulationMaterial: cork.id
        }
      }

      const newAssembly = addRingBeamAssembly(name, config)
      setSelectedAssemblyId(newAssembly.id)
    },
    [addRingBeamAssembly]
  )

  const handleDuplicate = useCallback(() => {
    if (!selectedAssembly) return

    const { id: _id, name: _name, ...config } = selectedAssembly
    const newName = t($ => $.ringBeams.copyNameTemplate, {
      defaultValue: `{{name}} (Copy)`,
      name: selectedAssembly.name
    })
    const duplicated = addRingBeamAssembly(newName, config)
    setSelectedAssemblyId(duplicated.id)
  }, [selectedAssembly, addRingBeamAssembly])

  const handleDelete = useCallback(() => {
    if (!selectedAssembly || usage.isUsed) return

    const currentIndex = ringBeamAssemblies.findIndex(m => m.id === selectedAssemblyId)
    removeRingBeamAssembly(selectedAssembly.id)

    if (ringBeamAssemblies.length > 1) {
      const nextAssembly = ringBeamAssemblies[currentIndex + 1] ?? ringBeamAssemblies[currentIndex - 1]
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      setSelectedAssemblyId(nextAssembly?.id ?? null)
    } else {
      setSelectedAssemblyId(null)
    }
  }, [selectedAssembly, selectedAssemblyId, ringBeamAssemblies, removeRingBeamAssembly, usage.isUsed])

  const handleReset = useCallback(() => {
    resetRingBeamAssembliesToDefaults()
    // Keep selection if it still exists after reset
    const stillExists = ringBeamAssemblies.some(a => a.id === selectedAssemblyId)
    if (!stillExists && ringBeamAssemblies.length > 0) {
      setSelectedAssemblyId(ringBeamAssemblies[0].id)
    }
  }, [resetRingBeamAssembliesToDefaults, selectedAssemblyId, ringBeamAssemblies])

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Selector + Actions */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2 items-end">
          <div className="flex flex-col gap-1 grow-1">
            <RingBeamAssemblySelect
              value={selectedAssemblyId as RingBeamAssemblyId | undefined}
              onValueChange={value => {
                setSelectedAssemblyId(value ?? null)
              }}
              showDefaultIndicator
              defaultAssemblyIds={[defaultBaseId, defaultTopId].filter(Boolean) as RingBeamAssemblyId[]}
            />
          </div>

          <DropdownMenu>
            <DropdownMenu.Trigger>
              <Button size="icon" title={t($ => $.common.addNew)}>
                <PlusIcon />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item
                onSelect={() => {
                  handleAddNew('full')
                }}
              >
                <div className="flex items-center gap-1">
                  {React.createElement(getRingBeamTypeIcon('full'))}
                  {t($ => $.ringBeams.types.full)}
                </div>
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={() => {
                  handleAddNew('double')
                }}
              >
                <div className="flex items-center gap-1">
                  {React.createElement(getRingBeamTypeIcon('double'))}
                  {t($ => $.ringBeams.types.double)}
                </div>
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={() => {
                  handleAddNew('brick')
                }}
              >
                <div className="flex items-center gap-1">
                  {React.createElement(getRingBeamTypeIcon('brick'))}
                  {t($ => $.ringBeams.types.brick)}
                </div>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu>

          <Button
            size="icon"
            onClick={handleDuplicate}
            disabled={!selectedAssembly}
            title={t($ => $.common.duplicate)}
            variant="soft"
          >
            <CopyIcon />
          </Button>

          <AlertDialog.Root>
            <AlertDialog.Trigger>
              <Button
                size="icon"
                disabled={!selectedAssembly || usage.isUsed}
               className="text-destructive"
                title={usage.isUsed ? t($ => $.common.inUseCannotDelete) : t($ => $.common.delete)}
              >
                <TrashIcon />
              </Button>
            </AlertDialog.Trigger>
            <AlertDialog.Content>
              <AlertDialog.Title>{t($ => $.ringBeams.deleteTitle)}</AlertDialog.Title>
              <AlertDialog.Description>
                {t($ => $.ringBeams.deleteConfirm, { name: selectedAssembly?.name })}
              </AlertDialog.Description>
              <div className="flex gap-3 mt-4 justify-end">
                <AlertDialog.Cancel>
                  <Button variant="soft" className="text-gray-900">
                    {t($ => $.common.cancel)}
                  </Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action>
                  <Button variant="destructive" onClick={handleDelete}>
                    {t($ => $.common.delete)}
                  </Button>
                </AlertDialog.Action>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Root>

          <AlertDialog.Root>
            <AlertDialog.Trigger>
              <Button size="icon"className="text-destructive" variant="outline" title={t($ => $.common.resetToDefaults)}>
                <ResetIcon />
              </Button>
            </AlertDialog.Trigger>
            <AlertDialog.Content>
              <AlertDialog.Title>{t($ => $.ringBeams.resetTitle)}</AlertDialog.Title>
              <AlertDialog.Description>{t($ => $.ringBeams.resetConfirm)}</AlertDialog.Description>
              <div className="flex gap-3 mt-4 justify-end">
                <AlertDialog.Cancel>
                  <Button variant="soft" className="text-gray-900">
                    {t($ => $.common.cancel)}
                  </Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action>
                  <Button variant="destructive" onClick={handleReset}>
                    {t($ => $.common.reset)}
                  </Button>
                </AlertDialog.Action>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Root>
        </div>
      </div>
      {/* Form */}
      {selectedAssembly && <ConfigForm assembly={selectedAssembly} />}
      {!selectedAssembly && ringBeamAssemblies.length === 0 && (
        <div className="justify-center items-center p-5">
          <span className="text-gray-900">No ring beam assemblies yet. Create one using the "New" button above.</span>
        </div>
      )}
      {/* Defaults Section */}
      <Separator />
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-2 gap-x-3 items-center">
          <div className="flex items-center gap-1">
            <Label.Root>
              <span className="text-base font-medium text-gray-900">{t($ => $.ringBeams.defaultBasePlate)}</span>
            </Label.Root>
            <MeasurementInfo highlightedPart="basePlate" />
          </div>
          <RingBeamAssemblySelect
            value={defaultBaseId}
            onValueChange={setDefaultBaseRingBeamAssembly}
            placeholder={t($ => $.common.placeholders.selectDefault)}
            size="2"
            allowNone
          />

          <div className="flex items-center gap-1">
            <Label.Root>
              <span className="text-base font-medium text-gray-900">{t($ => $.ringBeams.defaultTopPlate)}</span>
            </Label.Root>
            <MeasurementInfo highlightedPart="topPlate" />
          </div>
          <RingBeamAssemblySelect
            value={defaultTopId}
            onValueChange={setDefaultTopRingBeamAssembly}
            placeholder={t($ => $.common.placeholders.selectDefault)}
            size="2"
            allowNone
          />
        </div>

        {usage.isUsed && <UsageDisplay usage={usage} />}
      </div>
    </div>
  )
}

function ConfigForm({ assembly }: { assembly: RingBeamAssemblyConfig }): React.ReactNode {
  const { t } = useTranslation('config')
  const { formatLength } = useFormatters()
  const { updateRingBeamAssemblyName, updateRingBeamAssemblyConfig } = useConfigActions()

  const nameKey = assembly.nameKey

  const nameInput = useDebouncedInput(
    nameKey ? t(nameKey) : assembly.name,
    (name: string) => {
      updateRingBeamAssemblyName(assembly.id, name)
    },
    {
      debounceMs: 1000
    }
  )

  const handleUpdateConfig = useCallback(
    (updates: Partial<RingBeamConfig>) => {
      updateRingBeamAssemblyConfig(assembly.id, updates)
    },
    [assembly, updateRingBeamAssemblyConfig]
  )

  const totalHeight = useMemo(() => formatLength(resolveRingBeamAssembly(assembly).height), [assembly, formatLength])

  return (
    <div
      className="flex flex-col
      gap-3
      p-3
      "
      style={{ border: '1px solid var(--gray-6)', borderRadius: 'var(--radius-2)' }}
    >
      <div className="grid grid-cols-2 gap-2 gap-x-3 items-center">
        <div className="grid grid-cols-[auto_1fr] gap-x-2 items-center">
          <Label.Root>
            <span className="text-base font-medium text-gray-900">{t($ => $.common.name)}</span>
          </Label.Root>
          <TextField.Root
            value={nameInput.value}
            onChange={e => {
              nameInput.handleChange(e.target.value)
            }}
            onBlur={nameInput.handleBlur}
            onKeyDown={nameInput.handleKeyDown}
            placeholder={t($ => $.ringBeams.placeholders.name)}
            size="2"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 gap-x-3 items-center">
          <div className="flex gap-2 items-center">
            <Label.Root>
              <span className="text-base font-medium text-gray-900">{t($ => $.common.type)}</span>
            </Label.Root>
            <div className="flex gap-2 items-center">
              {React.createElement(getRingBeamTypeIcon(assembly.type))}
              <span className="text-base text-gray-900">{t($ => $.ringBeams.types[assembly.type])}</span>
            </div>
          </div>

          <div className="flex gap-2 items-center">
            <Label.Root>
              <span className="text-base font-medium text-gray-900">{t($ => $.common.totalHeight)}</span>
            </Label.Root>
            <span className="text-base text-gray-900">{totalHeight}</span>
          </div>
        </div>
      </div>

      <Separator />

      {assembly.type === 'full' && <FullRingBeamFields config={assembly} onUpdate={handleUpdateConfig} />}
      {assembly.type === 'double' && <DoubleRingBeamFields config={assembly} onUpdate={handleUpdateConfig} />}
      {assembly.type === 'brick' && <BrickRingBeamFields config={assembly} onUpdate={handleUpdateConfig} />}
    </div>
  )
}

function FullRingBeamFields({
  config,
  onUpdate
}: {
  config: RingBeamConfig & { type: 'full' }
  onUpdate: (updates: Partial<RingBeamConfig>) => void
}) {
  const { t } = useTranslation('config')
  return (
    <>
      <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-2 gap-x-3 items-center">
        <Label.Root>
          <span className="text-base font-medium text-gray-900">{t($ => $.common.materialLabel)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.material}
          onValueChange={material => {
            if (!material) return
            onUpdate({ material })
          }}
          placeholder={t($ => $.common.placeholders.selectMaterial)}
          size="2"
          preferredTypes={['dimensional']}
        />

        <div className="flex items-center gap-1">
          <Label.Root>
            <span className="text-base font-medium text-gray-900">{t($ => $.common.height)}</span>
          </Label.Root>
          <MeasurementInfo highlightedPart="plates" />
        </div>
        <LengthField
          value={config.height}
          onChange={height => {
            onUpdate({ height })
          }}
          unit="mm"
          size="2"
        />

        <Label.Root>
          <span className="text-base font-medium text-gray-900">{t($ => $.common.width)}</span>
        </Label.Root>
        <LengthField
          value={config.width}
          onChange={width => {
            onUpdate({ width })
          }}
          unit="mm"
          size="2"
        />

        <Label.Root>
          <span className="text-base font-medium text-gray-900">{t($ => $.ringBeams.labels.offsetFromInsideEdge)}</span>
        </Label.Root>
        <LengthField
          value={config.offsetFromEdge}
          onChange={offsetFromEdge => {
            onUpdate({ offsetFromEdge })
          }}
          unit="mm"
          size="2"
        />
      </div>
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
  const { t } = useTranslation('config')
  return (
    <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-2 gap-x-3 items-center">
      <Label.Root>
        <span className="text-base font-medium text-gray-900">{t($ => $.common.materialLabel)}</span>
      </Label.Root>
      <MaterialSelectWithEdit
        value={config.material}
        onValueChange={material => {
          if (!material) return
          onUpdate({ material })
        }}
        placeholder={t($ => $.common.placeholders.selectMaterial)}
        size="2"
        preferredTypes={['dimensional']}
      />

      <Label.Root>
        <span className="text-base font-medium text-gray-900">{t($ => $.common.materialLabel)}</span>
      </Label.Root>
      <MaterialSelectWithEdit
        value={config.infillMaterial}
        onValueChange={infillMaterial => {
          if (!infillMaterial) return
          onUpdate({ infillMaterial })
        }}
        placeholder={t($ => $.common.placeholders.selectMaterial)}
        size="2"
      />

      <div className="flex items-center gap-1">
        <Label.Root>
          <span className="text-base font-medium text-gray-900">{t($ => $.common.height)}</span>
        </Label.Root>
        <MeasurementInfo highlightedPart="plates" />
      </div>
      <LengthField
        value={config.height}
        onChange={height => {
          onUpdate({ height })
        }}
        unit="mm"
        size="2"
      />

      <div className="flex items-center gap-1">
        <Label.Root>
          <span className="text-base font-medium text-gray-900">{t($ => $.common.thickness)}</span>
        </Label.Root>
        <MeasurementInfo highlightedPart="plates" />
      </div>
      <LengthField
        value={config.thickness}
        onChange={thickness => {
          onUpdate({ thickness })
        }}
        unit="mm"
        size="2"
      />

      <div className="flex items-center gap-1">
        <Label.Root>
          <span className="text-base font-medium text-gray-900">{t($ => $.common.spacing)}</span>
        </Label.Root>
        <MeasurementInfo highlightedPart="plates" />
      </div>
      <LengthField
        value={config.spacing}
        onChange={spacing => {
          onUpdate({ spacing })
        }}
        unit="mm"
        size="2"
      />

      <div className="flex items-center gap-1">
        <Label.Root>
          <span className="text-base font-medium text-gray-900">{t($ => $.ringBeams.labels.offsetFromInsideEdge)}</span>
        </Label.Root>
        <MeasurementInfo highlightedPart="plates" />
      </div>
      <LengthField
        value={config.offsetFromEdge}
        onChange={offsetFromEdge => {
          onUpdate({ offsetFromEdge })
        }}
        unit="mm"
        size="2"
      />

      <span className="text-base font-medium text-gray-900">{t($ => $.ringBeams.labels.cornerHandling)}</span>

      <div className="col-span-3">
        <SegmentedControl.Root
          value={config.cornerHandling}
          onValueChange={value => {
            onUpdate({ cornerHandling: value as CornerHandling })
          }}
          size="2"
        >
          <SegmentedControl.Item value="cut">{t($ => $.ringBeams.labels.cornerHandlingCut)}</SegmentedControl.Item>
          <SegmentedControl.Item value="interweave">
            {t($ => $.ringBeams.labels.cornerHandlingInterweave)}
          </SegmentedControl.Item>
        </SegmentedControl.Root>
      </div>
    </div>
  )
}

function BrickRingBeamFields({
  config,
  onUpdate
}: {
  config: RingBeamConfig & { type: 'brick' }
  onUpdate: (updates: Partial<RingBeamConfig>) => void
}) {
  const { t } = useTranslation('config')
  return (
    <>
      <h2>{t($ => $.ringBeams.sections.stemWall)}</h2>

      <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-2 gap-x-3 items-center">
        <Label.Root>
          <span className="text-base font-medium text-gray-900">{t($ => $.common.height)}</span>
        </Label.Root>
        <LengthField
          value={config.wallHeight}
          onChange={wallHeight => {
            onUpdate({ wallHeight })
          }}
          unit="cm"
          min={0}
          size="2"
        />

        <Label.Root>
          <span className="text-base font-medium text-gray-900">{t($ => $.common.width)}</span>
        </Label.Root>
        <LengthField
          value={config.wallWidth}
          onChange={wallWidth => {
            onUpdate({ wallWidth })
          }}
          unit="cm"
          min={0}
          size="2"
        />

        <Label.Root>
          <span className="text-base font-medium text-gray-900">{t($ => $.common.materialLabel)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.wallMaterial}
          onValueChange={wallMaterial => {
            if (!wallMaterial) return
            onUpdate({ wallMaterial })
          }}
          placeholder={t($ => $.common.placeholders.selectMaterial)}
          size="2"
          preferredTypes={['dimensional']}
        />
      </div>

      <Separator />

      <h2>{t($ => $.ringBeams.sections.insulation)}</h2>

      <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-2 gap-x-3 items-center">
        <Label.Root>
          <span className="text-base font-medium text-gray-900">{t($ => $.common.thickness)}</span>
        </Label.Root>
        <LengthField
          value={config.insulationThickness}
          onChange={insulationThickness => {
            onUpdate({ insulationThickness })
          }}
          unit="cm"
          min={0}
          size="2"
        />

        <Label.Root>
          <span className="text-base font-medium text-gray-900">{t($ => $.common.materialLabel)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.insulationMaterial}
          onValueChange={insulationMaterial => {
            if (!insulationMaterial) return
            onUpdate({ insulationMaterial })
          }}
          placeholder={t($ => $.common.placeholders.selectMaterial)}
          size="2"
        />
      </div>

      <Separator />

      <h2>{t($ => $.ringBeams.sections.beam)}</h2>

      <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-2 gap-x-3 items-center">
        <Label.Root>
          <span className="text-base font-medium text-gray-900">{t($ => $.common.thickness)}</span>
        </Label.Root>
        <LengthField
          value={config.beamThickness}
          onChange={beamThickness => {
            onUpdate({ beamThickness })
          }}
          unit="cm"
          min={0}
          size="2"
        />

        <Label.Root>
          <span className="text-base font-medium text-gray-900">{t($ => $.common.width)}</span>
        </Label.Root>
        <LengthField
          value={config.beamWidth}
          onChange={beamWidth => {
            onUpdate({ beamWidth })
          }}
          unit="cm"
          min={0}
          size="2"
        />

        <Label.Root>
          <span className="text-base font-medium text-gray-900">{t($ => $.common.materialLabel)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.beamMaterial}
          onValueChange={beamMaterial => {
            if (!beamMaterial) return
            onUpdate({ beamMaterial })
          }}
          placeholder={t($ => $.common.placeholders.selectMaterial)}
          size="2"
          preferredTypes={['dimensional']}
        />
      </div>

      <Separator />

      <h2>{t($ => $.ringBeams.sections.waterproofing)}</h2>

      <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-2 gap-x-3 items-center">
        <Label.Root>
          <span className="text-base font-medium text-gray-900">{t($ => $.common.thickness)}</span>
        </Label.Root>
        <LengthField
          value={config.waterproofingThickness}
          onChange={waterproofingThickness => {
            onUpdate({ waterproofingThickness })
          }}
          unit="mm"
          min={0}
          size="2"
        />

        <Label.Root>
          <span className="text-base font-medium text-gray-900">{t($ => $.common.materialLabel)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.waterproofingMaterial}
          onValueChange={waterproofingMaterial => {
            if (!waterproofingMaterial) return
            onUpdate({ waterproofingMaterial })
          }}
          placeholder={t($ => $.common.placeholders.selectMaterial)}
          size="2"
          preferredTypes={['sheet']}
        />
      </div>
    </>
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

function UsageDisplay({ usage }: { usage: RingBeamAssemblyUsage }): React.JSX.Element {
  const { t } = useTranslation('config')

  return (
    <div className="grid grid-cols-[auto_1fr] gap-2 gap-x-3 items-center">
      <Label.Root>
        <span className="text-base font-medium text-gray-900">{t($ => $.usage.usedBy)}</span>
      </Label.Root>
      <div className="flex gap-1 flex-wrap">
        {usage.isDefaultBase && (
          <Badge size="2" variant="soft" color="blue">
            {t($ => $.usage.globalDefault_ringBeamBase)}
          </Badge>
        )}
        {usage.isDefaultTop && (
          <Badge size="2" variant="soft" color="blue">
            {t($ => $.usage.globalDefault_ringBeamTop)}
          </Badge>
        )}
        {usage.storeyIds.map(id => (
          <UsageBadge key={id} id={id} />
        ))}
      </div>
    </div>
  )
}
