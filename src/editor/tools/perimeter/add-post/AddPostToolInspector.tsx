import { CopyIcon, InfoCircledIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import { Button, Callout, DropdownMenu, IconButton, SegmentedControl, Separator, Switch } from '@radix-ui/themes'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import type { WallPostType } from '@/building/model'
import { useWallPosts } from '@/building/store'
import { useWallAssemblies } from '@/construction/config/store'
import { MaterialSelectWithEdit } from '@/construction/materials/components/MaterialSelectWithEdit'
import { type MaterialId } from '@/construction/materials/material'
import type { PostConfig } from '@/construction/materials/posts'
import { useReactiveTool } from '@/editor/tools/system/hooks/useReactiveTool'
import type { ToolInspectorProps } from '@/editor/tools/system/types'
import { LengthField } from '@/shared/components/LengthField'
import { type Length } from '@/shared/geometry'
import { assertUnreachable } from '@/shared/utils'

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

function AddPostToolInspectorImpl({ tool }: AddPostToolInspectorImplProps): React.JSX.Element {
  const { t } = useTranslation('tool')
  const { state } = useReactiveTool(tool)

  // Collect all post configurations from model and assemblies
  const allPosts = useWallPosts()
  const allWallAssemblies = useWallAssemblies()

  const allPostConfigs = useMemo(() => {
    const existingConfigs: Record<string, ExistingPostConfig> = {}

    // From model posts
    for (const post of allPosts) {
      const key = `${post.postType}:${post.width}:${post.thickness}:${post.material}:${post.infillMaterial}`
      if (!(key in existingConfigs)) {
        existingConfigs[key] = {
          type: post.postType,
          width: post.width,
          thickness: post.thickness,
          material: post.material,
          infillMaterial: post.infillMaterial
        }
      }
    }

    // From wall assembly configs
    for (const assembly of allWallAssemblies) {
      let postConfig: PostConfig | undefined

      // Extract PostConfig based on assembly type
      switch (assembly.type) {
        case 'infill':
          postConfig = assembly.posts
          break
        case 'strawhenge':
        case 'modules':
          postConfig = assembly.infill.posts
          break
        case 'non-strawbale':
          // No post config for non-strawbale walls
          break
        default:
          assertUnreachable(assembly, 'Invalid wall assembly type')
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
  }, [allPosts, allWallAssemblies])

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
    <div className="flex flex-col gap-4">
      {/* Informational Note */}
      <Callout.Root color="blue">
        <Callout.Icon>
          <InfoCircledIcon />
        </Callout.Icon>
        <Callout.Text>
          <span className="text-sm">{t($ => $.addPost.info)}</span>
        </Callout.Text>
      </Callout.Root>
      {/* Type Selection */}
      <div className="items-center justify-between gap-2">
        <span className="text-sm font-medium text-gray-900">{t($ => $.addPost.type)}</span>
        <SegmentedControl.Root value={state.type} onValueChange={handleTypeChange} size="1">
          <SegmentedControl.Item value="inside">{t($ => $.addPost.types.inside)}</SegmentedControl.Item>
          <SegmentedControl.Item value="center">{t($ => $.addPost.types.center)}</SegmentedControl.Item>
          <SegmentedControl.Item value="outside">{t($ => $.addPost.types.outside)}</SegmentedControl.Item>
          <SegmentedControl.Item value="double">{t($ => $.addPost.types.double)}</SegmentedControl.Item>
        </SegmentedControl.Root>
      </div>
      <div className="items-center justify-between gap-2">
        <span className="text-sm font-medium text-gray-900">{t($ => $.addPost.behavior)}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-900">{t($ => $.addPost.actsAsPost)}</span>
          <Switch checked={!state.replacesPosts} size="1" onCheckedChange={handleReplacesPostsChange} />
          <span className="text-sm text-gray-900">{t($ => $.addPost.flankedByPosts)}</span>
        </div>
      </div>
      {/* Dimension inputs */}
      <div className="grid grid-cols-[auto_1fr_auto_1fr] grid-rows-1 gap-2 gap-x-3 items-center">
        {/* Width Label */}
        <Label.Root htmlFor="post-width">
          <span className="text-sm font-medium text-gray-900">{t($ => $.addPost.width)}</span>
        </Label.Root>

        {/* Width Input */}
        <LengthField
          value={state.width}
          onCommit={value => {
            tool.setWidth(value)
          }}
          unit="cm"
          min={10}
          max={500}
          step={10}
          size="1"
          style={{ width: '80px' }}
        />

        {/* Thickness Label */}
        <Label.Root htmlFor="post-thickness">
          <span className="text-sm font-medium text-gray-900">{t($ => $.addPost.thickness)}</span>
        </Label.Root>

        {/* Thickness Input */}
        <LengthField
          value={state.thickness}
          onCommit={value => {
            tool.setThickness(value)
          }}
          unit="cm"
          min={50}
          max={1000}
          step={10}
          size="1"
          style={{ width: '80px' }}
        />
      </div>
      {/* Material Selection */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-900">{t($ => $.addPost.postMaterial)}</span>
        <MaterialSelectWithEdit
          value={state.material}
          onValueChange={handleMaterialChange}
          size="1"
          preferredTypes={['dimensional']}
        />
      </div>
      {/* Infill Material Selection */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-900">{t($ => $.addPost.infillMaterial)}</span>
        <MaterialSelectWithEdit value={state.infillMaterial} onValueChange={handleInfillMaterialChange} size="1" />
      </div>
      <Separator size="4" />
      {/* Quick presets */}
      <div className="flex flex-col gap-2">
        {/* Copy Existing Configuration */}
        <div className="items-center justify-between gap-2">
          <span className="text-sm font-medium text-gray-900">{t($ => $.addPost.presets.title)}</span>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger disabled={allPostConfigs.length === 0}>
              <IconButton size="2" title={t($ => $.addPost.copyConfigurationTooltip)}>
                <CopyIcon />
              </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              {allPostConfigs.map((config, index) => (
                <DropdownMenu.Item
                  key={index}
                  onClick={() => {
                    handleCopyClick(config)
                  }}
                >
                  {t($ => $.addPost.copyLabel, {
                    defaultValue: '{{type}} • {{width, length}}×{{thickness, length}}',
                    type: t($ => $.addPost.types[config.type]),
                    width: config.width,
                    thickness: config.thickness
                  })}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="1"
            variant="surface"
            onClick={() => {
              tool.setPostType('center')
              tool.setWidth(60)
              tool.setThickness(360)
            }}
          >
            {t($ => $.addPost.presets.single6x36)}
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
            {t($ => $.addPost.presets.double6x12)}
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
            {t($ => $.addPost.presets.single14x14)}
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
            {t($ => $.addPost.presets.double14x14)}
          </Button>
        </div>
      </div>
    </div>
  )
}
