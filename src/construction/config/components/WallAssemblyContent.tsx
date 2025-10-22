import { CircleIcon, CopyIcon, CubeIcon, LayersIcon, PlusIcon, TrashIcon } from '@radix-ui/react-icons'
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
  TextField
} from '@radix-ui/themes'
import React, { useCallback, useMemo, useState } from 'react'

import type { WallAssemblyId } from '@/building/model/ids'
import { usePerimeters, useStoreysOrderedByLevel } from '@/building/store'
import { useConfigActions, useDefaultWallAssemblyId, useWallAssemblies } from '@/construction/config/store'
import type { WallAssemblyConfig } from '@/construction/config/types'
import { getWallAssemblyUsage } from '@/construction/config/usage'
import { MaterialSelectWithEdit } from '@/construction/materials/components/MaterialSelectWithEdit'
import type { MaterialId } from '@/construction/materials/material'
import { wood120x60, woodwool } from '@/construction/materials/material'
import type { PostConfig } from '@/construction/materials/posts'
import type {
  InfillWallSegmentConfig,
  ModulesWallConfig,
  NonStrawbaleWallConfig,
  StrawhengeWallConfig,
  WallAssemblyType,
  WallConfig
} from '@/construction/walls'
import type { ModuleConfig } from '@/construction/walls/strawhenge/modules'
import { MeasurementInfo } from '@/editor/components/MeasurementInfo'
import { LengthField } from '@/shared/components/LengthField'

import { getPerimeterConfigTypeIcon } from './Icons'
import { WallAssemblySelect } from './WallAssemblySelect'

interface InfillConfigFormProps {
  config: InfillWallSegmentConfig
  onUpdate: (updates: Partial<InfillWallSegmentConfig>) => void
}

function InfillConfigForm({ config, onUpdate }: InfillConfigFormProps): React.JSX.Element {
  return (
    <Flex direction="column" gap="3">
      <Heading size="2">Infill Configuration</Heading>

      <Grid columns="7em 1fr 7em 1fr" gap="2" gapX="3">
        <Label.Root>
          <Text size="1" weight="medium" color="gray">
            Max Post Spacing
          </Text>
        </Label.Root>
        <LengthField
          value={config.maxPostSpacing}
          onChange={value => onUpdate({ ...config, maxPostSpacing: value })}
          unit="mm"
          size="1"
        />

        <Label.Root>
          <Text size="1" weight="medium" color="gray">
            Min Straw Space
          </Text>
        </Label.Root>
        <LengthField
          value={config.minStrawSpace}
          onChange={value => onUpdate({ ...config, minStrawSpace: value })}
          unit="mm"
          size="1"
        />
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
  return (
    <Flex direction="column" gap="3">
      <Heading size="2">Posts Configuration</Heading>

      <Grid columns="5em 1fr" gap="2" gapX="3" align="center">
        <Label.Root>
          <Text size="1" weight="medium" color="gray">
            Post Type
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
            <Select.Item value="full">Full</Select.Item>
            <Select.Item value="double">Double</Select.Item>
          </Select.Content>
        </Select.Root>
      </Grid>

      <Grid columns="5em 1fr 5em 1fr" gap="2" gapX="3">
        <Label.Root>
          <Text size="1" weight="medium" color="gray">
            Width
          </Text>
        </Label.Root>
        <LengthField value={posts.width} onChange={value => onUpdate({ ...posts, width: value })} unit="mm" size="1" />

        {posts.type === 'double' && (
          <>
            <Label.Root>
              <Text size="1" weight="medium" color="gray">
                Thickness
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
            Material
          </Text>
        </Label.Root>
        <MaterialSelectWithEdit
          value={'material' in posts ? posts.material : undefined}
          onValueChange={material => onUpdate({ ...posts, material })}
          size="1"
        />

        {posts.type === 'double' && (
          <>
            <Label.Root>
              <Text size="1" weight="medium" color="gray">
                Infill Material
              </Text>
            </Label.Root>
            <MaterialSelectWithEdit
              value={posts.infillMaterial}
              onValueChange={infillMaterial => onUpdate({ ...posts, infillMaterial })}
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
  return (
    <Flex direction="column" gap="3">
      <Heading size="2">Module Configuration</Heading>

      <Grid columns="6em 1fr" gap="2" gapX="3" align="center">
        <Label.Root>
          <Text size="1" weight="medium" color="gray">
            Module Type
          </Text>
        </Label.Root>
        <Select.Root
          value={module.type}
          onValueChange={value => {
            if (value === 'single') {
              onUpdate({
                type: 'single',
                width: module.width,
                frameThickness: module.frameThickness,
                frameMaterial: module.frameMaterial,
                strawMaterial: module.strawMaterial
              })
            } else {
              onUpdate({
                type: 'double',
                width: module.width,
                frameThickness: module.frameThickness,
                frameMaterial: module.frameMaterial,
                strawMaterial: module.strawMaterial,
                frameWidth: 'frameWidth' in module ? module.frameWidth : 120,
                spacerSize: 'spacerSize' in module ? module.spacerSize : 120,
                spacerCount: 'spacerCount' in module ? module.spacerCount : 3,
                spacerMaterial: 'spacerMaterial' in module ? module.spacerMaterial : wood120x60.id,
                infillMaterial: 'infillMaterial' in module ? module.infillMaterial : woodwool.id
              })
            }
          }}
          size="1"
        >
          <Select.Trigger />
          <Select.Content>
            <Select.Item value="single">Single Frame</Select.Item>
            <Select.Item value="double">Double Frame</Select.Item>
          </Select.Content>
        </Select.Root>
      </Grid>

      <Grid columns="6em 1fr 6em 1fr" gap="2" gapX="3">
        <Label.Root>
          <Text size="1" weight="medium" color="gray">
            Width
          </Text>
        </Label.Root>
        <LengthField
          value={module.width}
          onChange={value => onUpdate({ ...module, width: value })}
          unit="mm"
          size="1"
        />

        <Label.Root>
          <Text size="1" weight="medium" color="gray">
            Frame Thickness
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
                Frame Width
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
                Spacer Size
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
                Spacer Count
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
              Frame Material
            </Text>
          </Label.Root>
          <MaterialSelectWithEdit
            value={module.frameMaterial}
            onValueChange={frameMaterial => onUpdate({ ...module, frameMaterial })}
            size="1"
          />
        </Flex>

        <Flex direction="column" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              Straw Material
            </Text>
          </Label.Root>
          <MaterialSelectWithEdit
            value={module.strawMaterial}
            onValueChange={strawMaterial => onUpdate({ ...module, strawMaterial })}
            size="1"
          />
        </Flex>

        {module.type === 'double' && (
          <>
            <Flex direction="column" gap="1">
              <Label.Root>
                <Text size="1" weight="medium" color="gray">
                  Spacer Material
                </Text>
              </Label.Root>
              <MaterialSelectWithEdit
                value={module.spacerMaterial}
                onValueChange={spacerMaterial => onUpdate({ ...module, spacerMaterial })}
                size="1"
              />
            </Flex>

            <Flex direction="column" gap="1">
              <Label.Root>
                <Text size="1" weight="medium" color="gray">
                  Infill Material
                </Text>
              </Label.Root>
              <MaterialSelectWithEdit
                value={module.infillMaterial}
                onValueChange={infillMaterial => onUpdate({ ...module, infillMaterial })}
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
  return (
    <Flex direction="column" gap="3">
      <Heading size="2">Non-Strawbale Configuration</Heading>

      <Grid columns="2" gap="2" gapX="3">
        <Flex direction="column" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              Material
            </Text>
          </Label.Root>
          <MaterialSelectWithEdit
            value={config.material}
            onValueChange={material => onUpdate({ ...config, material })}
            size="1"
          />
        </Flex>

        <Flex direction="column" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              Thickness
            </Text>
          </Label.Root>
          <LengthField
            value={config.thickness}
            onChange={value => onUpdate({ ...config, thickness: value })}
            unit="mm"
            size="1"
          />
        </Flex>
      </Grid>
    </Flex>
  )
}

interface CommonConfigSectionsProps {
  assemblyId: WallAssemblyId
  config: WallAssemblyConfig
}

function CommonConfigSections({ assemblyId, config }: CommonConfigSectionsProps): React.JSX.Element {
  const { updateWallAssemblyConfig } = useConfigActions()

  return (
    <Flex direction="column" gap="3">
      {/* Openings Configuration */}
      <Heading size="2">Openings</Heading>
      <Grid columns="2" gap="2" gapX="3">
        <Flex direction="column" gap="1" gridColumnEnd="span 2">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              Padding
            </Text>
          </Label.Root>
          <LengthField
            value={config.openings.padding}
            onChange={padding =>
              updateWallAssemblyConfig(assemblyId, {
                openings: { ...config.openings, padding }
              })
            }
            unit="mm"
            size="1"
          />
        </Flex>

        <Flex direction="column" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              Header Thickness
            </Text>
          </Label.Root>
          <LengthField
            value={config.openings.headerThickness}
            onChange={headerThickness =>
              updateWallAssemblyConfig(assemblyId, {
                openings: { ...config.openings, headerThickness }
              })
            }
            unit="mm"
            size="1"
          />
        </Flex>

        <Flex direction="column" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              Header Material
            </Text>
          </Label.Root>
          <MaterialSelectWithEdit
            value={config.openings.headerMaterial}
            onValueChange={headerMaterial =>
              updateWallAssemblyConfig(assemblyId, {
                openings: { ...config.openings, headerMaterial }
              })
            }
            size="1"
          />
        </Flex>

        <Flex direction="column" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              Sill Thickness
            </Text>
          </Label.Root>
          <LengthField
            value={config.openings.sillThickness}
            onChange={sillThickness =>
              updateWallAssemblyConfig(assemblyId, {
                openings: { ...config.openings, sillThickness }
              })
            }
            unit="mm"
            size="1"
          />
        </Flex>

        <Flex direction="column" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              Sill Material
            </Text>
          </Label.Root>
          <MaterialSelectWithEdit
            value={config.openings.sillMaterial}
            onValueChange={sillMaterial =>
              updateWallAssemblyConfig(assemblyId, {
                openings: { ...config.openings, sillMaterial }
              })
            }
            size="1"
          />
        </Flex>
      </Grid>

      <Separator size="4" />

      {/* Straw Configuration */}
      <Heading size="2">Straw</Heading>
      <Grid columns="5em 1fr 5em 1fr" gap="2" gapX="3">
        <Label.Root>
          <Text size="1" weight="medium" color="gray">
            Bale Length
          </Text>
        </Label.Root>
        <LengthField
          value={config.straw.baleLength}
          onChange={baleLength =>
            updateWallAssemblyConfig(assemblyId, {
              straw: { ...config.straw, baleLength }
            })
          }
          unit="mm"
          size="1"
        />

        <Label.Root>
          <Text size="1" weight="medium" color="gray">
            Bale Height
          </Text>
        </Label.Root>
        <LengthField
          value={config.straw.baleHeight}
          onChange={baleHeight =>
            updateWallAssemblyConfig(assemblyId, {
              straw: { ...config.straw, baleHeight }
            })
          }
          unit="mm"
          size="1"
        />

        <Label.Root>
          <Text size="1" weight="medium" color="gray">
            Bale Width
          </Text>
        </Label.Root>
        <LengthField
          value={config.straw.baleWidth}
          onChange={baleWidth =>
            updateWallAssemblyConfig(assemblyId, {
              straw: { ...config.straw, baleWidth }
            })
          }
          unit="mm"
          size="1"
        />

        <Label.Root>
          <Text size="1" weight="medium" color="gray">
            Material
          </Text>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.straw.material}
          onValueChange={material =>
            updateWallAssemblyConfig(assemblyId, {
              straw: { ...config.straw, material }
            })
          }
          size="1"
        />
      </Grid>

      <Separator size="4" />

      {/* Layers Configuration */}
      <Heading size="2">Layers</Heading>
      <Grid columns="8em 1fr 8em 1fr" gap="2" gapX="3">
        <Flex align="center" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              Inside Thickness
            </Text>
          </Label.Root>
          <MeasurementInfo highlightedPart="insideLayer" showFinishedSides />
        </Flex>
        <LengthField
          value={config.layers.insideThickness}
          onChange={insideThickness =>
            updateWallAssemblyConfig(assemblyId, { layers: { ...config.layers, insideThickness } })
          }
          unit="mm"
          size="1"
        />

        <Flex align="center" gap="1">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              Outside Thickness
            </Text>
          </Label.Root>
          <MeasurementInfo highlightedPart="outsideLayer" showFinishedSides />
        </Flex>
        <LengthField
          value={config.layers.outsideThickness}
          onChange={outsideThickness =>
            updateWallAssemblyConfig(assemblyId, { layers: { ...config.layers, outsideThickness } })
          }
          unit="mm"
          size="1"
        />
      </Grid>
    </Flex>
  )
}

interface ConfigFormProps {
  assembly: WallAssemblyConfig
  onUpdateName: (name: string) => void
}

function ConfigForm({ assembly, onUpdateName }: ConfigFormProps): React.JSX.Element {
  const { updateWallAssemblyConfig } = useConfigActions()

  const updateConfig = useCallback(
    (updates: Partial<WallConfig>) => updateWallAssemblyConfig(assembly.id, updates),
    [assembly.id, assembly, updateWallAssemblyConfig]
  )

  return (
    <Flex
      direction="column"
      gap="3"
      p="3"
      style={{ border: '1px solid var(--gray-6)', borderRadius: 'var(--radius-2)' }}
    >
      {/* Basic Info - Full Width */}
      <Grid columns="auto 1fr auto 1fr" gap="2" gapX="3" align="center">
        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Name
          </Text>
        </Label.Root>
        <TextField.Root
          value={assembly.name}
          onChange={e => onUpdateName(e.target.value)}
          placeholder="Assembly name"
          size="2"
        />

        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Type
          </Text>
        </Label.Root>

        <Flex gap="2" align="center">
          {React.createElement(getPerimeterConfigTypeIcon(assembly.type))}
          <Text size="2" color="gray">
            {assembly.type === 'infill'
              ? 'Infill'
              : assembly.type === 'modules'
                ? 'Modules'
                : assembly.type === 'strawhenge'
                  ? 'Strawhenge'
                  : 'Non-Strawbale'}
          </Text>
        </Flex>
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
  const storeys = useStoreysOrderedByLevel()
  const { addWallAssembly, duplicateWallAssembly, updateWallAssemblyName, removeWallAssembly, setDefaultWallAssembly } =
    useConfigActions()

  const defaultAssemblyId = useDefaultWallAssemblyId()

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
        ? getWallAssemblyUsage(selectedAssembly.id, Object.values(perimeters), storeys)
        : { isUsed: false, usedByWalls: [] },
    [selectedAssembly, perimeters, storeys]
  )

  const handleAddNew = useCallback(
    (type: WallAssemblyType) => {
      const defaultMaterial = '' as MaterialId

      let config: WallConfig
      const baseStrawConfig = {
        baleLength: 800,
        baleHeight: 500,
        baleWidth: 360,
        material: defaultMaterial
      }
      const baseOpeningsConfig = {
        padding: 15,
        headerThickness: 60,
        headerMaterial: defaultMaterial,
        sillThickness: 60,
        sillMaterial: defaultMaterial
      }
      const layers = {
        insideThickness: 30,
        outsideThickness: 50
      }

      switch (type) {
        case 'infill':
          config = {
            type: 'infill',
            maxPostSpacing: 800,
            minStrawSpace: 70,
            posts: {
              type: 'double',
              width: 60,
              thickness: 120,
              infillMaterial: defaultMaterial,
              material: defaultMaterial
            },
            openings: baseOpeningsConfig,
            straw: baseStrawConfig,
            layers
          }
          break
        case 'strawhenge':
          config = {
            type: 'strawhenge',
            module: {
              type: 'single',
              width: 920,
              frameThickness: 60,
              frameMaterial: defaultMaterial,
              strawMaterial: defaultMaterial
            },
            infill: {
              maxPostSpacing: 800,
              minStrawSpace: 70,
              posts: {
                type: 'full',
                width: 60,
                material: defaultMaterial
              }
            },
            openings: baseOpeningsConfig,
            straw: baseStrawConfig,
            layers
          }
          break
        case 'modules':
          config = {
            type: 'modules',
            module: {
              type: 'single',
              width: 920,
              frameThickness: 60,
              frameMaterial: defaultMaterial,
              strawMaterial: defaultMaterial
            },
            infill: {
              maxPostSpacing: 800,
              minStrawSpace: 70,
              posts: {
                type: 'full',
                width: 60,
                material: defaultMaterial
              }
            },
            openings: baseOpeningsConfig,
            straw: baseStrawConfig,
            layers
          }
          break
        case 'non-strawbale':
          config = {
            type: 'non-strawbale',
            material: defaultMaterial,
            thickness: 200,
            openings: baseOpeningsConfig,
            straw: baseStrawConfig,
            layers
          }
          break
      }

      const newAssembly = addWallAssembly(`New ${type} assembly`, config)
      setSelectedAssemblyId(newAssembly.id)
    },
    [addWallAssembly]
  )

  const handleDuplicate = useCallback(() => {
    if (!selectedAssembly) return

    const duplicated = duplicateWallAssembly(selectedAssembly.id, `${selectedAssembly.name} (Copy)`)
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

  const handleUpdateName = useCallback(
    (name: string) => {
      if (!selectedAssembly) return
      updateWallAssemblyName(selectedAssembly.id, name)
    },
    [selectedAssembly, updateWallAssemblyName]
  )

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
                <IconButton title="Add New">
                  <PlusIcon />
                </IconButton>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.Item onSelect={() => handleAddNew('infill')}>
                  <Flex align="center" gap="1">
                    <LayersIcon />
                    Infill
                  </Flex>
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => handleAddNew('strawhenge')}>
                  <Flex align="center" gap="1">
                    <CubeIcon />
                    Strawhenge
                  </Flex>
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => handleAddNew('modules')}>
                  <Flex align="center" gap="1">
                    <CircleIcon />
                    Modules
                  </Flex>
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => handleAddNew('non-strawbale')}>
                  <Flex align="center" gap="1">
                    <TrashIcon />
                    Non-Strawbale
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
                <AlertDialog.Title>Delete Wall Assembly</AlertDialog.Title>
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

          <Grid columns="auto 1fr" gap="2" align="center">
            <Label.Root>
              <Flex align="center" gap="1">
                <Text size="1" weight="medium" color="gray">
                  Default Wall Assembly
                </Text>
                <MeasurementInfo highlightedAssembly="wallAssembly" />
              </Flex>
            </Label.Root>
            <WallAssemblySelect
              value={defaultAssemblyId}
              onValueChange={value => setDefaultWallAssembly(value)}
              placeholder="Select default..."
              size="2"
            />
          </Grid>
        </Grid>
      </Flex>

      {/* Form */}
      {selectedAssembly && <ConfigForm assembly={selectedAssembly} onUpdateName={handleUpdateName} />}

      {!selectedAssembly && wallAssemblies.length === 0 && (
        <Flex justify="center" align="center" p="5">
          <Text color="gray">No wall assemblies yet. Create one using the "New" button above.</Text>
        </Flex>
      )}

      {usage.isUsed && (
        <Grid columns="auto 1fr" gap="2" gapX="3" align="center">
          <Label.Root>
            <Text size="2" weight="medium" color="gray">
              Used By:
            </Text>
          </Label.Root>
          <Flex gap="1" wrap="wrap">
            {usage.usedByWalls.map((use, index) => (
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
