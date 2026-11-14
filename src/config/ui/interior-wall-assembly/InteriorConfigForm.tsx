import * as Label from '@radix-ui/react-label'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { useConfigActions } from '@/config/store'
import type { ConfigActions } from '@/config/store/types'
import type { InteriorWallAssemblyConfig } from '@/config/types'
import { LayerSetSelectWithEdit } from '@/config/ui/layers/LayerSetSelect'
import { OpeningAssemblySelectWithEdit } from '@/config/ui/opening-assembly/OpeningAssemblySelectWithEdit'
import type { MaterialId, MaterialType } from '@/materials/types'
import { MaterialSelectWithEdit } from '@/materials/ui/MaterialSelectWithEdit'
import { LengthField as LengthInput } from '@/shared/ui/LengthField/LengthField'
import { Card } from '@/shared/ui/components/card'
import { Separator } from '@/shared/ui/components/separator'
import { Switch } from '@/shared/ui/components/switch'
import { TextField } from '@/shared/ui/components/text-field'
import { useDebouncedInput } from '@/shared/ui/hooks/useDebouncedInput'

interface InteriorConfigFormProps {
  assembly: InteriorWallAssemblyConfig
}

export function InteriorConfigForm({ assembly }: InteriorConfigFormProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const { updateInteriorWallAssemblyName, updateInteriorWallAssemblyConfig } = useConfigActions()
  const nameInput = useDebouncedInput(
    assembly.nameKey ? t(assembly.nameKey) : assembly.name,
    name => {
      updateInteriorWallAssemblyName(assembly.id, name)
    },
    { debounceMs: 1000 }
  )
  const updateConfig = useCallback(
    (updates: Parameters<ConfigActions['updateInteriorWallAssemblyConfig']>[1]) => {
      updateInteriorWallAssemblyConfig(assembly.id, updates)
    },
    [assembly.id, updateInteriorWallAssemblyConfig]
  )

  return (
    <Card className="flex flex-col gap-3 p-3">
      <div className="grid grid-cols-2 items-center gap-2">
        <div className="grid grid-cols-[auto_1fr] items-center gap-2">
          <Label.Root>
            <span className="text-base font-medium">{t($ => $.common.name)}</span>
          </Label.Root>
          <TextField.Root
            value={nameInput.value}
            onChange={event => {
              nameInput.handleChange(event.target.value)
            }}
            onBlur={nameInput.handleBlur}
            onKeyDown={nameInput.handleKeyDown}
          />
        </div>
        <div className="flex items-center gap-2">
          <Label.Root>
            <span className="text-base font-medium">{t($ => $.common.type)}</span>
          </Label.Root>
          <span>{t($ => $.walls.interiorTypes[assembly.type])}</span>
        </div>
      </div>
      <Separator />
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-3">
          {assembly.type === 'monolithic' && (
            <ConfigSection isFirst title={t($ => $.walls.monolithicConfiguration)}>
              <MaterialField
                label={t($ => $.walls.material)}
                value={assembly.material}
                onChange={material => {
                  if (material) updateConfig({ material })
                }}
              />
            </ConfigSection>
          )}
          {assembly.type !== 'monolithic' && <StudFields assembly={assembly} updateConfig={updateConfig} />}
          {assembly.type === 'planked-stud' && (
            <ConfigSection title={t($ => $.walls.plankingConfiguration)}>
              <LengthField
                label={t($ => $.walls.plankThickness)}
                value={assembly.plankThickness}
                onChange={plankThickness => {
                  updateConfig({ plankThickness })
                }}
              />
              <MaterialField
                label={t($ => $.walls.plankMaterial)}
                value={assembly.plankMaterial}
                onChange={plankMaterial => {
                  if (plankMaterial) updateConfig({ plankMaterial })
                }}
                preferredTypes={['dimensional']}
              />
            </ConfigSection>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <ConfigSection isFirst title={t($ => $.walls.wallConfiguration)}>
            <SelectField label={t($ => $.walls.layerSet)}>
              <LayerSetSelectWithEdit
                value={assembly.layerSetId}
                onValueChange={layerSetId => {
                  if (layerSetId) updateConfig({ layerSetId })
                }}
                use="wall"
                size="sm"
              />
            </SelectField>
            <SelectField label={t($ => $.walls.openingAssembly)}>
              <OpeningAssemblySelectWithEdit
                value={assembly.openingAssemblyId}
                allowDefault
                onValueChange={openingAssemblyId => {
                  updateConfig({ openingAssemblyId })
                }}
                size="sm"
              />
            </SelectField>
          </ConfigSection>
        </div>
      </div>
    </Card>
  )
}

function StudFields({
  assembly,
  updateConfig
}: {
  assembly: Extract<InteriorWallAssemblyConfig, { type: 'planked-stud' | 'monolithic-stud' }>
  updateConfig: (updates: Parameters<ConfigActions['updateInteriorWallAssemblyConfig']>[1]) => void
}): React.JSX.Element {
  const { t } = useTranslation('config')
  return (
    <>
      <ConfigSection isFirst title={t($ => $.walls.studConfiguration)}>
        <MaterialField
          label={t($ => $.walls.studMaterial)}
          value={assembly.studMaterial}
          onChange={studMaterial => {
            if (studMaterial) updateConfig({ studMaterial })
          }}
          preferredTypes={['dimensional']}
        />
        <LengthField
          label={t($ => $.walls.studWidth)}
          value={assembly.studWidth}
          onChange={studWidth => {
            updateConfig({ studWidth })
          }}
          min={0}
        />
        <LengthField
          label={t($ => $.walls.desiredStudSpacing)}
          value={assembly.desiredStudSpacing}
          onChange={desiredStudSpacing => {
            updateConfig({ desiredStudSpacing })
          }}
          min={assembly.minStudSpacing}
          max={assembly.maxStudSpacing}
        />
        <BooleanField
          label={t($ => $.walls.equidistantStuds)}
          checked={assembly.equidistantStuds}
          onCheckedChange={equidistantStuds => {
            updateConfig({ equidistantStuds })
          }}
        />
        <LengthField
          label={t($ => $.walls.minStudSpacing)}
          value={assembly.minStudSpacing}
          onChange={minStudSpacing => {
            updateConfig({ minStudSpacing })
          }}
          min={0}
          max={assembly.desiredStudSpacing}
        />
        <LengthField
          label={t($ => $.walls.maxStudSpacing)}
          value={assembly.maxStudSpacing}
          onChange={maxStudSpacing => {
            updateConfig({ maxStudSpacing })
          }}
          min={assembly.desiredStudSpacing}
        />
      </ConfigSection>
      <ConfigSection title={t($ => $.walls.fillConfiguration)}>
        <MaterialField
          label={t($ => $.common.infillMaterial)}
          value={assembly.fillMaterial ?? null}
          allowEmpty={assembly.type === 'planked-stud'}
          onChange={fillMaterial => {
            if (fillMaterial) updateConfig({ fillMaterial })
          }}
        />
      </ConfigSection>
      <ConfigSection title={t($ => $.walls.headPlateConfiguration)}>
        <LengthField
          label={t($ => $.common.thickness)}
          value={assembly.headPlateThickness}
          onChange={headPlateThickness => {
            updateConfig({ headPlateThickness })
          }}
          min={0}
        />
        <MaterialField
          label={t($ => $.walls.material)}
          value={assembly.headPlateMaterial}
          allowEmpty
          onChange={headPlateMaterial => {
            updateConfig({ headPlateMaterial: headPlateMaterial ?? undefined })
          }}
          preferredTypes={['dimensional']}
        />
      </ConfigSection>
      <ConfigSection title={t($ => $.walls.solePlateConfiguration)}>
        <LengthField
          label={t($ => $.common.thickness)}
          value={assembly.solePlateThickness}
          onChange={solePlateThickness => {
            updateConfig({ solePlateThickness })
          }}
          min={0}
        />
        <MaterialField
          label={t($ => $.walls.material)}
          value={assembly.solePlateMaterial}
          allowEmpty
          onChange={solePlateMaterial => {
            updateConfig({ solePlateMaterial: solePlateMaterial ?? undefined })
          }}
          preferredTypes={['dimensional']}
        />
      </ConfigSection>
      <ConfigSection title={t($ => $.walls.nogginConfiguration)}>
        <MaterialField
          label={t($ => $.walls.material)}
          value={assembly.nogginMaterial}
          allowEmpty
          onChange={nogginMaterial => {
            updateConfig({ nogginMaterial: nogginMaterial ?? undefined })
          }}
          preferredTypes={['dimensional']}
        />
        <LengthField
          label={t($ => $.common.thickness)}
          value={assembly.nogginThickness}
          onChange={nogginThickness => {
            updateConfig({ nogginThickness })
          }}
          min={0}
        />
        <LengthField
          label={t($ => $.common.spacing)}
          value={assembly.nogginSpacing}
          onChange={nogginSpacing => {
            updateConfig({ nogginSpacing })
          }}
          min={0}
        />
        <BooleanField
          label={t($ => $.walls.equidistantNoggins)}
          checked={assembly.equidistantNoggins}
          onCheckedChange={equidistantNoggins => {
            updateConfig({ equidistantNoggins })
          }}
        />
        <BooleanField
          label={t($ => $.walls.staggerNoggins)}
          checked={assembly.staggerNoggins}
          onCheckedChange={staggerNoggins => {
            updateConfig({ staggerNoggins })
          }}
        />
      </ConfigSection>
    </>
  )
}

function ConfigSection({
  title,
  children,
  isFirst
}: {
  title: string
  children: React.ReactNode
  isFirst?: boolean
}): React.JSX.Element {
  return (
    <>
      {isFirst ? <></> : <Separator />}
      <div className="flex flex-col gap-3">
        <h2>{title}</h2>
        <div className="grid grid-cols-2 gap-2 gap-x-3">{children}</div>
      </div>
    </>
  )
}

function LengthField({
  label,
  value,
  onChange,
  min,
  max
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <Label.Root>
        <span className="text-sm font-medium">{label}</span>
      </Label.Root>
      <LengthInput value={value} onChange={onChange} unit="mm" size="sm" min={min} max={max} />
    </div>
  )
}

function SelectField({ label, children }: { label: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <Label.Root>
        <span className="text-sm font-medium">{label}</span>
      </Label.Root>
      {children}
    </div>
  )
}

function BooleanField({
  label,
  checked,
  onCheckedChange
}: {
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label.Root>
        <span className="text-sm font-medium">{label}</span>
      </Label.Root>
      <Switch checked={checked} onCheckedChange={onCheckedChange} size="sm" />
    </div>
  )
}

function MaterialField({
  label,
  value,
  onChange,
  allowEmpty = false,
  preferredTypes
}: {
  label: string
  value: MaterialId | null | undefined
  onChange: (value: MaterialId | null) => void
  allowEmpty?: boolean
  preferredTypes?: MaterialType[]
}): React.JSX.Element {
  const { t } = useTranslation('config')
  return (
    <div className="flex flex-col gap-1">
      <Label.Root>
        <span className="text-sm font-medium">{label}</span>
      </Label.Root>
      <MaterialSelectWithEdit
        value={value}
        allowEmpty={allowEmpty}
        emptyLabel={t($ => $.common.none)}
        onValueChange={onChange}
        size="sm"
        preferredTypes={preferredTypes}
      />
    </div>
  )
}
