import { CopyIcon, InfoCircledIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import {
  Button,
  Callout,
  DropdownMenu,
  Flex,
  Grid,
  IconButton,
  SegmentedControl,
  Separator,
  Switch,
  Text
} from '@radix-ui/themes'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import type { WallPostType } from '@/building/model/model'
import { usePerimeters } from '@/building/store'
import { useWallAssemblies } from '@/construction/config/store'
import { MaterialSelectWithEdit } from '@/construction/materials/components/MaterialSelectWithEdit'
import { type MaterialId } from '@/construction/materials/material'
import type { PostConfig } from '@/construction/materials/posts'
import { useReactiveTool } from '@/editor/tools/system/hooks/useReactiveTool'
import type { ToolInspectorProps } from '@/editor/tools/system/types'
import { LengthField } from '@/shared/components/LengthField'
import { type Length } from '@/shared/geometry'
import { useFormatters } from '@/shared/i18n/useFormatters'

import type { AddPostTool } from './AddPostTool'

export function AddPostToolInspector({ tool }: ToolInspectorProps<AddPostTool>): React.JSX.Element {
  return <AddPostToolInspectorImpl tool={tool} />
}

interface AddPostToolInspectorImplProps {
  tool: AddPostTool
}

interface ExistingPostConfig {
  type: WallPostType
  width: Length
  thickness: Length
  material: MaterialId
  infillMaterial?: MaterialId
}

const POST_TYPE_LABELS: Record<WallPostType, string> = {
  center: 'Center',
  double: 'Double',
  inside: 'Inside',
  outside: 'Outside'
}

function AddPostToolInspectorImpl({ tool }: AddPostToolInspectorImplProps): React.JSX.Element {
  const { t } = useTranslation('tool')
  const { formatLength } = useFormatters()
  const { state } = useReactiveTool(tool)

  // Collect all post configurations from model and assemblies
  const allPerimeters = usePerimeters()
  const allWallAssemblies = useWallAssemblies()

  const allPostConfigs = useMemo(() => {
    const existingConfigs: Record<string, ExistingPostConfig> = {}

    // From model posts
    for (const perimeter of allPerimeters) {
      for (const wall of perimeter.walls) {
        for (const post of wall.posts) {
          const key = `${post.type}:${post.width}:${post.thickness}:${post.material}:${post.infillMaterial}`
          if (!(key in existingConfigs)) {
            existingConfigs[key] = {
              type: post.type,
              width: post.width,
              thickness: post.thickness,
              material: post.material,
              infillMaterial: post.infillMaterial
            }
          }
        }
      }
    }

    // From wall assembly configs
    for (const assembly of allWallAssemblies) {
      let postConfig: PostConfig | undefined

      // Extract PostConfig based on assembly type
      if (assembly.type === 'infill') {
        postConfig = assembly.posts
      } else if (assembly.type === 'strawhenge' || assembly.type === 'modules') {
        postConfig = assembly.infill.posts
      }

      if (!postConfig) continue

      // Map PostConfig to WallPost-compatible format
      const mappedType: WallPostType = postConfig.type === 'full' ? 'center' : 'double'
      const thickness = postConfig.type === 'double' ? postConfig.thickness : 360 // Default 36cm for 'full' posts
      const infillMaterial = postConfig.type === 'double' ? postConfig.infillMaterial : undefined

      const key = `${mappedType}:${postConfig.width}:${thickness}:${postConfig.material}:${infillMaterial}`

      if (!(key in existingConfigs)) {
        existingConfigs[key] = {
          type: mappedType,
          width: postConfig.width,
          thickness,
          material: postConfig.material,
          infillMaterial
        }
      }
    }

    return Object.values(existingConfigs)
  }, [allPerimeters, allWallAssemblies])

  // Event handlers
  const handleTypeChange = useCallback(
    (newType: WallPostType) => {
      tool.setPostType(newType)
    },
    [tool]
  )

  const handleReplacesPostsChange = useCallback(
    (flankedByPosts: boolean) => {
      tool.setReplacesPosts(!flankedByPosts)
    },
    [tool]
  )

  const handleMaterialChange = useCallback(
    (materialId: MaterialId | null) => {
      if (materialId) {
        tool.setMaterial(materialId)
      }
    },
    [tool]
  )

  const handleInfillMaterialChange = useCallback(
    (materialId: MaterialId | null) => {
      if (materialId) {
        tool.setInfillMaterial(materialId)
      }
    },
    [tool]
  )

  const handleCopyClick = useCallback(
    (config: ExistingPostConfig) => {
      tool.setPostType(config.type)
      tool.setWidth(config.width)
      tool.setThickness(config.thickness)
      tool.setMaterial(config.material)
      if (config.infillMaterial) tool.setInfillMaterial(config.infillMaterial)
    },
    [tool]
  )

  return (
    <Flex direction="column" gap="4">
      {/* Informational Note */}
      <Callout.Root color="blue">
        <Callout.Icon>
          <InfoCircledIcon />
        </Callout.Icon>
        <Callout.Text>
          <Text size="1">{t($ => $.addPost.info)}</Text>
        </Callout.Text>
      </Callout.Root>
      {/* Type Selection */}
      <Flex align="center" justify="between" gap="2">
        <Text size="1" weight="medium" color="gray">
          {t($ => $.addPost.type)}
        </Text>
        <SegmentedControl.Root value={state.type} onValueChange={handleTypeChange} size="1">
          <SegmentedControl.Item value="inside">{t($ => $.addPost.typeInside)}</SegmentedControl.Item>
          <SegmentedControl.Item value="center">{t($ => $.addPost.typeCenter)}</SegmentedControl.Item>
          <SegmentedControl.Item value="outside">{t($ => $.addPost.typeOutside)}</SegmentedControl.Item>
          <SegmentedControl.Item value="double">{t($ => $.addPost.typeDouble)}</SegmentedControl.Item>
        </SegmentedControl.Root>
      </Flex>
      <Flex align="center" justify="between" gap="2">
        <Text size="1" weight="medium" color="gray">
          {t($ => $.addPost.behavior)}
        </Text>
        <Flex align="center" gap="2">
          <Text size="1" color="gray">
            {t($ => $.addPost.actsAsPost)}
          </Text>
          <Switch checked={!state.replacesPosts} size="1" onCheckedChange={handleReplacesPostsChange} />
          <Text size="1" color="gray">
            {t($ => $.addPost.flankedByPosts)}
          </Text>
        </Flex>
      </Flex>
      {/* Dimension inputs */}
      <Grid columns="auto 1fr auto 1fr" rows="1" gap="2" gapX="3" align="center">
        {/* Width Label */}
        <Label.Root htmlFor="post-width">
          <Text size="1" weight="medium" color="gray">
            {t($ => $.addPost.width)}
          </Text>
        </Label.Root>

        {/* Width Input */}
        <LengthField
          value={state.width}
          onCommit={value => tool.setWidth(value)}
          unit="cm"
          min={10}
          max={500}
          step={10}
          size="1"
          style={{ width: '80px' }}
        />

        {/* Thickness Label */}
        <Label.Root htmlFor="post-thickness">
          <Text size="1" weight="medium" color="gray">
            {t($ => $.addPost.thickness)}
          </Text>
        </Label.Root>

        {/* Thickness Input */}
        <LengthField
          value={state.thickness}
          onCommit={value => tool.setThickness(value)}
          unit="cm"
          min={50}
          max={1000}
          step={10}
          size="1"
          style={{ width: '80px' }}
        />
      </Grid>
      {/* Material Selection */}
      <Flex direction="column" gap="2">
        <Text size="1" weight="medium" color="gray">
          {t($ => $.addPost.postMaterial)}
        </Text>
        <MaterialSelectWithEdit
          value={state.material}
          onValueChange={handleMaterialChange}
          size="1"
          preferredTypes={['dimensional']}
        />
      </Flex>
      {/* Infill Material Selection */}
      <Flex direction="column" gap="2">
        <Text size="1" weight="medium" color="gray">
          {t($ => $.addPost.infillMaterial)}
        </Text>
        <MaterialSelectWithEdit value={state.infillMaterial} onValueChange={handleInfillMaterialChange} size="1" />
      </Flex>
      <Separator size="4" />
      {/* Quick presets */}
      <Flex direction="column" gap="2">
        {/* Copy Existing Configuration */}
        <Flex align="center" justify="between" gap="2">
          <Text size="1" weight="medium" color="gray">
            {t($ => $.addPost.presets)}
          </Text>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger disabled={allPostConfigs.length === 0}>
              <IconButton size="2" title={t($ => $.addPost.copyConfigurationTooltip)}>
                <CopyIcon />
              </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              {allPostConfigs.map((config, index) => (
                <DropdownMenu.Item key={index} onClick={() => handleCopyClick(config)}>
                  <Text>
                    {POST_TYPE_LABELS[config.type]} • {formatLength(config.width)}×{formatLength(config.thickness)}
                  </Text>
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </Flex>
        <Grid columns="2" gap="2">
          <Button
            size="1"
            variant="surface"
            onClick={() => {
              tool.setPostType('center')
              tool.setWidth(60)
              tool.setThickness(360)
            }}
          >
            6×36cm Single
          </Button>
          <Button
            size="1"
            variant="surface"
            onClick={() => {
              tool.setPostType('double')
              tool.setWidth(60)
              tool.setThickness(120)
            }}
          >
            6×12cm Double
          </Button>
          <Button
            size="1"
            variant="surface"
            onClick={() => {
              tool.setPostType('outside')
              tool.setWidth(140)
              tool.setThickness(140)
            }}
          >
            14×14cm Single
          </Button>
          <Button
            size="1"
            variant="surface"
            onClick={() => {
              tool.setPostType('double')
              tool.setWidth(140)
              tool.setThickness(140)
            }}
          >
            14×14cm Double
          </Button>
        </Grid>
      </Flex>
    </Flex>
  )
}
