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
import {
  AlertDialog,
  Badge,
  Button,
  DropdownMenu,
  Flex,
  Grid,
  Heading,
  IconButton,
  Select,
  Separator,
  Text,
  TextField,
  Tooltip
} from '@radix-ui/themes'
import React, { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { OpeningAssemblyId, WallAssemblyId } from '@/building/model/ids'
import { usePerimeters } from '@/building/store'
import { OpeningAssemblySelectWithEdit } from '@/construction/config/components/OpeningAssemblySelectWithEdit'
import { type EntityId, useEntityLabel } from '@/construction/config/components/useEntityLabel'
import { useConfigActions, useDefaultWallAssemblyId, useWallAssemblies } from '@/construction/config/store'
import type { WallAssemblyConfig } from '@/construction/config/types'
import { type WallAssemblyUsage, getWallAssemblyUsage } from '@/construction/config/usage'
import { WALL_LAYER_PRESETS } from '@/construction/layers/defaults'
import { MaterialSelectWithEdit } from '@/construction/materials/components/MaterialSelectWithEdit'
import type { MaterialId } from '@/construction/materials/material'
import { roughWood, woodwool } from '@/construction/materials/material'
import type { PostConfig } from '@/construction/materials/posts'
import { useMaterialActions } from '@/construction/materials/store'
import type {
  InfillWallSegmentConfig,
  ModulesWallConfig,
  NonStrawbaleWallConfig,
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
    <Flex direction="column" gap="3">
      <Heading size="2">{t($ => $.walls.infillConfiguration)}</Heading>
      <Grid columns="1fr 1fr" gap="2" gapX="3">
        <Flex direction="column" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              {t($ => $.walls.desiredPostSpacing)}
            </Text>
          </Label.Root>
          <LengthField
            value={config.desiredPostSpacing}
            onChange={value => onUpdate({ ...config, desiredPostSpacing: value })}
            unit="mm"
            size="1"
            min={config.minStrawSpace}
            max={config.maxPostSpacing}
          />
        </Flex>

        <Flex direction="column" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              {t($ => $.walls.maxPostSpacing)}
            </Text>
          </Label.Root>
          <LengthField
            value={config.maxPostSpacing}
            onChange={value => onUpdate({ ...config, maxPostSpacing: value })}
            unit="mm"
            size="1"
            min={config.desiredPostSpacing}
          />
        </Flex>

        <Flex direction="column" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              {t($ => $.walls.minStrawSpace)}
            </Text>
          </Label.Root>
          <LengthField
            value={config.minStrawSpace}
            onChange={value => onUpdate({ ...config, minStrawSpace: value })}
            unit="mm"
            size="1"
            min={0}
            max={config.desiredPostSpacing}
          />
        </Flex>

        <Flex direction="column" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              {t($ => $.common.strawMaterialOverride)}
            </Text>
          </Label.Root>
          <MaterialSelectWithEdit
            value={config.strawMaterial ?? null}
            allowEmpty
            emptyLabel={t($ => $.common.useGlobalStrawSettings)}
            onValueChange={strawMaterial => onUpdate({ ...config, strawMaterial: strawMaterial ?? undefined })}
            size="1"
            preferredTypes={['strawbale']}
          />
        </Flex>

        <Label.Root>
          <Flex direction="column" gap="1">
            <Flex gap="1" align="center">
              <Text size="1" weight="medium" color="gray">
                {t($ => $.walls.infillMaterial)}
              </Text>
              <Tooltip content={t($ => $.walls.infillMaterialTooltip)}>
                <InfoCircledIcon cursor="help" width={12} height={12} style={{ color: 'var(--gray-9)' }} />
              </Tooltip>
            </Flex>
            <MaterialSelectWithEdit
              value={config.infillMaterial ?? null}
              allowEmpty
              emptyLabel={t($ => $.walls.noInfillMaterial)}
              onValueChange={infillMaterial => onUpdate({ ...config, infillMaterial: infillMaterial ?? undefined })}
              size="1"
            />
          </Flex>
        </Label.Root>
      </Grid>
      <Separator size="4" />
      <PostsConfigSection posts={config.posts} onUpdate={posts => onUpdate({ ...config, posts })} />
    </Flex>
  )
}

interface PostsConfigSectionProps {
  posts: PostConfig
  onUpdate: (posts: PostConfig) => void
}

function PostsConfigSection({ posts, onUpdate }: PostsConfigSectionProps): React.JSX.Element {
  const { t } = useTranslation('config')
  return (
    <Flex direction="column" gap="3">
      <Heading size="2">{t($ => $.walls.postsConfiguration)}</Heading>
      <Grid columns="5em 1fr" gap="2" gapX="3" align="center">
        <Label.Root>
          <Text size="1" weight="medium" color="gray">
            {t($ => $.walls.postType)}
          </Text>
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
          size="1"
        >
          <Select.Trigger />
          <Select.Content>
            <Select.Item value="full">{t($ => $.walls.postTypeFull)}</Select.Item>
            <Select.Item value="double">{t($ => $.walls.postTypeDouble)}</Select.Item>
          </Select.Content>
        </Select.Root>
      </Grid>
      <Grid columns="5em 1fr 5em 1fr" gap="2" gapX="3">
        <Label.Root>
          <Text size="1" weight="medium" color="gray">
            {t($ => $.common.width)}
          </Text>
        </Label.Root>
        <LengthField value={posts.width} onChange={value => onUpdate({ ...posts, width: value })} unit="mm" size="1" />

        {posts.type === 'double' && (
          <>
            <Label.Root>
              <Text size="1" weight="medium" color="gray">
                {t($ => $.common.thickness)}
              </Text>
            </Label.Root>
            <LengthField
              value={posts.thickness}
              onChange={value => onUpdate({ ...posts, thickness: value })}
              unit="mm"
              size="1"
            />
          </>
        )}
      </Grid>
      <Grid columns="5em 1fr" gap="2">
        <Label.Root>
          <Text size="1" weight="medium" color="gray">
            {t($ => $.common.materialLabel)}
          </Text>
        </Label.Root>
        <MaterialSelectWithEdit
          value={'material' in posts ? posts.material : undefined}
          onValueChange={material => {
            if (!material) return
            onUpdate({ ...posts, material })
          }}
          size="1"
          preferredTypes={['dimensional']}
        />

        {posts.type === 'double' && (
          <>
            <Label.Root>
              <Text size="1" weight="medium" color="gray">
                {t($ => $.walls.infillMaterial)}
              </Text>
            </Label.Root>
            <MaterialSelectWithEdit
              value={posts.infillMaterial}
              onValueChange={infillMaterial => {
                if (!infillMaterial) return
                onUpdate({ ...posts, infillMaterial })
              }}
              size="1"
            />
          </>
        )}
      </Grid>
    </Flex>
  )
}

interface ModuleConfigSectionProps {
  module: ModuleConfig
  onUpdate: (module: ModuleConfig) => void
}

function ModuleConfigSection({ module, onUpdate }: ModuleConfigSectionProps): React.JSX.Element {
  const { t } = useTranslation('config')
  return (
    <Flex direction="column" gap="3">
      <Heading size="2">{t($ => $.walls.moduleConfiguration)}</Heading>
      <Grid columns="6em 1fr" gap="2" gapX="3" align="center">
        <Label.Root>
          <Text size="1" weight="medium" color="gray">
            {t($ => $.walls.moduleType)}
          </Text>
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
                strawMaterial: module.strawMaterial
              })
            } else {
              onUpdate({
                type: 'double',
                minWidth: module.minWidth,
                maxWidth: module.maxWidth,
                frameThickness: module.frameThickness,
                frameMaterial: module.frameMaterial,
                strawMaterial: module.strawMaterial,
                frameWidth: 'frameWidth' in module ? module.frameWidth : 120,
                spacerSize: 'spacerSize' in module ? module.spacerSize : 120,
                spacerCount: 'spacerCount' in module ? module.spacerCount : 3,
                spacerMaterial: 'spacerMaterial' in module ? module.spacerMaterial : roughWood.id,
                infillMaterial: 'infillMaterial' in module ? module.infillMaterial : woodwool.id
              })
            }
          }}
          size="1"
        >
          <Select.Trigger />
          <Select.Content>
            <Select.Item value="single">{t($ => $.walls.moduleTypeSingle)}</Select.Item>
            <Select.Item value="double">{t($ => $.walls.moduleTypeDouble)}</Select.Item>
          </Select.Content>
        </Select.Root>
      </Grid>
      <Grid columns="6em 1fr 6em 1fr" gap="2" gapX="3">
        <Label.Root>
          <Text size="1" weight="medium" color="gray">
            {t($ => $.walls.minWidth)}
          </Text>
        </Label.Root>
        <LengthField
          value={module.minWidth}
          onChange={value => onUpdate({ ...module, minWidth: value })}
          unit="mm"
          size="1"
        />

        <Label.Root>
          <Text size="1" weight="medium" color="gray">
            {t($ => $.walls.maxWidth)}
          </Text>
        </Label.Root>
        <LengthField
          value={module.maxWidth}
          onChange={value => onUpdate({ ...module, maxWidth: value })}
          unit="mm"
          size="1"
        />

        <Label.Root>
          <Text size="1" weight="medium" color="gray">
            {t($ => $.walls.frameThickness)}
          </Text>
        </Label.Root>
        <LengthField
          value={module.frameThickness}
          onChange={value => onUpdate({ ...module, frameThickness: value })}
          unit="mm"
          size="1"
        />

        {module.type === 'double' && (
          <>
            <Label.Root>
              <Text size="1" weight="medium" color="gray">
                {t($ => $.walls.frameWidth)}
              </Text>
            </Label.Root>
            <LengthField
              value={module.frameWidth}
              onChange={value => onUpdate({ ...module, frameWidth: value })}
              unit="mm"
              size="1"
            />

            <Label.Root>
              <Text size="1" weight="medium" color="gray">
                {t($ => $.walls.spacerSize)}
              </Text>
            </Label.Root>
            <LengthField
              value={module.spacerSize}
              onChange={value => onUpdate({ ...module, spacerSize: value })}
              unit="mm"
              size="1"
            />

            <Label.Root>
              <Text size="1" weight="medium" color="gray">
                {t($ => $.walls.spacerCount)}
              </Text>
            </Label.Root>
            <TextField.Root
              type="number"
              min={2}
              value={module.spacerCount.toString()}
              onChange={event => {
                const next = Number.parseInt(event.target.value, 10)
                onUpdate({ ...module, spacerCount: Number.isFinite(next) ? Math.max(2, next) : module.spacerCount })
              }}
              size="1"
            />
          </>
        )}
      </Grid>
      <Grid columns="2" gap="2" gapX="3">
        <Flex direction="column" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              {t($ => $.walls.frameMaterial)}
            </Text>
          </Label.Root>
          <MaterialSelectWithEdit
            value={module.frameMaterial}
            onValueChange={frameMaterial => {
              if (!frameMaterial) return
              onUpdate({ ...module, frameMaterial })
            }}
            size="1"
            preferredTypes={['dimensional']}
          />
        </Flex>

        <Flex direction="column" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              {t($ => $.common.strawMaterialOverride)}
            </Text>
          </Label.Root>
          <MaterialSelectWithEdit
            value={module.strawMaterial}
            allowEmpty
            emptyLabel={t($ => $.common.useGlobalStrawSettings)}
            onValueChange={strawMaterial => onUpdate({ ...module, strawMaterial: strawMaterial ?? undefined })}
            size="1"
            preferredTypes={['strawbale']}
          />
        </Flex>

        {module.type === 'double' && (
          <>
            <Flex direction="column" gap="1">
              <Label.Root>
                <Text size="1" weight="medium" color="gray">
                  {t($ => $.walls.spacerMaterial)}
                </Text>
              </Label.Root>
              <MaterialSelectWithEdit
                value={module.spacerMaterial}
                onValueChange={spacerMaterial => {
                  if (!spacerMaterial) return
                  onUpdate({ ...module, spacerMaterial })
                }}
                size="1"
                preferredTypes={['dimensional']}
              />
            </Flex>

            <Flex direction="column" gap="1">
              <Label.Root>
                <Text size="1" weight="medium" color="gray">
                  {t($ => $.walls.infillMaterial)}
                </Text>
              </Label.Root>
              <MaterialSelectWithEdit
                value={module.infillMaterial}
                onValueChange={infillMaterial => {
                  if (!infillMaterial) return
                  onUpdate({ ...module, infillMaterial })
                }}
                size="1"
              />
            </Flex>
          </>
        )}
      </Grid>
    </Flex>
  )
}

interface StrawhengeConfigFormProps {
  config: StrawhengeWallConfig
  onUpdate: (updates: Partial<StrawhengeWallConfig>) => void
}

function StrawhengeConfigForm({ config, onUpdate }: StrawhengeConfigFormProps): React.JSX.Element {
  return (
    <Flex direction="column" gap="3">
      <ModuleConfigSection module={config.module} onUpdate={module => onUpdate({ ...config, module })} />
      <Separator size="4" />
      <InfillConfigForm
        config={config.infill}
        onUpdate={updates => onUpdate({ ...config, infill: { ...config.infill, ...updates } })}
      />
    </Flex>
  )
}

interface ModulesConfigFormProps {
  config: ModulesWallConfig
  onUpdate: (updates: Partial<ModulesWallConfig>) => void
}

function ModulesConfigForm({ config, onUpdate }: ModulesConfigFormProps): React.JSX.Element {
  return (
    <Flex direction="column" gap="3">
      <ModuleConfigSection module={config.module} onUpdate={module => onUpdate({ ...config, module })} />
      <Separator size="4" />
      <InfillConfigForm
        config={config.infill}
        onUpdate={infill => onUpdate({ ...config, infill: infill as typeof config.infill })}
      />
    </Flex>
  )
}

interface NonStrawbaleConfigFormProps {
  config: NonStrawbaleWallConfig
  onUpdate: (updates: Partial<NonStrawbaleWallConfig>) => void
}

function NonStrawbaleConfigForm({ config, onUpdate }: NonStrawbaleConfigFormProps): React.JSX.Element {
  const { t } = useTranslation('config')
  return (
    <Flex direction="column" gap="3">
      <Heading size="2">{t($ => $.walls.nonStrawbaleConfiguration)}</Heading>
      <Grid columns="auto 1fr" gap="2" gapX="3">
        <Label.Root>
          <Text size="1" weight="medium" color="gray">
            {t($ => $.common.materialLabel)}
          </Text>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.material}
          onValueChange={material => {
            if (!material) return
            onUpdate({ ...config, material })
          }}
          size="1"
          preferredTypes={['volume']}
        />
      </Grid>
    </Flex>
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
    <Flex direction="column" gap="3">
      {/* Opening Assembly Configuration */}
      <Heading size="2">{t($ => $.walls.openingsSection)}</Heading>
      <Flex direction="column" gap="1">
        <Label.Root>
          <Text size="1" weight="medium" color="gray">
            {t($ => $.walls.openingAssembly)}
          </Text>
        </Label.Root>
        <OpeningAssemblySelectWithEdit
          value={config.openingAssemblyId}
          onValueChange={value =>
            updateWallAssemblyConfig(assemblyId, {
              openingAssemblyId: value
            })
          }
          allowDefault
          showDefaultIndicator
          placeholder={t($ => $.common.placeholder)}
          size="1"
        />
      </Flex>
      <Separator size="4" />
      <Flex direction="column" gap="3">
        <LayerListEditor
          title={t($ => $.walls.insideLayers)}
          measurementInfo={<MeasurementInfo highlightedPart="insideLayer" showFinishedSides />}
          layers={config.layers.insideLayers}
          onAddLayer={layer => addWallAssemblyInsideLayer(assemblyId, layer)}
          onReplaceLayers={layers => setWallAssemblyInsideLayers(assemblyId, layers)}
          onUpdateLayer={(index, updates) => updateWallAssemblyInsideLayer(assemblyId, index, updates)}
          onRemoveLayer={index => removeWallAssemblyInsideLayer(assemblyId, index)}
          onMoveLayer={(fromIndex, toIndex) => moveWallAssemblyInsideLayer(assemblyId, fromIndex, toIndex)}
          addLabel={t($ => $.walls.addInsideLayer)}
          emptyHint={t($ => $.walls.noInsideLayers)}
          layerPresets={WALL_LAYER_PRESETS}
          layerCopySources={insideLayerSources}
          beforeLabel={t($ => $.walls.wallConstruction)}
          afterLabel={t($ => $.walls.inside)}
        />

        <Separator size="4" />

        <LayerListEditor
          title={t($ => $.walls.outsideLayers)}
          measurementInfo={<MeasurementInfo highlightedPart="outsideLayer" showFinishedSides />}
          layers={config.layers.outsideLayers}
          onAddLayer={layer => addWallAssemblyOutsideLayer(assemblyId, layer)}
          onReplaceLayers={layers => setWallAssemblyOutsideLayers(assemblyId, layers)}
          onUpdateLayer={(index, updates) => updateWallAssemblyOutsideLayer(assemblyId, index, updates)}
          onRemoveLayer={index => removeWallAssemblyOutsideLayer(assemblyId, index)}
          onMoveLayer={(fromIndex, toIndex) => moveWallAssemblyOutsideLayer(assemblyId, fromIndex, toIndex)}
          addLabel={t($ => $.walls.addOutsideLayer)}
          emptyHint={t($ => $.walls.noOutsideLayers)}
          layerPresets={WALL_LAYER_PRESETS}
          layerCopySources={outsideLayerSources}
          beforeLabel={t($ => $.walls.wallConstruction)}
          afterLabel={t($ => $.walls.outside)}
        />
      </Flex>
    </Flex>
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
    (name: string) => updateWallAssemblyName(assembly.id, name),
    {
      debounceMs: 1000
    }
  )

  const updateConfig = useCallback(
    (updates: Partial<WallConfig>) => updateWallAssemblyConfig(assembly.id, updates),
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
    <Flex
      direction="column"
      gap="3"
      p="3"
      style={{ border: '1px solid var(--gray-6)', borderRadius: 'var(--radius-2)' }}
    >
      {/* Basic Info - Full Width */}
      <Grid columns="1fr 1fr" gap="2" gapX="3" align="center">
        <Grid columns="auto 1fr" gapX="2" align="center">
          <Label.Root>
            <Text size="2" weight="medium" color="gray">
              {t($ => $.common.name)}
            </Text>
          </Label.Root>
          <TextField.Root
            value={nameInput.value}
            onChange={e => nameInput.handleChange(e.target.value)}
            onBlur={nameInput.handleBlur}
            onKeyDown={nameInput.handleKeyDown}
            placeholder={t($ => $.common.placeholders.name)}
            size="2"
          />
        </Grid>

        <Grid columns="1fr 1fr" gap="2" gapX="3" align="center">
          <Flex gap="2" align="center">
            <Label.Root>
              <Text size="2" weight="medium" color="gray">
                {t($ => $.common.type)}
              </Text>
            </Label.Root>
            <Flex gap="2" align="center">
              {React.createElement(getPerimeterConfigTypeIcon(assembly.type))}
              <Text size="2" color="gray">
                {t($ => $.walls.types[assembly.type])}
              </Text>
            </Flex>
          </Flex>

          <Flex gap="2" align="center">
            <Label.Root>
              <Text size="2" weight="medium" color="gray">
                {t($ => $.common.totalThickness)}
              </Text>
            </Label.Root>
            <Text size="2" color="gray">
              {totalThickness}
            </Text>
          </Flex>
        </Grid>
      </Grid>
      <Separator size="4" />
      {/* Two Column Layout */}
      <Grid columns="2" gap="4" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* Left Column - Type-specific configuration */}
        <Flex direction="column" gap="3">
          {assembly.type === 'infill' && <InfillConfigForm config={assembly} onUpdate={updateConfig} />}
          {assembly.type === 'strawhenge' && <StrawhengeConfigForm config={assembly} onUpdate={updateConfig} />}
          {assembly.type === 'modules' && <ModulesConfigForm config={assembly} onUpdate={updateConfig} />}
          {assembly.type === 'non-strawbale' && <NonStrawbaleConfigForm config={assembly} onUpdate={updateConfig} />}
        </Flex>

        {/* Right Column - Common sections (Openings, Straw, Layers) */}
        <Flex direction="column" gap="3">
          <CommonConfigSections assemblyId={assembly.id} config={assembly} />
        </Flex>
      </Grid>
    </Flex>
  )
}

export interface WallAssemblyContentProps {
  initialSelectionId?: string
}

export function WallAssemblyContent({ initialSelectionId }: WallAssemblyContentProps): React.JSX.Element {
  const wallAssemblies = useWallAssemblies()
  const perimeters = usePerimeters()
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
        ? getWallAssemblyUsage(selectedAssembly.id, perimeters, defaultAssemblyId)
        : { isUsed: false, isDefault: false, storeyIds: [] },
    [selectedAssembly, perimeters, defaultAssemblyId]
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
              strawMaterial: defaultMaterial
            },
            infill: {
              maxPostSpacing: 900,
              desiredPostSpacing: 800,
              minStrawSpace: 70,
              posts: {
                type: 'full',
                width: 60,
                material: defaultMaterial
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
              strawMaterial: defaultMaterial
            },
            infill: {
              maxPostSpacing: 900,
              desiredPostSpacing: 800,
              minStrawSpace: 70,
              posts: {
                type: 'full',
                width: 60,
                material: defaultMaterial
              }
            },
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
    <Flex direction="column" gap="4" style={{ width: '100%' }}>
      {/* Selector + Actions */}
      <Flex direction="column" gap="2">
        <Grid columns="2" gap="2">
          <Flex gap="2" align="end">
            <Flex direction="column" gap="1" flexGrow="1">
              <WallAssemblySelect
                value={selectedAssemblyId as WallAssemblyId | undefined}
                onValueChange={setSelectedAssemblyId}
                showDefaultIndicator
                defaultAssemblyId={defaultAssemblyId}
              />
            </Flex>

            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                <IconButton title={t($ => $.common.addNew)}>
                  <PlusIcon />
                </IconButton>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.Item onSelect={() => handleAddNew('infill')}>
                  <Flex align="center" gap="1">
                    <LayersIcon />
                    {t($ => $.walls.types.infill)}
                  </Flex>
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => handleAddNew('strawhenge')}>
                  <Flex align="center" gap="1">
                    <CubeIcon />
                    {t($ => $.walls.types.strawhenge)}
                  </Flex>
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => handleAddNew('modules')}>
                  <Flex align="center" gap="1">
                    <CircleIcon />
                    {t($ => $.walls.types.modules)}
                  </Flex>
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => handleAddNew('non-strawbale')}>
                  <Flex align="center" gap="1">
                    <TrashIcon />
                    {t($ => $.walls.types['non-strawbale'])}
                  </Flex>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>

            <IconButton
              onClick={handleDuplicate}
              disabled={!selectedAssembly}
              title={t($ => $.common.duplicate)}
              variant="soft"
            >
              <CopyIcon />
            </IconButton>

            <AlertDialog.Root>
              <AlertDialog.Trigger>
                <IconButton
                  disabled={!selectedAssembly || usage.isUsed}
                  color="red"
                  title={usage.isUsed ? t($ => $.common.inUseCannotDelete) : t($ => $.common.delete)}
                >
                  <TrashIcon />
                </IconButton>
              </AlertDialog.Trigger>
              <AlertDialog.Content>
                <AlertDialog.Title>{t($ => $.walls.deleteTitle)}</AlertDialog.Title>
                <AlertDialog.Description>
                  {t($ => $.walls.deleteConfirm, { name: selectedAssembly?.name })}
                </AlertDialog.Description>
                <Flex gap="3" mt="4" justify="end">
                  <AlertDialog.Cancel>
                    <Button variant="soft" color="gray">
                      {t($ => $.common.cancel)}
                    </Button>
                  </AlertDialog.Cancel>
                  <AlertDialog.Action>
                    <Button variant="solid" color="red" onClick={handleDelete}>
                      {t($ => $.common.delete)}
                    </Button>
                  </AlertDialog.Action>
                </Flex>
              </AlertDialog.Content>
            </AlertDialog.Root>

            <AlertDialog.Root>
              <AlertDialog.Trigger>
                <IconButton color="red" variant="outline" title={t($ => $.common.resetToDefaults)}>
                  <ResetIcon />
                </IconButton>
              </AlertDialog.Trigger>
              <AlertDialog.Content>
                <AlertDialog.Title>{t($ => $.walls.resetTitle)}</AlertDialog.Title>
                <AlertDialog.Description>{t($ => $.walls.resetConfirm)}</AlertDialog.Description>
                <Flex gap="3" mt="4" justify="end">
                  <AlertDialog.Cancel>
                    <Button variant="soft" color="gray">
                      {t($ => $.common.cancel)}
                    </Button>
                  </AlertDialog.Cancel>
                  <AlertDialog.Action>
                    <Button variant="solid" color="red" onClick={handleReset}>
                      {t($ => $.common.reset)}
                    </Button>
                  </AlertDialog.Action>
                </Flex>
              </AlertDialog.Content>
            </AlertDialog.Root>
          </Flex>

          <Grid columns="auto 1fr" gap="2" align="center">
            <Label.Root>
              <Flex align="center" gap="1">
                <Text size="1" weight="medium" color="gray">
                  {t($ => $.walls.defaultWallAssembly)}
                </Text>
                <MeasurementInfo highlightedAssembly="wallAssembly" />
              </Flex>
            </Label.Root>
            <WallAssemblySelect
              value={defaultAssemblyId}
              onValueChange={value => setDefaultWallAssembly(value)}
              placeholder={t($ => $.walls.selectDefault)}
              size="2"
            />
          </Grid>
        </Grid>
      </Flex>
      {/* Form */}
      {selectedAssembly && <ConfigForm assembly={selectedAssembly} />}
      {!selectedAssembly && wallAssemblies.length === 0 && (
        <Flex justify="center" align="center" p="5">
          <Text color="gray">{t($ => $.walls.emptyList)}</Text>
        </Flex>
      )}
      {usage.isUsed && <UsageDisplay usage={usage} />}
    </Flex>
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

function UsageDisplay({ usage }: { usage: WallAssemblyUsage }): React.JSX.Element {
  const { t } = useTranslation('config')

  return (
    <Grid columns="auto 1fr" gap="2" gapX="3" align="center">
      <Label.Root>
        <Text size="2" weight="medium" color="gray">
          {t($ => $.usage.usedBy)}
        </Text>
      </Label.Root>
      <Flex gap="1" wrap="wrap">
        {usage.isDefault && (
          <Badge size="2" variant="soft" color="blue">
            {t($ => $.usage.globalDefault_wall)}
          </Badge>
        )}
        {usage.storeyIds.map(id => (
          <UsageBadge key={id} id={id} />
        ))}
      </Flex>
    </Grid>
  )
}
