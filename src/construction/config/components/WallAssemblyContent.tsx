import {
  CircleIcon,
  CopyIcon,
  CubeIcon,
  InfoCircledIcon,
  LayersIcon,
  PlusIcon,
  ResetIcon,
  TrashIcon
} from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import React, { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { OpeningAssemblyId, WallAssemblyId } from '@/building/model/ids'
import { usePerimeterWalls } from '@/building/store'
import { AlertDialog } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { Select } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { TextField } from '@/components/ui/text-field'
import { Tooltip } from '@/components/ui/tooltip'
import { OpeningAssemblySelectWithEdit } from '@/construction/config/components/OpeningAssemblySelectWithEdit'
import { type EntityId, useEntityLabel } from '@/construction/config/components/useEntityLabel'
import { useConfigActions, useDefaultWallAssemblyId, useWallAssemblies } from '@/construction/config/store'
import type { WallAssemblyConfig } from '@/construction/config/types'
import { type WallAssemblyUsage, getWallAssemblyUsage } from '@/construction/config/usage'
import { WALL_LAYER_PRESETS } from '@/construction/layers/defaults'
import { MaterialSelectWithEdit } from '@/construction/materials/components/MaterialSelectWithEdit'
import type { MaterialId } from '@/construction/materials/material'
import {
  battens,
  ecococonBox,
  ecococonInclined,
  ecococonLintel,
  ecococonSill,
  ecococonStandard,
  lvl,
  roughWood,
  woodwool
} from '@/construction/materials/material'
import type { PostConfig } from '@/construction/materials/posts'
import { useMaterialActions } from '@/construction/materials/store'
import type { TriangularBattenConfig } from '@/construction/materials/triangularBattens'
import type {
  InfillWallSegmentConfig,
  ModulesWallConfig,
  NonStrawbaleWallConfig,
  PrefabModulesWallConfig,
  StrawhengeWallConfig,
  WallAssemblyType,
  WallConfig
} from '@/construction/walls'
import type { ModuleConfig } from '@/construction/walls/modules/modules'
import { MeasurementInfo } from '@/editor/components/MeasurementInfo'
import { LengthField } from '@/shared/components/LengthField'
import { useDebouncedInput } from '@/shared/hooks/useDebouncedInput'
import { useFormatters } from '@/shared/i18n/useFormatters'

import { getPerimeterConfigTypeIcon } from './Icons'
import { WallAssemblySelect } from './WallAssemblySelect'
import { type LayerCopySource, LayerListEditor } from './layers/LayerListEditor'

interface InfillConfigFormProps {
  config: InfillWallSegmentConfig
  onUpdate: (updates: Partial<InfillWallSegmentConfig>) => void
}

function InfillConfigForm({ config, onUpdate }: InfillConfigFormProps): React.JSX.Element {
  const { t } = useTranslation('config')
  return (
    <div className="flex flex-col gap-3">
      <h2>{t($ => $.walls.infillConfiguration)}</h2>
      <div className="grid grid-cols-2 gap-2 gap-x-3">
        <div className="flex flex-col gap-1">
          <Label.Root>
            <span className="text-sm font-medium">{t($ => $.walls.desiredPostSpacing)}</span>
          </Label.Root>
          <LengthField
            value={config.desiredPostSpacing}
            onChange={value => {
              onUpdate({ ...config, desiredPostSpacing: value })
            }}
            unit="mm"
            size="sm"
            min={config.minStrawSpace}
            max={config.maxPostSpacing}
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label.Root>
            <span className="text-sm font-medium">{t($ => $.walls.maxPostSpacing)}</span>
          </Label.Root>
          <LengthField
            value={config.maxPostSpacing}
            onChange={value => {
              onUpdate({ ...config, maxPostSpacing: value })
            }}
            unit="mm"
            size="sm"
            min={config.desiredPostSpacing}
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label.Root>
            <span className="text-sm font-medium">{t($ => $.walls.minStrawSpace)}</span>
          </Label.Root>
          <LengthField
            value={config.minStrawSpace}
            onChange={value => {
              onUpdate({ ...config, minStrawSpace: value })
            }}
            unit="mm"
            size="sm"
            min={0}
            max={config.desiredPostSpacing}
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label.Root>
            <span className="text-sm font-medium">{t($ => $.common.strawMaterialOverride)}</span>
          </Label.Root>
          <MaterialSelectWithEdit
            value={config.strawMaterial ?? null}
            allowEmpty
            emptyLabel={t($ => $.common.useGlobalStrawSettings)}
            onValueChange={strawMaterial => {
              onUpdate({ ...config, strawMaterial: strawMaterial ?? undefined })
            }}
            size="sm"
            preferredTypes={['strawbale']}
          />
        </div>

        <Label.Root>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium">{t($ => $.walls.infillMaterial)}</span>
              <Tooltip content={t($ => $.walls.infillMaterialTooltip)}>
                <InfoCircledIcon cursor="help" width={12} height={12} style={{ color: 'var(--color-gray-900)' }} />
              </Tooltip>
            </div>
            <MaterialSelectWithEdit
              value={config.infillMaterial ?? null}
              allowEmpty
              emptyLabel={t($ => $.walls.noInfillMaterial)}
              onValueChange={infillMaterial => {
                onUpdate({ ...config, infillMaterial: infillMaterial ?? undefined })
              }}
              size="sm"
            />
          </div>
        </Label.Root>
      </div>
      <Separator />
      <PostsConfigSection
        posts={config.posts}
        onUpdate={posts => {
          onUpdate({ ...config, posts })
        }}
      />
      <Separator />
      <TriangularBattensConfigSection
        triangularBattens={config.triangularBattens}
        onUpdate={triangularBattens => {
          onUpdate({ ...config, triangularBattens })
        }}
      />
    </div>
  )
}

interface PostsConfigSectionProps {
  posts: PostConfig
  onUpdate: (posts: PostConfig) => void
}

function PostsConfigSection({ posts, onUpdate }: PostsConfigSectionProps): React.JSX.Element {
  const { t } = useTranslation('config')
  return (
    <div className="flex flex-col gap-3">
      <h2>{t($ => $.walls.postsConfiguration)}</h2>
      <div className="grid grid-cols-[5em_1fr] items-center gap-2 gap-x-3">
        <Label.Root>
          <span className="text-sm font-medium">{t($ => $.walls.postType)}</span>
        </Label.Root>
        <Select.Root
          value={posts.type}
          onValueChange={value => {
            if (value === 'full') {
              onUpdate({
                type: 'full',
                width: posts.width,
                material: posts.material
              })
            } else {
              onUpdate({
                type: 'double',
                width: posts.width,
                thickness: 'thickness' in posts ? posts.thickness : 120,
                infillMaterial: ('infillMaterial' in posts ? posts.infillMaterial : '') as MaterialId,
                material: posts.material
              })
            }
          }}
        >
          <Select.Trigger>
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="full">{t($ => $.walls.postTypeFull)}</Select.Item>
            <Select.Item value="double">{t($ => $.walls.postTypeDouble)}</Select.Item>
          </Select.Content>
        </Select.Root>
      </div>
      <div className="grid grid-cols-[5em_1fr_5em_1fr] gap-2 gap-x-3">
        <Label.Root>
          <span className="text-sm font-medium">{t($ => $.common.width)}</span>
        </Label.Root>
        <LengthField
          value={posts.width}
          onChange={value => {
            onUpdate({ ...posts, width: value })
          }}
          unit="mm"
          size="sm"
        />

        {posts.type === 'double' && (
          <>
            <Label.Root>
              <span className="text-sm font-medium">{t($ => $.common.thickness)}</span>
            </Label.Root>
            <LengthField
              value={posts.thickness}
              onChange={value => {
                onUpdate({ ...posts, thickness: value })
              }}
              unit="mm"
              size="sm"
            />
          </>
        )}
      </div>
      <div className="grid grid-cols-[5em_1fr] gap-2">
        <Label.Root>
          <span className="text-sm font-medium">{t($ => $.common.materialLabel)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={'material' in posts ? posts.material : undefined}
          onValueChange={material => {
            if (!material) return
            onUpdate({ ...posts, material })
          }}
          size="sm"
          preferredTypes={['dimensional']}
        />

        {posts.type === 'double' && (
          <>
            <Label.Root>
              <span className="text-sm font-medium">{t($ => $.walls.infillMaterial)}</span>
            </Label.Root>
            <MaterialSelectWithEdit
              value={posts.infillMaterial}
              onValueChange={infillMaterial => {
                if (!infillMaterial) return
                onUpdate({ ...posts, infillMaterial })
              }}
              size="sm"
            />
          </>
        )}
      </div>
    </div>
  )
}

interface TriangularBattensConfigSectionProps {
  triangularBattens: TriangularBattenConfig
  onUpdate: (config: TriangularBattenConfig) => void
}

function TriangularBattensConfigSection({
  triangularBattens,
  onUpdate
}: TriangularBattensConfigSectionProps): React.JSX.Element {
  const { t } = useTranslation('config')
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2>{t($ => $.walls.triangularBattensConfiguration)}</h2>
        <Tooltip content={t($ => $.walls.triangularBattensTooltip)}>
          <InfoCircledIcon className="cursor-help" />
        </Tooltip>
      </div>

      <div className="grid grid-cols-[5em_1fr_5em_1fr] items-center gap-2 gap-x-3">
        <Label.Root>
          <span className="text-sm font-medium">{t($ => $.walls.battenSize)}</span>
        </Label.Root>
        <LengthField
          value={triangularBattens.size}
          onChange={value => {
            onUpdate({ ...triangularBattens, size: value })
          }}
          unit="mm"
          size="sm"
        />

        <Label.Root>
          <span className="text-sm font-medium">{t($ => $.walls.battenMinLength)}</span>
        </Label.Root>
        <LengthField
          value={triangularBattens.minLength}
          onChange={value => {
            onUpdate({ ...triangularBattens, minLength: value })
          }}
          unit="mm"
          size="sm"
        />
      </div>

      <div className="grid grid-cols-[5em_1fr] gap-2 gap-x-3">
        <Label.Root>
          <span className="text-sm font-medium">{t($ => $.common.materialLabel)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={triangularBattens.material}
          onValueChange={material => {
            if (!material) return
            onUpdate({ ...triangularBattens, material })
          }}
          size="sm"
          preferredTypes={['dimensional']}
        />
      </div>

      <div className="flex gap-3">
        <Label.Root>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={triangularBattens.inside}
              onCheckedChange={checked => {
                onUpdate({ ...triangularBattens, inside: checked === true })
              }}
            />
            <span className="text-sm font-medium">{t($ => $.walls.battenInside)}</span>
          </div>
        </Label.Root>

        <Label.Root>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={triangularBattens.outside}
              onCheckedChange={checked => {
                onUpdate({ ...triangularBattens, outside: checked === true })
              }}
            />
            <span className="text-sm font-medium">{t($ => $.walls.battenOutside)}</span>
          </div>
        </Label.Root>
      </div>
    </div>
  )
}

interface ModuleConfigSectionProps {
  module: ModuleConfig
  onUpdate: (module: ModuleConfig) => void
}

function ModuleConfigSection({ module, onUpdate }: ModuleConfigSectionProps): React.JSX.Element {
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
          <Select.Trigger />
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
      <TriangularBattensConfigSection
        triangularBattens={module.triangularBattens}
        onUpdate={triangularBattens => {
          onUpdate({ ...module, triangularBattens })
        }}
      />
    </div>
  )
}

interface StrawhengeConfigFormProps {
  config: StrawhengeWallConfig
  onUpdate: (updates: Partial<StrawhengeWallConfig>) => void
}

function StrawhengeConfigForm({ config, onUpdate }: StrawhengeConfigFormProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      <ModuleConfigSection
        module={config.module}
        onUpdate={module => {
          onUpdate({ ...config, module })
        }}
      />
      <Separator />
      <InfillConfigForm
        config={config.infill}
        onUpdate={updates => {
          onUpdate({ ...config, infill: { ...config.infill, ...updates } })
        }}
      />
    </div>
  )
}

interface ModulesConfigFormProps {
  config: ModulesWallConfig
  onUpdate: (updates: Partial<ModulesWallConfig>) => void
}

function ModulesConfigForm({ config, onUpdate }: ModulesConfigFormProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      <ModuleConfigSection
        module={config.module}
        onUpdate={module => {
          onUpdate({ ...config, module })
        }}
      />
      <Separator />
      <InfillConfigForm
        config={config.infill}
        onUpdate={infill => {
          onUpdate({ ...config, infill: infill as typeof config.infill })
        }}
      />
    </div>
  )
}

interface NonStrawbaleConfigFormProps {
  config: NonStrawbaleWallConfig
  onUpdate: (updates: Partial<NonStrawbaleWallConfig>) => void
}

function NonStrawbaleConfigForm({ config, onUpdate }: NonStrawbaleConfigFormProps): React.JSX.Element {
  const { t } = useTranslation('config')
  return (
    <div className="flex flex-col gap-3">
      <h2>{t($ => $.walls.nonStrawbaleConfiguration)}</h2>
      <div className="grid grid-cols-[auto_1fr] gap-2 gap-x-3">
        <Label.Root>
          <span className="text-sm font-medium">{t($ => $.common.materialLabel)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.material}
          onValueChange={material => {
            if (!material) return
            onUpdate({ ...config, material })
          }}
          size="sm"
          preferredTypes={['volume']}
        />
      </div>
    </div>
  )
}

interface PrefabModulesConfigFormProps {
  config: PrefabModulesWallConfig
  onUpdate: (updates: Partial<PrefabModulesWallConfig>) => void
}

function PrefabModulesConfigForm({ config, onUpdate }: PrefabModulesConfigFormProps): React.JSX.Element {
  const { t } = useTranslation('config')

  return (
    <div className="flex flex-col gap-3">
      <h2>{t($ => $.walls.prefabModulesConfiguration)}</h2>
      <div className="grid grid-cols-2 gap-2 gap-x-3">
        <Label.Root className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t($ => $.walls.prefab.defaultMaterial)}</span>
          <MaterialSelectWithEdit
            value={config.defaultMaterial}
            onValueChange={defaultMaterial => {
              onUpdate({ defaultMaterial: defaultMaterial ?? undefined })
            }}
            size="sm"
            onlyTypes={['prefab']}
          />
        </Label.Root>

        <Label.Root className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t($ => $.walls.prefab.fallbackMaterial)}</span>
          <MaterialSelectWithEdit
            value={config.fallbackMaterial}
            onValueChange={fallbackMaterial => {
              onUpdate({ fallbackMaterial: fallbackMaterial ?? undefined })
            }}
            size="sm"
            allowEmpty
            emptyLabel={t($ => $.walls.prefab.useDefaultMaterial)}
            onlyTypes={['prefab']}
          />
        </Label.Root>

        <Label.Root className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t($ => $.walls.prefab.inclinedMaterial)}</span>
          <MaterialSelectWithEdit
            value={config.inclinedMaterial}
            onValueChange={inclinedMaterial => {
              onUpdate({ inclinedMaterial: inclinedMaterial ?? undefined })
            }}
            size="sm"
            allowEmpty
            emptyLabel={t($ => $.walls.prefab.useDefaultMaterial)}
            onlyTypes={['prefab']}
          />
        </Label.Root>

        <Label.Root className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t($ => $.walls.prefab.lintelMaterial)}</span>
          <MaterialSelectWithEdit
            value={config.lintelMaterial ?? undefined}
            onValueChange={lintelMaterial => {
              onUpdate({ lintelMaterial: lintelMaterial ?? undefined })
            }}
            size="sm"
            allowEmpty
            emptyLabel={t($ => $.walls.prefab.useDefaultMaterial)}
            onlyTypes={['prefab']}
          />
        </Label.Root>

        <Label.Root className="row-start-3 row-end-5 grid grid-rows-subgrid gap-1">
          <span className="text-sm font-medium">{t($ => $.walls.prefab.sillMaterial)}</span>
          <MaterialSelectWithEdit
            value={config.sillMaterial ?? undefined}
            onValueChange={sillMaterial => {
              onUpdate({ sillMaterial: sillMaterial ?? undefined })
            }}
            size="sm"
            allowEmpty
            emptyLabel={t($ => $.walls.prefab.useDefaultMaterial)}
            onlyTypes={['prefab']}
          />
        </Label.Root>

        <div className="row-start-3 row-end-5 grid grid-rows-subgrid gap-1">
          <div /> {/* For the grid alignment */}
          <Label.Root className="flex items-center gap-1">
            <Checkbox
              checked={config.preferEqualWidths}
              onCheckedChange={value => {
                onUpdate({ preferEqualWidths: value === true })
              }}
            />
            <span className="text-base font-medium">{t($ => $.walls.prefab.preferEqualWidth)}</span>
          </Label.Root>
        </div>

        <Label.Root className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t($ => $.walls.maxWidth)}</span>
          <LengthField
            value={config.maxWidth}
            onChange={maxWidth => {
              onUpdate({ maxWidth })
            }}
            unit="mm"
            size="sm"
          />
        </Label.Root>

        <div className="flex flex-col gap-1">
          <Label.Root>
            <span className="text-sm font-medium">{t($ => $.walls.targetWidth)}</span>
          </Label.Root>
          <LengthField
            value={config.targetWidth}
            onChange={targetWidth => {
              onUpdate({ targetWidth })
            }}
            unit="mm"
            size="sm"
          />
        </div>
      </div>

      <h2>{t($ => $.walls.prefab.tallWallReinforcement)}</h2>
      <div className="grid grid-cols-2 gap-2 gap-x-3">
        <Label.Root className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t($ => $.walls.prefab.tallReinforceThreshold)}</span>
          <LengthField
            value={config.tallReinforceThreshold}
            onChange={tallReinforceThreshold => {
              onUpdate({ tallReinforceThreshold })
            }}
            unit="mm"
            size="sm"
          />
        </Label.Root>

        <Label.Root className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t($ => $.walls.prefab.tallReinforceThickness)}</span>
          <LengthField
            value={config.tallReinforceThickness}
            onChange={tallReinforceThickness => {
              onUpdate({ tallReinforceThickness })
            }}
            unit="mm"
            size="sm"
          />
        </Label.Root>

        <Label.Root className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t($ => $.walls.prefab.tallReinforceStagger)}</span>
          <LengthField
            value={config.tallReinforceStagger}
            onChange={tallReinforceStagger => {
              onUpdate({ tallReinforceStagger })
            }}
            unit="mm"
            size="sm"
          />
        </Label.Root>

        <Label.Root className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t($ => $.walls.prefab.tallReinforceMaterial)}</span>
          <MaterialSelectWithEdit
            value={config.tallReinforceMaterial}
            onValueChange={tallReinforceMaterial => {
              onUpdate({ tallReinforceMaterial: tallReinforceMaterial ?? undefined })
            }}
            size="sm"
            preferredTypes={['sheet', 'dimensional']}
          />
        </Label.Root>
      </div>
    </div>
  )
}

interface CommonConfigSectionsProps {
  assemblyId: WallAssemblyId
  config: WallAssemblyConfig
}

function CommonConfigSections({ assemblyId, config }: CommonConfigSectionsProps): React.JSX.Element {
  const {
    updateWallAssemblyConfig,
    addWallAssemblyInsideLayer,
    setWallAssemblyInsideLayers,
    updateWallAssemblyInsideLayer,
    removeWallAssemblyInsideLayer,
    moveWallAssemblyInsideLayer,
    addWallAssemblyOutsideLayer,
    setWallAssemblyOutsideLayers,
    updateWallAssemblyOutsideLayer,
    removeWallAssemblyOutsideLayer,
    moveWallAssemblyOutsideLayer
  } = useConfigActions()

  const allAssemblies = useWallAssemblies()

  const insideLayerSources = useMemo(
    () =>
      allAssemblies.map(
        a =>
          ({
            name: a.name,
            totalThickness: a.layers.insideThickness,
            layerSource: () => a.layers.insideLayers
          }) satisfies LayerCopySource
      ),
    [allAssemblies]
  )
  const outsideLayerSources = useMemo(
    () =>
      allAssemblies.map(
        a =>
          ({
            name: a.name,
            totalThickness: a.layers.outsideThickness,
            layerSource: () => a.layers.outsideLayers
          }) satisfies LayerCopySource
      ),
    [allAssemblies]
  )

  const { t } = useTranslation('config')
  return (
    <div className="flex flex-col gap-3">
      {/* Opening Assembly Configuration */}
      <h2>{t($ => $.walls.openingsSection)}</h2>
      <div className="flex flex-col gap-1">
        <Label.Root>
          <span className="text-sm font-medium">{t($ => $.walls.openingAssembly)}</span>
        </Label.Root>
        <OpeningAssemblySelectWithEdit
          value={config.openingAssemblyId}
          onValueChange={value => {
            updateWallAssemblyConfig(assemblyId, {
              openingAssemblyId: value
            })
          }}
          allowDefault
          showDefaultIndicator
          placeholder={t($ => $.common.placeholder)}
          size="sm"
        />
      </div>
      <Separator />
      <div className="flex flex-col gap-3">
        <LayerListEditor
          title={t($ => $.walls.insideLayers)}
          measurementInfo={<MeasurementInfo highlightedPart="insideLayer" showFinishedSides />}
          layers={config.layers.insideLayers}
          onAddLayer={layer => {
            addWallAssemblyInsideLayer(assemblyId, layer)
          }}
          onReplaceLayers={layers => {
            setWallAssemblyInsideLayers(assemblyId, layers)
          }}
          onUpdateLayer={(index, updates) => {
            updateWallAssemblyInsideLayer(assemblyId, index, updates)
          }}
          onRemoveLayer={index => {
            removeWallAssemblyInsideLayer(assemblyId, index)
          }}
          onMoveLayer={(fromIndex, toIndex) => {
            moveWallAssemblyInsideLayer(assemblyId, fromIndex, toIndex)
          }}
          addLabel={t($ => $.walls.addInsideLayer)}
          emptyHint={t($ => $.walls.noInsideLayers)}
          layerPresets={WALL_LAYER_PRESETS}
          layerCopySources={insideLayerSources}
          beforeLabel={t($ => $.walls.wallConstruction)}
          afterLabel={t($ => $.walls.inside)}
        />

        <Separator />

        <LayerListEditor
          title={t($ => $.walls.outsideLayers)}
          measurementInfo={<MeasurementInfo highlightedPart="outsideLayer" showFinishedSides />}
          layers={config.layers.outsideLayers}
          onAddLayer={layer => {
            addWallAssemblyOutsideLayer(assemblyId, layer)
          }}
          onReplaceLayers={layers => {
            setWallAssemblyOutsideLayers(assemblyId, layers)
          }}
          onUpdateLayer={(index, updates) => {
            updateWallAssemblyOutsideLayer(assemblyId, index, updates)
          }}
          onRemoveLayer={index => {
            removeWallAssemblyOutsideLayer(assemblyId, index)
          }}
          onMoveLayer={(fromIndex, toIndex) => {
            moveWallAssemblyOutsideLayer(assemblyId, fromIndex, toIndex)
          }}
          addLabel={t($ => $.walls.addOutsideLayer)}
          emptyHint={t($ => $.walls.noOutsideLayers)}
          layerPresets={WALL_LAYER_PRESETS}
          layerCopySources={outsideLayerSources}
          beforeLabel={t($ => $.walls.wallConstruction)}
          afterLabel={t($ => $.walls.outside)}
        />
      </div>
    </div>
  )
}

interface ConfigFormProps {
  assembly: WallAssemblyConfig
}

function ConfigForm({ assembly }: ConfigFormProps): React.JSX.Element {
  const { formatLength } = useFormatters()
  const { updateWallAssemblyName, updateWallAssemblyConfig, getDefaultStrawMaterial } = useConfigActions()
  const { getMaterialById } = useMaterialActions()

  const { t } = useTranslation('config')
  const nameKey = assembly.nameKey

  const nameInput = useDebouncedInput(
    nameKey ? t(nameKey) : assembly.name,
    (name: string) => {
      updateWallAssemblyName(assembly.id, name)
    },
    {
      debounceMs: 1000
    }
  )

  const updateConfig = useCallback(
    (updates: Partial<WallConfig>) => {
      updateWallAssemblyConfig(assembly.id, updates)
    },
    [assembly.id, assembly, updateWallAssemblyConfig]
  )

  const totalThickness = useMemo(() => {
    const strawMaterialId =
      ('strawMaterial' in assembly
        ? assembly.strawMaterial
        : 'infill' in assembly
          ? assembly.infill.strawMaterial
          : undefined) ?? getDefaultStrawMaterial()
    const strawMaterial = getMaterialById(strawMaterialId)
    const wallConstructionThickness = strawMaterial?.type === 'strawbale' ? strawMaterial.baleWidth : undefined
    const totalLayerThickness = assembly.layers.insideThickness + assembly.layers.outsideThickness
    return wallConstructionThickness != null && assembly.type !== 'non-strawbale'
      ? formatLength(wallConstructionThickness + totalLayerThickness)
      : t($ => $.walls.unclearTotalThickness, {
          defaultValue: `? + {{layerThickness, length}} (Layers)`,
          layerThickness: totalLayerThickness
        })
  }, [assembly])

  return (
    <Card className="flex flex-col gap-3 p-3">
      {/* Basic Info - Full Width */}
      <div className="grid grid-cols-2 items-center gap-2 gap-x-3">
        <div className="grid grid-cols-[auto_1fr] items-center gap-x-2">
          <Label.Root>
            <span className="text-base font-medium">{t($ => $.common.name)}</span>
          </Label.Root>
          <TextField.Root
            value={nameInput.value}
            onChange={e => {
              nameInput.handleChange(e.target.value)
            }}
            onBlur={nameInput.handleBlur}
            onKeyDown={nameInput.handleKeyDown}
            placeholder={t($ => $.common.placeholders.name)}
          />
        </div>

        <div className="grid grid-cols-2 items-center gap-2 gap-x-3">
          <div className="flex items-center gap-2">
            <Label.Root>
              <span className="text-base font-medium">{t($ => $.common.type)}</span>
            </Label.Root>
            <div className="flex items-center gap-2">
              {React.createElement(getPerimeterConfigTypeIcon(assembly.type))}
              <span className="text-base">{t($ => $.walls.types[assembly.type])}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Label.Root>
              <span className="text-base font-medium">{t($ => $.common.totalThickness)}</span>
            </Label.Root>
            <span className="text-base">{totalThickness}</span>
          </div>
        </div>
      </div>
      <Separator />
      {/* Two Column Layout */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left Column - Type-specific configuration */}
        <div className="flex flex-col gap-3">
          {assembly.type === 'infill' && <InfillConfigForm config={assembly} onUpdate={updateConfig} />}
          {assembly.type === 'strawhenge' && <StrawhengeConfigForm config={assembly} onUpdate={updateConfig} />}
          {assembly.type === 'modules' && <ModulesConfigForm config={assembly} onUpdate={updateConfig} />}
          {assembly.type === 'non-strawbale' && <NonStrawbaleConfigForm config={assembly} onUpdate={updateConfig} />}
          {assembly.type === 'prefab-modules' && <PrefabModulesConfigForm config={assembly} onUpdate={updateConfig} />}
        </div>

        {/* Right Column - Common sections (Openings, Straw, Layers) */}
        <div className="flex flex-col gap-3">
          <CommonConfigSections assemblyId={assembly.id} config={assembly} />
        </div>
      </div>
    </Card>
  )
}

export interface WallAssemblyContentProps {
  initialSelectionId?: string
}

export function WallAssemblyContent({ initialSelectionId }: WallAssemblyContentProps): React.JSX.Element {
  const wallAssemblies = useWallAssemblies()
  const walls = usePerimeterWalls()
  const {
    addWallAssembly,
    duplicateWallAssembly,
    removeWallAssembly,
    setDefaultWallAssembly,
    resetWallAssembliesToDefaults
  } = useConfigActions()

  const defaultAssemblyId = useDefaultWallAssemblyId()

  const { t } = useTranslation('config')
  const [selectedAssemblyId, setSelectedAssemblyId] = useState<string | null>(() => {
    if (initialSelectionId && wallAssemblies.some(m => m.id === initialSelectionId)) {
      return initialSelectionId
    }
    return wallAssemblies.length > 0 ? wallAssemblies[0].id : null
  })

  const selectedAssembly = wallAssemblies.find(m => m.id === selectedAssemblyId) ?? null

  const usage = useMemo(
    () =>
      selectedAssembly
        ? getWallAssemblyUsage(selectedAssembly.id, walls, defaultAssemblyId)
        : { isUsed: false, isDefault: false, storeyIds: [] },
    [selectedAssembly, walls, defaultAssemblyId]
  )

  const handleAddNew = useCallback(
    (type: WallAssemblyType) => {
      const defaultMaterial = '' as MaterialId

      let name: string
      let config: WallConfig
      const layers = {
        insideThickness: 30,
        insideLayers: [],
        outsideThickness: 50,
        outsideLayers: []
      }

      switch (type) {
        case 'infill':
          name = t($ => $.walls.newName_infill)
          config = {
            type: 'infill',
            maxPostSpacing: 900,
            desiredPostSpacing: 800,
            minStrawSpace: 70,
            posts: {
              type: 'double',
              width: 60,
              thickness: 120,
              infillMaterial: defaultMaterial,
              material: defaultMaterial
            },
            triangularBattens: {
              size: 30,
              material: battens.id,
              inside: false,
              outside: false,
              minLength: 100
            },
            layers
          }
          break
        case 'strawhenge':
          name = t($ => $.walls.newName_strawhenge)
          config = {
            type: 'strawhenge',
            module: {
              type: 'single',
              minWidth: 920,
              maxWidth: 920,
              frameThickness: 60,
              frameMaterial: defaultMaterial,
              strawMaterial: defaultMaterial,
              triangularBattens: {
                size: 30,
                material: battens.id,
                inside: false,
                outside: false,
                minLength: 100
              }
            },
            infill: {
              maxPostSpacing: 900,
              desiredPostSpacing: 800,
              minStrawSpace: 70,
              posts: {
                type: 'full',
                width: 60,
                material: defaultMaterial
              },
              triangularBattens: {
                size: 30,
                material: battens.id,
                inside: false,
                outside: false,
                minLength: 100
              }
            },
            layers
          }
          break
        case 'modules':
          name = t($ => $.walls.newName_modules)
          config = {
            type: 'modules',
            module: {
              type: 'single',
              minWidth: 920,
              maxWidth: 920,
              frameThickness: 60,
              frameMaterial: defaultMaterial,
              strawMaterial: defaultMaterial,
              triangularBattens: {
                size: 30,
                material: battens.id,
                inside: false,
                outside: false,
                minLength: 100
              }
            },
            infill: {
              maxPostSpacing: 900,
              desiredPostSpacing: 800,
              minStrawSpace: 70,
              posts: {
                type: 'full',
                width: 60,
                material: defaultMaterial
              },
              triangularBattens: {
                size: 30,
                material: battens.id,
                inside: false,
                outside: false,
                minLength: 100
              }
            },
            layers
          }
          break
        case 'prefab-modules':
          name = t($ => $.walls.newName_prefab)
          config = {
            type: 'prefab-modules',
            defaultMaterial: ecococonStandard.id,
            fallbackMaterial: ecococonBox.id,
            inclinedMaterial: ecococonInclined.id,
            lintelMaterial: ecococonLintel.id,
            sillMaterial: ecococonSill.id,
            maxWidth: 850,
            targetWidth: 800,
            preferEqualWidths: true,
            tallReinforceThreshold: 3000,
            tallReinforceThickness: 15,
            tallReinforceStagger: 400,
            tallReinforceMaterial: lvl.id,
            openingAssemblyId: 'oa_empty_default' as OpeningAssemblyId,
            layers
          }
          break
        case 'non-strawbale':
          name = t($ => $.walls.newName_nonStrawbale)
          config = {
            type: 'non-strawbale',
            material: defaultMaterial,
            openingAssemblyId: 'oa_empty_default' as OpeningAssemblyId,
            layers
          }
          break
      }

      const newAssembly = addWallAssembly(name, config)
      setSelectedAssemblyId(newAssembly.id)
    },
    [addWallAssembly]
  )

  const handleDuplicate = useCallback(() => {
    if (!selectedAssembly) return

    const newName = t($ => $.walls.copyNameTemplate, {
      defaultValue: `{{name}} (Copy)`,
      name: selectedAssembly.name
    })
    const duplicated = duplicateWallAssembly(selectedAssembly.id, newName)
    setSelectedAssemblyId(duplicated.id)
  }, [selectedAssembly, duplicateWallAssembly])

  const handleDelete = useCallback(() => {
    if (!selectedAssembly || usage.isUsed) return

    const currentIndex = wallAssemblies.findIndex(m => m.id === selectedAssemblyId)
    removeWallAssembly(selectedAssembly.id)

    if (wallAssemblies.length > 1) {
      const nextAssembly = wallAssemblies[currentIndex + 1] ?? wallAssemblies[currentIndex - 1]
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      setSelectedAssemblyId(nextAssembly?.id ?? null)
    } else {
      setSelectedAssemblyId(null)
    }
  }, [selectedAssembly, selectedAssemblyId, wallAssemblies, removeWallAssembly, usage.isUsed])

  const handleReset = useCallback(() => {
    resetWallAssembliesToDefaults()
    // Keep selection if it still exists after reset
    const stillExists = wallAssemblies.some(a => a.id === selectedAssemblyId)
    if (!stillExists && wallAssemblies.length > 0) {
      setSelectedAssemblyId(wallAssemblies[0].id)
    }
  }, [resetWallAssembliesToDefaults, selectedAssemblyId, wallAssemblies])

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Selector + Actions */}
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-end gap-2">
            <div className="flex grow flex-col gap-1">
              <WallAssemblySelect
                value={selectedAssemblyId as WallAssemblyId | undefined}
                onValueChange={setSelectedAssemblyId}
                showDefaultIndicator
                defaultAssemblyId={defaultAssemblyId}
              />
            </div>

            <DropdownMenu>
              <DropdownMenu.Trigger asChild>
                <Button size="icon" title={t($ => $.common.addNew)}>
                  <PlusIcon />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.Item
                  onSelect={() => {
                    handleAddNew('infill')
                  }}
                >
                  <div className="flex items-center gap-1">
                    <LayersIcon />
                    {t($ => $.walls.types.infill)}
                  </div>
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={() => {
                    handleAddNew('strawhenge')
                  }}
                >
                  <div className="flex items-center gap-1">
                    <CubeIcon />
                    {t($ => $.walls.types.strawhenge)}
                  </div>
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={() => {
                    handleAddNew('modules')
                  }}
                >
                  <div className="flex items-center gap-1">
                    <CircleIcon />
                    {t($ => $.walls.types.modules)}
                  </div>
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={() => {
                    handleAddNew('non-strawbale')
                  }}
                >
                  <div className="flex items-center gap-1">
                    <TrashIcon />
                    {t($ => $.walls.types['non-strawbale'])}
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
              <AlertDialog.Trigger asChild>
                <Button
                  size="icon"
                  disabled={!selectedAssembly || usage.isUsed}
                  variant="destructive"
                  title={usage.isUsed ? t($ => $.common.inUseCannotDelete) : t($ => $.common.delete)}
                >
                  <TrashIcon />
                </Button>
              </AlertDialog.Trigger>
              <AlertDialog.Content>
                <AlertDialog.Title>{t($ => $.walls.deleteTitle)}</AlertDialog.Title>
                <AlertDialog.Description>
                  {t($ => $.walls.deleteConfirm, { name: selectedAssembly?.name })}
                </AlertDialog.Description>
                <div className="mt-4 flex justify-end gap-3">
                  <AlertDialog.Cancel asChild>
                    <Button variant="soft" className="">
                      {t($ => $.common.cancel)}
                    </Button>
                  </AlertDialog.Cancel>
                  <AlertDialog.Action asChild>
                    <Button variant="destructive" onClick={handleDelete}>
                      {t($ => $.common.delete)}
                    </Button>
                  </AlertDialog.Action>
                </div>
              </AlertDialog.Content>
            </AlertDialog.Root>

            <AlertDialog.Root>
              <AlertDialog.Trigger asChild>
                <Button
                  size="icon"
                  className="text-destructive"
                  variant="outline"
                  title={t($ => $.common.resetToDefaults)}
                >
                  <ResetIcon />
                </Button>
              </AlertDialog.Trigger>
              <AlertDialog.Content>
                <AlertDialog.Title>{t($ => $.walls.resetTitle)}</AlertDialog.Title>
                <AlertDialog.Description>{t($ => $.walls.resetConfirm)}</AlertDialog.Description>
                <div className="mt-4 flex justify-end gap-3">
                  <AlertDialog.Cancel asChild>
                    <Button variant="soft" className="">
                      {t($ => $.common.cancel)}
                    </Button>
                  </AlertDialog.Cancel>
                  <AlertDialog.Action asChild>
                    <Button variant="destructive" onClick={handleReset}>
                      {t($ => $.common.reset)}
                    </Button>
                  </AlertDialog.Action>
                </div>
              </AlertDialog.Content>
            </AlertDialog.Root>
          </div>

          <div className="grid grid-cols-[auto_1fr] items-center gap-2">
            <Label.Root>
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium">{t($ => $.walls.defaultWallAssembly)}</span>
                <MeasurementInfo highlightedAssembly="wallAssembly" />
              </div>
            </Label.Root>
            <WallAssemblySelect
              value={defaultAssemblyId}
              onValueChange={value => {
                setDefaultWallAssembly(value)
              }}
              placeholder={t($ => $.walls.selectDefault)}
            />
          </div>
        </div>
      </div>
      {/* Form */}
      {selectedAssembly && <ConfigForm assembly={selectedAssembly} />}
      {!selectedAssembly && wallAssemblies.length === 0 && (
        <div className="flex items-center justify-center p-5">
          <span className="">{t($ => $.walls.emptyList)}</span>
        </div>
      )}
      {usage.isUsed && <UsageDisplay usage={usage} />}
    </div>
  )
}

function UsageBadge({ id }: { id: EntityId }) {
  const label = useEntityLabel(id)
  return (
    <Badge key={id} variant="soft">
      {label}
    </Badge>
  )
}

function UsageDisplay({ usage }: { usage: WallAssemblyUsage }): React.JSX.Element {
  const { t } = useTranslation('config')

  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-2 gap-x-3">
      <Label.Root>
        <span className="text-base font-medium">{t($ => $.usage.usedBy)}</span>
      </Label.Root>
      <div className="flex flex-wrap gap-1">
        {usage.isDefault && (
          <Badge variant="soft" color="blue">
            {t($ => $.usage.globalDefault_wall)}
          </Badge>
        )}
        {usage.storeyIds.map(id => (
          <UsageBadge key={id} id={id} />
        ))}
      </div>
    </div>
  )
}
