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

import type { PerimeterConstructionMethodId } from '@/building/model/ids'
import { usePerimeters, useStoreysOrderedByLevel } from '@/building/store'
import {
  useConfigActions,
  useDefaultPerimeterMethodId,
  usePerimeterConstructionMethods
} from '@/construction/config/store'
import type { PerimeterConstructionConfig, WallLayersConfig } from '@/construction/config/types'
import { getPerimeterConfigUsage } from '@/construction/config/usage'
import { MaterialSelectWithEdit } from '@/construction/materials/components/MaterialSelectWithEdit'
import type { MaterialId } from '@/construction/materials/material'
import { LengthField } from '@/shared/components/LengthField'
import type { Length } from '@/shared/geometry'

import { getPerimeterConfigTypeIcon } from './Icons'
import { PerimeterMethodSelect } from './PerimeterMethodSelect'

type PerimeterConfigType = PerimeterConstructionConfig['type']

interface InfillConfigFormProps {
  config: Extract<PerimeterConstructionConfig, { type: 'infill' }>
  onUpdate: (updates: Partial<PerimeterConstructionConfig>) => void
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
  posts: Extract<PerimeterConstructionConfig, { type: 'infill' }>['posts']
  onUpdate: (posts: Extract<PerimeterConstructionConfig, { type: 'infill' }>['posts']) => void
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
                thickness: 'thickness' in posts ? posts.thickness : (120 as Length),
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
  module: Extract<PerimeterConstructionConfig, { type: 'strawhenge' | 'modules' }>['module']
  onUpdate: (module: Extract<PerimeterConstructionConfig, { type: 'strawhenge' | 'modules' }>['module']) => void
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
                frameWidth: 'frameWidth' in module ? module.frameWidth : (120 as Length)
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
      </Grid>
    </Flex>
  )
}

interface StrawhengeConfigFormProps {
  config: Extract<PerimeterConstructionConfig, { type: 'strawhenge' }>
  onUpdate: (updates: Partial<PerimeterConstructionConfig>) => void
}

function StrawhengeConfigForm({ config, onUpdate }: StrawhengeConfigFormProps): React.JSX.Element {
  return (
    <Flex direction="column" gap="3">
      <ModuleConfigSection module={config.module} onUpdate={module => onUpdate({ ...config, module })} />
      <Separator size="4" />
      <InfillConfigForm
        config={config.infill}
        onUpdate={infill =>
          onUpdate({ ...config, infill: infill as Extract<PerimeterConstructionConfig, { type: 'infill' }> })
        }
      />
    </Flex>
  )
}

interface ModulesConfigFormProps {
  config: Extract<PerimeterConstructionConfig, { type: 'modules' }>
  onUpdate: (updates: Partial<PerimeterConstructionConfig>) => void
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
  config: Extract<PerimeterConstructionConfig, { type: 'non-strawbale' }>
  onUpdate: (updates: Partial<PerimeterConstructionConfig>) => void
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
            value={config.thickness as Length}
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
  methodId: PerimeterConstructionMethodId
  config: PerimeterConstructionConfig
  layers: WallLayersConfig
}

function CommonConfigSections({ methodId, config, layers }: CommonConfigSectionsProps): React.JSX.Element {
  const { updatePerimeterConstructionMethodConfig, updatePerimeterConstructionMethodLayers } = useConfigActions()

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
              updatePerimeterConstructionMethodConfig(methodId, {
                ...config,
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
              updatePerimeterConstructionMethodConfig(methodId, {
                ...config,
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
              updatePerimeterConstructionMethodConfig(methodId, {
                ...config,
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
              updatePerimeterConstructionMethodConfig(methodId, {
                ...config,
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
              updatePerimeterConstructionMethodConfig(methodId, {
                ...config,
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
            updatePerimeterConstructionMethodConfig(methodId, {
              ...config,
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
            updatePerimeterConstructionMethodConfig(methodId, {
              ...config,
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
            updatePerimeterConstructionMethodConfig(methodId, {
              ...config,
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
            updatePerimeterConstructionMethodConfig(methodId, {
              ...config,
              straw: { ...config.straw, material }
            })
          }
          size="1"
        />
      </Grid>

      <Separator size="4" />

      {/* Layers Configuration */}
      <Heading size="2">Layers</Heading>
      <Grid columns="7em 1fr 7em 1fr" gap="2" gapX="3">
        <Label.Root>
          <Text size="1" weight="medium" color="gray">
            Inside Thickness
          </Text>
        </Label.Root>
        <LengthField
          value={layers.insideThickness}
          onChange={insideThickness =>
            updatePerimeterConstructionMethodLayers(methodId, { ...layers, insideThickness })
          }
          unit="mm"
          size="1"
        />

        <Label.Root>
          <Text size="1" weight="medium" color="gray">
            Outside Thickness
          </Text>
        </Label.Root>
        <LengthField
          value={layers.outsideThickness}
          onChange={outsideThickness =>
            updatePerimeterConstructionMethodLayers(methodId, { ...layers, outsideThickness })
          }
          unit="mm"
          size="1"
        />
      </Grid>
    </Flex>
  )
}

interface ConfigFormProps {
  method: {
    id: PerimeterConstructionMethodId
    name: string
    config: PerimeterConstructionConfig
    layers: WallLayersConfig
  }
  onUpdateName: (name: string) => void
}

function ConfigForm({ method, onUpdateName }: ConfigFormProps): React.JSX.Element {
  const { updatePerimeterConstructionMethodConfig } = useConfigActions()

  const updateConfig = useCallback(
    (updates: Partial<PerimeterConstructionConfig>) => {
      updatePerimeterConstructionMethodConfig(method.id, {
        ...method.config,
        ...updates
      } as PerimeterConstructionConfig)
    },
    [method.id, method.config, updatePerimeterConstructionMethodConfig]
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
          value={method.name}
          onChange={e => onUpdateName(e.target.value)}
          placeholder="Method name"
          size="2"
        />

        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Type
          </Text>
        </Label.Root>

        <Flex gap="2" align="center">
          {React.createElement(getPerimeterConfigTypeIcon(method.config.type))}
          <Text size="2" color="gray">
            {method.config.type === 'infill'
              ? 'Infill'
              : method.config.type === 'modules'
                ? 'Modules'
                : method.config.type === 'strawhenge'
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
          {method.config.type === 'infill' && <InfillConfigForm config={method.config} onUpdate={updateConfig} />}
          {method.config.type === 'strawhenge' && (
            <StrawhengeConfigForm config={method.config} onUpdate={updateConfig} />
          )}
          {method.config.type === 'modules' && <ModulesConfigForm config={method.config} onUpdate={updateConfig} />}
          {method.config.type === 'non-strawbale' && (
            <NonStrawbaleConfigForm config={method.config} onUpdate={updateConfig} />
          )}
        </Flex>

        {/* Right Column - Common sections (Openings, Straw, Layers) */}
        <Flex direction="column" gap="3">
          <CommonConfigSections methodId={method.id} config={method.config} layers={method.layers} />
        </Flex>
      </Grid>
    </Flex>
  )
}

export interface PerimeterConfigContentProps {
  initialSelectionId?: string
}

export function PerimeterConfigContent({ initialSelectionId }: PerimeterConfigContentProps): React.JSX.Element {
  const perimeterMethods = usePerimeterConstructionMethods()
  const perimeters = usePerimeters()
  const storeys = useStoreysOrderedByLevel()
  const {
    addPerimeterConstructionMethod,
    duplicatePerimeterConstructionMethod,
    updatePerimeterConstructionMethodName,
    removePerimeterConstructionMethod,
    setDefaultPerimeterMethod
  } = useConfigActions()

  const defaultMethodId = useDefaultPerimeterMethodId()

  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(() => {
    if (initialSelectionId && perimeterMethods.some(m => m.id === initialSelectionId)) {
      return initialSelectionId
    }
    return perimeterMethods.length > 0 ? perimeterMethods[0].id : null
  })

  const selectedMethod = perimeterMethods.find(m => m.id === selectedMethodId) ?? null

  const usage = useMemo(
    () =>
      selectedMethod
        ? getPerimeterConfigUsage(selectedMethod.id, Object.values(perimeters), storeys)
        : { isUsed: false, usedByWalls: [] },
    [selectedMethod, perimeters, storeys]
  )

  const handleAddNew = useCallback(
    (type: PerimeterConfigType) => {
      const defaultMaterial = '' as MaterialId

      let config: PerimeterConstructionConfig
      const baseStrawConfig = {
        baleLength: 800 as Length,
        baleHeight: 500 as Length,
        baleWidth: 360 as Length,
        material: defaultMaterial
      }
      const baseOpeningsConfig = {
        padding: 15 as Length,
        headerThickness: 60 as Length,
        headerMaterial: defaultMaterial,
        sillThickness: 60 as Length,
        sillMaterial: defaultMaterial
      }

      switch (type) {
        case 'infill':
          config = {
            type: 'infill',
            maxPostSpacing: 800 as Length,
            minStrawSpace: 70 as Length,
            posts: {
              type: 'double',
              width: 60 as Length,
              thickness: 120 as Length,
              infillMaterial: defaultMaterial,
              material: defaultMaterial
            },
            openings: baseOpeningsConfig,
            straw: baseStrawConfig
          }
          break
        case 'strawhenge':
          config = {
            type: 'strawhenge',
            module: {
              type: 'single',
              width: 920 as Length,
              frameThickness: 60 as Length,
              frameMaterial: defaultMaterial,
              strawMaterial: defaultMaterial
            },
            infill: {
              type: 'infill',
              maxPostSpacing: 800 as Length,
              minStrawSpace: 70 as Length,
              posts: {
                type: 'full',
                width: 60 as Length,
                material: defaultMaterial
              },
              openings: baseOpeningsConfig,
              straw: baseStrawConfig
            },
            openings: baseOpeningsConfig,
            straw: baseStrawConfig
          }
          break
        case 'modules':
          config = {
            type: 'modules',
            module: {
              type: 'single',
              width: 920 as Length,
              frameThickness: 60 as Length,
              frameMaterial: defaultMaterial,
              strawMaterial: defaultMaterial
            },
            infill: {
              type: 'infill',
              maxPostSpacing: 800 as Length,
              minStrawSpace: 70 as Length,
              posts: {
                type: 'full',
                width: 60 as Length,
                material: defaultMaterial
              },
              openings: baseOpeningsConfig,
              straw: baseStrawConfig
            },
            openings: baseOpeningsConfig,
            straw: baseStrawConfig
          }
          break
        case 'non-strawbale':
          config = {
            type: 'non-strawbale',
            material: defaultMaterial,
            thickness: 200,
            openings: baseOpeningsConfig,
            straw: baseStrawConfig
          }
          break
      }

      const layers = {
        insideThickness: 30 as Length,
        outsideThickness: 50 as Length
      }

      const newMethod = addPerimeterConstructionMethod(`New ${type} method`, config, layers)
      setSelectedMethodId(newMethod.id)
    },
    [addPerimeterConstructionMethod]
  )

  const handleDuplicate = useCallback(() => {
    if (!selectedMethod) return

    const duplicated = duplicatePerimeterConstructionMethod(selectedMethod.id, `${selectedMethod.name} (Copy)`)
    setSelectedMethodId(duplicated.id)
  }, [selectedMethod, duplicatePerimeterConstructionMethod])

  const handleDelete = useCallback(() => {
    if (!selectedMethod || usage.isUsed) return

    const currentIndex = perimeterMethods.findIndex(m => m.id === selectedMethodId)
    removePerimeterConstructionMethod(selectedMethod.id)

    if (perimeterMethods.length > 1) {
      const nextMethod = perimeterMethods[currentIndex + 1] ?? perimeterMethods[currentIndex - 1]
      setSelectedMethodId(nextMethod?.id ?? null)
    } else {
      setSelectedMethodId(null)
    }
  }, [selectedMethod, selectedMethodId, perimeterMethods, removePerimeterConstructionMethod, usage.isUsed])

  const handleUpdateName = useCallback(
    (name: string) => {
      if (!selectedMethod) return
      updatePerimeterConstructionMethodName(selectedMethod.id, name)
    },
    [selectedMethod, updatePerimeterConstructionMethodName]
  )

  return (
    <Flex direction="column" gap="4" style={{ width: '100%' }}>
      {/* Selector + Actions */}
      <Flex direction="column" gap="2">
        <Grid columns="2" gap="2">
          <Flex gap="2" align="end">
            <Flex direction="column" gap="1" flexGrow="1">
              <PerimeterMethodSelect
                value={selectedMethodId as PerimeterConstructionMethodId | undefined}
                onValueChange={setSelectedMethodId}
                showDefaultIndicator
                defaultMethodId={defaultMethodId}
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
                <AlertDialog.Title>Delete Perimeter Method</AlertDialog.Title>
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

          <Grid columns="auto 1fr" gap="2" align="center">
            <Label.Root>
              <Text size="1" weight="medium" color="gray">
                Default Perimeter Method
              </Text>
            </Label.Root>
            <PerimeterMethodSelect
              value={defaultMethodId}
              onValueChange={value => setDefaultPerimeterMethod(value)}
              placeholder="Select default..."
              size="2"
            />
          </Grid>
        </Grid>
      </Flex>

      {/* Form */}
      {selectedMethod && <ConfigForm method={selectedMethod} onUpdateName={handleUpdateName} />}

      {!selectedMethod && perimeterMethods.length === 0 && (
        <Flex justify="center" align="center" p="5">
          <Text color="gray">No perimeter methods yet. Create one using the "New" button above.</Text>
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
