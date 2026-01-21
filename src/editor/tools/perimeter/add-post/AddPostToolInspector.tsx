import { CopyIcon, InfoCircledIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import type { WallPostType } from '@/building/model'
import { useWallPosts } from '@/building/store'
import { Button } from '@/components/ui/button'
import { Callout, CalloutIcon, CalloutText } from '@/components/ui/callout'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
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
        case 'prefab-modules':
        case 'non-strawbale':
          // No post config for these wall types
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
    (newType: string) => {
      if (newType) {
        tool.setPostType(newType as WallPostType)
      }
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
      <Callout color="blue">
        <CalloutIcon>
          <InfoCircledIcon />
        </CalloutIcon>
        <CalloutText>
          <span className="text-sm">{t($ => $.addPost.info)}</span>
        </CalloutText>
      </Callout>
      {/* Type Selection */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{t($ => $.addPost.type)}</span>
        <ToggleGroup type="single" variant="outline" value={state.type} onValueChange={handleTypeChange} size="sm">
          <ToggleGroupItem value="inside">{t($ => $.addPost.types.inside)}</ToggleGroupItem>
          <ToggleGroupItem value="center">{t($ => $.addPost.types.center)}</ToggleGroupItem>
          <ToggleGroupItem value="outside">{t($ => $.addPost.types.outside)}</ToggleGroupItem>
          <ToggleGroupItem value="double">{t($ => $.addPost.types.double)}</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{t($ => $.addPost.behavior)}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm">{t($ => $.addPost.actsAsPost)}</span>
          <Switch checked={!state.replacesPosts} size="sm" onCheckedChange={handleReplacesPostsChange} />
          <span className="text-sm">{t($ => $.addPost.flankedByPosts)}</span>
        </div>
      </div>
      {/* Dimension inputs */}
      <div className="grid grid-cols-[auto_1fr_auto_1fr] grid-rows-1 items-center gap-2 gap-x-3">
        {/* Width Label */}
        <Label.Root htmlFor="post-width">
          <span className="text-sm font-medium">{t($ => $.addPost.width)}</span>
        </Label.Root>

        {/* Width Input */}
        <LengthField
          value={state.width}
          onCommit={value => {
            tool.setWidth(value)
          }}
          unit="cm"
          min={1}
          step={10}
          size="sm"
          className="w-20"
        />

        {/* Thickness Label */}
        <Label.Root htmlFor="post-thickness">
          <span className="text-sm font-medium">{t($ => $.addPost.thickness)}</span>
        </Label.Root>

        {/* Thickness Input */}
        <LengthField
          value={state.thickness}
          onCommit={value => {
            tool.setThickness(value)
          }}
          unit="cm"
          min={1}
          step={10}
          size="sm"
          className="w-20"
        />
      </div>
      {/* Material Selection */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">{t($ => $.addPost.postMaterial)}</span>
        <MaterialSelectWithEdit
          value={state.material}
          onValueChange={handleMaterialChange}
          size="sm"
          preferredTypes={['dimensional']}
        />
      </div>
      {/* Infill Material Selection */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">{t($ => $.addPost.infillMaterial)}</span>
        <MaterialSelectWithEdit value={state.infillMaterial} onValueChange={handleInfillMaterialChange} size="sm" />
      </div>
      <Separator />
      {/* Quick presets */}
      <div className="flex flex-col gap-2">
        {/* Copy Existing Configuration */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">{t($ => $.addPost.presets.title)}</span>
          <DropdownMenu>
            <DropdownMenuTrigger disabled={allPostConfigs.length === 0} asChild>
              <Button size="icon" title={t($ => $.addPost.copyConfigurationTooltip)}>
                <CopyIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {allPostConfigs.map((config, index) => (
                <DropdownMenuItem
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
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="soft"
            onClick={() => {
              tool.setPostType('center')
              tool.setWidth(60)
              tool.setThickness(360)
            }}
          >
            {t($ => $.addPost.presets.single6x36)}
          </Button>
          <Button
            size="sm"
            variant="soft"
            onClick={() => {
              tool.setPostType('double')
              tool.setWidth(60)
              tool.setThickness(120)
            }}
          >
            {t($ => $.addPost.presets.double6x12)}
          </Button>
          <Button
            size="sm"
            variant="soft"
            onClick={() => {
              tool.setPostType('outside')
              tool.setWidth(140)
              tool.setThickness(140)
            }}
          >
            {t($ => $.addPost.presets.single14x14)}
          </Button>
          <Button
            size="sm"
            variant="soft"
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
