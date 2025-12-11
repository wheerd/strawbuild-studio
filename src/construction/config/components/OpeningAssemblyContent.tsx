import { CopyIcon, PlusIcon, TrashIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import {
  AlertDialog,
  Badge,
  Box,
  Button,
  Callout,
  Checkbox,
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
import React, { useCallback, useId, useMemo, useState } from 'react'

import type { OpeningAssemblyId } from '@/building/model/ids'
import { usePerimeters, useStoreysOrderedByLevel } from '@/building/store'
import {
  useConfigActions,
  useDefaultOpeningAssemblyId,
  useOpeningAssemblies,
  useWallAssemblies
} from '@/construction/config/store'
import { getOpeningAssemblyUsage } from '@/construction/config/usage'
import { MaterialSelectWithEdit } from '@/construction/materials/components/MaterialSelectWithEdit'
import type { MaterialId } from '@/construction/materials/material'
import type { PostConfig } from '@/construction/materials/posts'
import type {
  OpeningAssemblyType,
  OpeningConfig,
  PostOpeningConfig,
  SimpleOpeningConfig
} from '@/construction/openings/types'
import { LengthField } from '@/shared/components/LengthField/LengthField'

import { OpeningAssemblySelect } from './OpeningAssemblySelect'

export interface OpeningAssemblyContentProps {
  initialSelectionId?: string
}

export function OpeningAssemblyContent({ initialSelectionId }: OpeningAssemblyContentProps): React.JSX.Element {
  const openingAssemblies = useOpeningAssemblies()
  const wallAssemblies = useWallAssemblies()
  const perimeters = usePerimeters()
  const storeys = useStoreysOrderedByLevel()
  const {
    addOpeningAssembly,
    updateOpeningAssemblyName,
    updateOpeningAssemblyConfig,
    removeOpeningAssembly,
    duplicateOpeningAssembly,
    setDefaultOpeningAssembly
  } = useConfigActions()

  const defaultId = useDefaultOpeningAssemblyId()

  const allAssemblies = useMemo(() => Object.values(openingAssemblies), [openingAssemblies])
  const wallAssemblyArray = useMemo(() => Object.values(wallAssemblies), [wallAssemblies])

  const [selectedAssemblyId, setSelectedAssemblyId] = useState<string | null>(() => {
    if (initialSelectionId && allAssemblies.some(m => m.id === initialSelectionId)) {
      return initialSelectionId
    }
    return allAssemblies.length > 0 ? allAssemblies[0].id : null
  })

  const selectedAssembly = allAssemblies.find(m => m.id === selectedAssemblyId) ?? null

  const usage = useMemo(
    () =>
      selectedAssembly
        ? getOpeningAssemblyUsage(
            selectedAssembly.id as OpeningAssemblyId,
            perimeters,
            Object.values(storeys),
            wallAssemblyArray,
            defaultId
          )
        : { isUsed: false, usedAsGlobalDefault: false, usedByWallAssemblies: [], usedByOpenings: [] },
    [selectedAssembly, perimeters, storeys, wallAssemblyArray, defaultId]
  )

  const handleAddNew = useCallback(
    (type: OpeningAssemblyType) => {
      const defaultMaterial = '' as MaterialId

      let config: OpeningConfig
      if (type === 'simple') {
        config = {
          type: 'simple',
          padding: 15,
          headerThickness: 60,
          headerMaterial: defaultMaterial,
          sillThickness: 60,
          sillMaterial: defaultMaterial
        }
      } else if (type === 'post') {
        config = {
          type: 'post',
          padding: 15,
          headerThickness: 60,
          headerMaterial: defaultMaterial,
          sillThickness: 60,
          sillMaterial: defaultMaterial,
          posts: {
            type: 'double',
            infillMaterial: defaultMaterial,
            material: defaultMaterial,
            thickness: 140,
            width: 100
          },
          replacePosts: true
        }
      } else {
        config = {
          type: 'empty',
          padding: 15
        }
      }

      const newAssembly = addOpeningAssembly(`New opening assembly`, config)
      setSelectedAssemblyId(newAssembly.id)
    },
    [addOpeningAssembly]
  )

  const handleDuplicate = useCallback(() => {
    if (!selectedAssembly) return

    const duplicated = duplicateOpeningAssembly(selectedAssembly.id, `${selectedAssembly.name} (Copy)`)
    setSelectedAssemblyId(duplicated.id)
  }, [selectedAssembly, duplicateOpeningAssembly])

  const handleDelete = useCallback(() => {
    if (!selectedAssembly || usage.isUsed) return

    const currentIndex = allAssemblies.findIndex(m => m.id === selectedAssemblyId)
    removeOpeningAssembly(selectedAssembly.id)

    if (allAssemblies.length > 1) {
      const nextAssembly = allAssemblies[currentIndex + 1] ?? allAssemblies[currentIndex - 1]
      setSelectedAssemblyId(nextAssembly?.id ?? null)
    } else {
      setSelectedAssemblyId(null)
    }
  }, [selectedAssembly, selectedAssemblyId, allAssemblies, removeOpeningAssembly, usage.isUsed])

  const handleUpdateName = useCallback(
    (name: string) => {
      if (!selectedAssembly) return
      updateOpeningAssemblyName(selectedAssembly.id, name)
    },
    [selectedAssembly, updateOpeningAssemblyName]
  )

  const handleUpdateConfig = useCallback(
    (updates: Partial<OpeningConfig>) => {
      if (!selectedAssembly) return
      updateOpeningAssemblyConfig(selectedAssembly.id as OpeningAssemblyId, updates)
    },
    [selectedAssembly, updateOpeningAssemblyConfig]
  )

  if (!selectedAssembly) {
    return (
      <Flex direction="column" gap="4" width="100%">
        <Flex gap="2" align="end">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <IconButton title="Add New">
                <PlusIcon />
              </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item onClick={() => handleAddNew('simple')}>Standard Opening</DropdownMenu.Item>
              <DropdownMenu.Item onClick={() => handleAddNew('post')}>Opening With Posts</DropdownMenu.Item>
              <DropdownMenu.Item onClick={() => handleAddNew('empty')}>Empty Opening</DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </Flex>

        <Callout.Root color="gray">
          <Callout.Text>No opening assemblies. Create one to get started.</Callout.Text>
        </Callout.Root>
      </Flex>
    )
  }

  const config = selectedAssembly

  return (
    <Flex direction="column" gap="4" width="100%">
      {/* Selector + Actions */}
      <Flex direction="column" gap="2">
        <Flex gap="2" align="end">
          <Flex direction="column" gap="1" flexGrow="1">
            <OpeningAssemblySelect
              value={(selectedAssemblyId as OpeningAssemblyId) || undefined}
              onValueChange={value => setSelectedAssemblyId(value || null)}
              showDefaultIndicator
              size="2"
            />
          </Flex>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <IconButton title="Add New">
                <PlusIcon />
              </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item onClick={() => handleAddNew('simple')}>Standard Opening</DropdownMenu.Item>
              <DropdownMenu.Item onClick={() => handleAddNew('post')}>Opening With Posts</DropdownMenu.Item>
              <DropdownMenu.Item onClick={() => handleAddNew('empty')}>Empty Opening</DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>

          <IconButton onClick={handleDuplicate} variant="soft" title="Duplicate">
            <CopyIcon />
          </IconButton>

          <AlertDialog.Root>
            <AlertDialog.Trigger>
              <IconButton color="red" variant="soft" disabled={usage.isUsed} title="Delete">
                <TrashIcon />
              </IconButton>
            </AlertDialog.Trigger>
            <AlertDialog.Content>
              <AlertDialog.Title>Delete Opening Assembly</AlertDialog.Title>
              <AlertDialog.Description>
                Are you sure you want to delete &quot;{selectedAssembly.name}&quot;?
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
      </Flex>

      {/* Form */}
      {selectedAssembly && (
        <Flex
          direction="column"
          gap="3"
          p="3"
          style={{ border: '1px solid var(--gray-6)', borderRadius: 'var(--radius-2)' }}
        >
          <Grid columns="1fr 1fr" gap="2" gapX="3" align="center">
            <Grid columns="auto 1fr" gapX="2" align="center">
              <Label.Root>
                <Text size="2" weight="medium" color="gray">
                  Name
                </Text>
              </Label.Root>
              <TextField.Root
                value={selectedAssembly.name}
                onChange={e => handleUpdateName(e.target.value)}
                placeholder="Opening assembly name"
                size="2"
              />
            </Grid>

            <Flex gap="2" align="center">
              <Label.Root>
                <Text size="2" weight="medium" color="gray">
                  Type
                </Text>
              </Label.Root>
              <Text size="2" color="gray">
                {config.type === 'simple'
                  ? 'Standard Opening'
                  : config.type === 'post'
                    ? 'Opening with Posts'
                    : 'Empty Opening'}
              </Text>
            </Flex>
          </Grid>

          <Separator size="4" />

          {/* Configuration Fields */}
          {config.type === 'simple' ? (
            <SimpleOpeningContent config={config} update={handleUpdateConfig} />
          ) : config.type === 'post' ? (
            <PostOpeningContent config={config} update={handleUpdateConfig} />
          ) : (
            <>
              <Heading size="2">Empty Opening</Heading>
              <Grid columns="auto 1fr" gap="2" gapX="3" align="center">
                <Label.Root>
                  <Text size="2" weight="medium" color="gray">
                    Padding
                  </Text>
                </Label.Root>
                <LengthField value={config.padding} onChange={padding => handleUpdateConfig({ padding })} unit="mm" />
              </Grid>
            </>
          )}

          <Separator size="4" />

          <Grid columns="auto 1fr" gap="2" gapX="3" align="center">
            <Label.Root>
              <Text size="2" weight="medium" color="gray">
                Default Opening Assembly
              </Text>
            </Label.Root>
            <OpeningAssemblySelect
              value={defaultId}
              onValueChange={assemblyId => {
                if (assemblyId) setDefaultOpeningAssembly(assemblyId)
              }}
              placeholder="Select default..."
              size="2"
            />
          </Grid>

          {usage.isUsed && (
            <Grid columns="auto 1fr" gap="2" gapX="3" align="center">
              <Label.Root>
                <Text size="2" weight="medium" color="gray">
                  Used By:
                </Text>
              </Label.Root>
              <Flex gap="1" wrap="wrap">
                {usage.usedAsGlobalDefault && (
                  <Badge size="2" variant="soft">
                    Global Default
                  </Badge>
                )}
                {usage.usedByWallAssemblies.map((use, index) => (
                  <Badge key={index} size="2" variant="soft">
                    {use}
                  </Badge>
                ))}
                {usage.usedByOpenings.map((use, index) => (
                  <Badge key={`opening-${index}`} size="2" variant="soft">
                    {use}
                  </Badge>
                ))}
              </Flex>
            </Grid>
          )}
        </Flex>
      )}
    </Flex>
  )
}

const SimpleOpeningContent = ({
  config,
  update
}: {
  config: SimpleOpeningConfig
  update: (updates: Partial<SimpleOpeningConfig>) => void
}) => (
  <Grid columns="auto 1fr auto 1fr" gap="2" gapX="3" align="center">
    <Label.Root>
      <Text size="2" weight="medium" color="gray">
        Padding
      </Text>
    </Label.Root>
    <LengthField value={config.padding} onChange={padding => update({ padding })} unit="mm" />

    <Label.Root>
      <Text size="2" weight="medium" color="gray">
        Header Thickness
      </Text>
    </Label.Root>
    <LengthField value={config.headerThickness} onChange={headerThickness => update({ headerThickness })} unit="mm" />

    <Label.Root>
      <Text size="2" weight="medium" color="gray">
        Header Material
      </Text>
    </Label.Root>
    <MaterialSelectWithEdit
      value={config.headerMaterial}
      onValueChange={headerMaterial => {
        if (!headerMaterial) return
        update({ headerMaterial })
      }}
      size="2"
    />

    <Label.Root>
      <Text size="2" weight="medium" color="gray">
        Sill Thickness
      </Text>
    </Label.Root>
    <LengthField value={config.sillThickness} onChange={sillThickness => update({ sillThickness })} unit="mm" />

    <Label.Root>
      <Text size="2" weight="medium" color="gray">
        Sill Material
      </Text>
    </Label.Root>
    <MaterialSelectWithEdit
      value={config.sillMaterial}
      onValueChange={sillMaterial => {
        if (!sillMaterial) return
        update({ sillMaterial })
      }}
      size="2"
    />
  </Grid>
)

const PostOpeningContent = ({
  config,
  update
}: {
  config: PostOpeningConfig
  update: (updates: Partial<PostOpeningConfig>) => void
}) => (
  <Flex direction="column" gap="3">
    <Heading size="2">Opening</Heading>
    <Grid columns="auto 1fr auto 1fr" gap="2" gapX="3" align="center">
      <Label.Root>
        <Text size="2" weight="medium" color="gray">
          Padding
        </Text>
      </Label.Root>
      <LengthField value={config.padding} onChange={padding => update({ padding })} unit="mm" />

      <Label.Root>
        <Text size="2" weight="medium" color="gray">
          Header Thickness
        </Text>
      </Label.Root>
      <LengthField value={config.headerThickness} onChange={headerThickness => update({ headerThickness })} unit="mm" />

      <Label.Root>
        <Text size="2" weight="medium" color="gray">
          Header Material
        </Text>
      </Label.Root>
      <MaterialSelectWithEdit
        value={config.headerMaterial}
        onValueChange={headerMaterial => {
          if (!headerMaterial) return
          update({ headerMaterial })
        }}
        size="2"
      />

      <Label.Root>
        <Text size="2" weight="medium" color="gray">
          Sill Thickness
        </Text>
      </Label.Root>
      <LengthField value={config.sillThickness} onChange={sillThickness => update({ sillThickness })} unit="mm" />

      <Label.Root>
        <Text size="2" weight="medium" color="gray">
          Sill Material
        </Text>
      </Label.Root>
      <MaterialSelectWithEdit
        value={config.sillMaterial}
        onValueChange={sillMaterial => {
          if (!sillMaterial) return
          update({ sillMaterial })
        }}
        size="2"
      />
    </Grid>

    <PostsConfigSection config={config} onUpdate={update} />
  </Flex>
)

function PostsConfigSection({
  config,
  onUpdate
}: {
  config: PostOpeningConfig
  onUpdate: (update: Partial<PostOpeningConfig>) => void
}): React.JSX.Element {
  const typeSelectId = useId()

  const posts = config.posts
  const updatePosts = (posts: PostConfig) => onUpdate({ posts })

  return (
    <Flex direction="column" gap="3">
      <Heading size="2">Posts</Heading>

      <Grid columns="auto 1fr auto 1fr" gap="2" gapX="3" align="center">
        <Label.Root htmlFor={typeSelectId}>
          <Text size="2" weight="medium" color="gray">
            Post Type
          </Text>
        </Label.Root>
        <Select.Root
          value={posts.type}
          onValueChange={value => {
            if (value === 'full') {
              updatePosts({
                type: 'full',
                width: posts.width,
                material: posts.material
              })
            } else {
              updatePosts({
                type: 'double',
                width: posts.width,
                thickness: 'thickness' in posts ? posts.thickness : 120,
                infillMaterial: ('infillMaterial' in posts ? posts.infillMaterial : '') as MaterialId,
                material: posts.material
              })
            }
          }}
          size="2"
        >
          <Select.Trigger id={typeSelectId} />
          <Select.Content>
            <Select.Item value="full">Full</Select.Item>
            <Select.Item value="double">Double</Select.Item>
          </Select.Content>
        </Select.Root>

        <Box gridColumn="span 2">
          <Label.Root>
            <Flex align="center" gap="1">
              <Checkbox
                checked={config.replacePosts}
                onCheckedChange={value => onUpdate({ replacePosts: value === true })}
              />
              <Text size="2" weight="medium" color="gray">
                Replaces Wall Posts
              </Text>
            </Flex>
          </Label.Root>
        </Box>

        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Width
          </Text>
        </Label.Root>
        <LengthField
          value={posts.width}
          onChange={value => updatePosts({ ...posts, width: value })}
          unit="mm"
          size="2"
        />

        {posts.type === 'double' && (
          <>
            <Label.Root>
              <Text size="2" weight="medium" color="gray">
                Thickness
              </Text>
            </Label.Root>
            <LengthField
              value={posts.thickness}
              onChange={value => updatePosts({ ...posts, thickness: value })}
              unit="mm"
              size="2"
            />
          </>
        )}

        <Label.Root>
          <Text size="2" weight="medium" color="gray">
            Material
          </Text>
        </Label.Root>
        <MaterialSelectWithEdit
          value={'material' in posts ? posts.material : undefined}
          onValueChange={material => {
            if (!material) return
            updatePosts({ ...posts, material })
          }}
          size="2"
        />

        {posts.type === 'double' && (
          <>
            <Label.Root>
              <Text size="2" weight="medium" color="gray">
                Infill Material
              </Text>
            </Label.Root>
            <MaterialSelectWithEdit
              value={posts.infillMaterial}
              onValueChange={infillMaterial => {
                if (!infillMaterial) return
                updatePosts({ ...posts, infillMaterial })
              }}
              size="2"
            />
          </>
        )}
      </Grid>
    </Flex>
  )
}
