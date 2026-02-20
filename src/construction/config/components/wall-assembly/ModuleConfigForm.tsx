import * as Label from '@radix-ui/react-label'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { Select } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { TextField } from '@/components/ui/text-field'
import { MaterialSelectWithEdit } from '@/construction/materials/components/MaterialSelectWithEdit'
import { roughWood, woodwool } from '@/construction/materials/material'
import type { ModuleConfig } from '@/construction/walls/modules/modules'
import { LengthField } from '@/shared/components/LengthField/LengthField'

import { TriangularBattensConfigForm } from './TriangularBattensConfigForm'

interface ModuleConfigFormProps {
  module: ModuleConfig
  onUpdate: (module: ModuleConfig) => void
}

export function ModuleConfigForm({ module, onUpdate }: ModuleConfigFormProps): React.JSX.Element {
  const { t } = useTranslation('config')
  return (
    <div className="flex flex-col gap-3">
      <h2>{t($ => $.walls.moduleConfiguration)}</h2>
      <div className="grid grid-cols-[6em_1fr] items-center gap-2 gap-x-3">
        <Label.Root>
          <span className="text-sm font-medium">{t($ => $.walls.moduleType)}</span>
        </Label.Root>
        <Select.Root
          value={module.type}
          onValueChange={value => {
            if (value === 'single') {
              onUpdate({
                type: 'single',
                minWidth: module.minWidth,
                maxWidth: module.maxWidth,
                frameThickness: module.frameThickness,
                frameMaterial: module.frameMaterial,
                strawMaterial: module.strawMaterial,
                triangularBattens: module.triangularBattens
              })
            } else {
              onUpdate({
                type: 'double',
                minWidth: module.minWidth,
                maxWidth: module.maxWidth,
                frameThickness: module.frameThickness,
                frameMaterial: module.frameMaterial,
                strawMaterial: module.strawMaterial,
                triangularBattens: module.triangularBattens,
                frameWidth: 'frameWidth' in module ? module.frameWidth : 120,
                spacerSize: 'spacerSize' in module ? module.spacerSize : 120,
                spacerCount: 'spacerCount' in module ? module.spacerCount : 3,
                spacerMaterial: 'spacerMaterial' in module ? module.spacerMaterial : roughWood.id,
                infillMaterial: 'infillMaterial' in module ? module.infillMaterial : woodwool.id
              })
            }
          }}
        >
          <Select.Trigger>
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="single">{t($ => $.walls.moduleTypeSingle)}</Select.Item>
            <Select.Item value="double">{t($ => $.walls.moduleTypeDouble)}</Select.Item>
          </Select.Content>
        </Select.Root>
      </div>
      <div className="grid grid-cols-[6em_1fr_6em_1fr] gap-2 gap-x-3">
        <Label.Root>
          <span className="text-sm font-medium">{t($ => $.walls.minWidth)}</span>
        </Label.Root>
        <LengthField
          value={module.minWidth}
          onChange={value => {
            onUpdate({ ...module, minWidth: value })
          }}
          unit="mm"
          size="sm"
        />

        <Label.Root>
          <span className="text-sm font-medium">{t($ => $.walls.maxWidth)}</span>
        </Label.Root>
        <LengthField
          value={module.maxWidth}
          onChange={value => {
            onUpdate({ ...module, maxWidth: value })
          }}
          unit="mm"
          size="sm"
        />

        <Label.Root>
          <span className="text-sm font-medium">{t($ => $.walls.frameThickness)}</span>
        </Label.Root>
        <LengthField
          value={module.frameThickness}
          onChange={value => {
            onUpdate({ ...module, frameThickness: value })
          }}
          unit="mm"
          size="sm"
        />

        {module.type === 'double' && (
          <>
            <Label.Root>
              <span className="text-sm font-medium">{t($ => $.walls.frameWidth)}</span>
            </Label.Root>
            <LengthField
              value={module.frameWidth}
              onChange={value => {
                onUpdate({ ...module, frameWidth: value })
              }}
              unit="mm"
              size="sm"
            />

            <Label.Root>
              <span className="text-sm font-medium">{t($ => $.walls.spacerSize)}</span>
            </Label.Root>
            <LengthField
              value={module.spacerSize}
              onChange={value => {
                onUpdate({ ...module, spacerSize: value })
              }}
              unit="mm"
              size="sm"
            />

            <Label.Root>
              <span className="text-sm font-medium">{t($ => $.walls.spacerCount)}</span>
            </Label.Root>
            <TextField.Root
              type="number"
              value={module.spacerCount.toString()}
              onChange={event => {
                const next = Number.parseInt(event.target.value, 10)
                onUpdate({ ...module, spacerCount: Number.isFinite(next) ? Math.max(2, next) : module.spacerCount })
              }}
              size="sm"
            >
              <TextField.Input min={2} />
            </TextField.Root>
          </>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 gap-x-3">
        <div className="flex flex-col gap-1">
          <Label.Root>
            <span className="text-sm font-medium">{t($ => $.walls.frameMaterial)}</span>
          </Label.Root>
          <MaterialSelectWithEdit
            value={module.frameMaterial}
            onValueChange={frameMaterial => {
              if (!frameMaterial) return
              onUpdate({ ...module, frameMaterial })
            }}
            size="sm"
            preferredTypes={['dimensional']}
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label.Root>
            <span className="text-sm font-medium">{t($ => $.common.strawMaterialOverride)}</span>
          </Label.Root>
          <MaterialSelectWithEdit
            value={module.strawMaterial}
            allowEmpty
            emptyLabel={t($ => $.common.useGlobalStrawSettings)}
            onValueChange={strawMaterial => {
              onUpdate({ ...module, strawMaterial: strawMaterial ?? undefined })
            }}
            size="sm"
            preferredTypes={['strawbale']}
          />
        </div>

        {module.type === 'double' && (
          <>
            <div className="flex flex-col gap-1">
              <Label.Root>
                <span className="text-sm font-medium">{t($ => $.walls.spacerMaterial)}</span>
              </Label.Root>
              <MaterialSelectWithEdit
                value={module.spacerMaterial}
                onValueChange={spacerMaterial => {
                  if (!spacerMaterial) return
                  onUpdate({ ...module, spacerMaterial })
                }}
                size="sm"
                preferredTypes={['dimensional']}
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label.Root>
                <span className="text-sm font-medium">{t($ => $.walls.infillMaterial)}</span>
              </Label.Root>
              <MaterialSelectWithEdit
                value={module.infillMaterial}
                onValueChange={infillMaterial => {
                  if (!infillMaterial) return
                  onUpdate({ ...module, infillMaterial })
                }}
                size="sm"
              />
            </div>
          </>
        )}
      </div>
      <Separator />
      <TriangularBattensConfigForm
        triangularBattens={module.triangularBattens}
        onUpdate={triangularBattens => {
          onUpdate({ ...module, triangularBattens })
        }}
      />
    </div>
  )
}
