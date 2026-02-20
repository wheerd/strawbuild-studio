import * as Label from '@radix-ui/react-label'
import { useTranslation } from 'react-i18next'

import { Checkbox } from '@/components/ui/checkbox'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { MaterialSelectWithEdit } from '@/construction/materials/components/MaterialSelectWithEdit'
import type { MaterialId } from '@/construction/materials/material'
import type { PostOpeningConfig } from '@/construction/openings/types'
import { LengthField } from '@/shared/components/LengthField/LengthField'

interface PostOpeningConfigFormProps {
  config: PostOpeningConfig
  update: (updates: Partial<PostOpeningConfig>) => void
}

export function PostOpeningConfigForm({ config, update }: PostOpeningConfigFormProps) {
  const { t } = useTranslation('config')
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{t($ => $.openings.sections.opening)}</h2>
      <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2 gap-x-3">
        <Label.Root>
          <span className="text-base font-medium">{t($ => $.openings.labels.padding)}</span>
        </Label.Root>
        <LengthField
          value={config.padding}
          onChange={padding => {
            update({ padding })
          }}
          unit="mm"
        />

        <Label.Root>
          <span className="text-base font-medium">{t($ => $.openings.labels.headerThickness)}</span>
        </Label.Root>
        <LengthField
          value={config.headerThickness}
          onChange={headerThickness => {
            update({ headerThickness })
          }}
          unit="mm"
        />

        <Label.Root>
          <span className="text-base font-medium">{t($ => $.openings.labels.headerMaterial)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.headerMaterial}
          onValueChange={headerMaterial => {
            if (!headerMaterial) return
            update({ headerMaterial })
          }}
          preferredTypes={['dimensional']}
        />

        <Label.Root>
          <span className="text-base font-medium">{t($ => $.openings.labels.sillThickness)}</span>
        </Label.Root>
        <LengthField
          value={config.sillThickness}
          onChange={sillThickness => {
            update({ sillThickness })
          }}
          unit="mm"
        />

        <Label.Root>
          <span className="text-base font-medium">{t($ => $.openings.labels.sillMaterial)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={config.sillMaterial}
          onValueChange={sillMaterial => {
            if (!sillMaterial) return
            update({ sillMaterial })
          }}
          preferredTypes={['dimensional']}
        />
      </div>

      <PostsOpeningConfigForm config={config} onUpdate={update} />
    </div>
  )
}

function PostsOpeningConfigForm({
  config,
  onUpdate
}: {
  config: PostOpeningConfig
  onUpdate: (update: Partial<PostOpeningConfig>) => void
}): React.JSX.Element {
  const { t } = useTranslation('config')
  const posts = config.posts
  const updatePosts = (posts: typeof config.posts) => {
    onUpdate({ posts })
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{t($ => $.openings.sections.posts)}</h2>

      <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2 gap-x-3">
        <Label.Root>
          <span className="text-base font-medium">{t($ => $.common.type)}</span>
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
                infillMaterial: 'infillMaterial' in posts ? posts.infillMaterial : ('' as MaterialId),
                material: posts.material
              })
            }
          }}
        >
          <Select.Trigger>
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="full">{t($ => $.openings.postTypes.full)}</Select.Item>
            <Select.Item value="double">{t($ => $.openings.postTypes.double)}</Select.Item>
          </Select.Content>
        </Select.Root>

        <div className="col-span-2">
          <Label.Root>
            <div className="flex items-center gap-1">
              <Checkbox
                checked={config.replacePosts}
                onCheckedChange={value => {
                  onUpdate({ replacePosts: value === true })
                }}
              />
              <span className="text-base font-medium">{t($ => $.openings.labels.replacesWallPosts)}</span>
            </div>
          </Label.Root>
        </div>

        <Label.Root>
          <span className="text-base font-medium">{t($ => $.common.width)}</span>
        </Label.Root>
        <LengthField
          value={posts.width}
          onChange={value => {
            updatePosts({ ...posts, width: value })
          }}
          unit="mm"
        />

        {posts.type === 'double' && (
          <>
            <Label.Root>
              <span className="text-base font-medium">{t($ => $.common.thickness)}</span>
            </Label.Root>
            <LengthField
              value={posts.thickness}
              onChange={value => {
                updatePosts({ ...posts, thickness: value })
              }}
              unit="mm"
            />
          </>
        )}

        <Label.Root>
          <span className="text-base font-medium">{t($ => $.common.materialLabel)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={'material' in posts ? posts.material : undefined}
          onValueChange={material => {
            if (!material) return
            updatePosts({ ...posts, material })
          }}
          preferredTypes={['dimensional']}
        />

        {posts.type === 'double' && (
          <>
            <Label.Root>
              <span className="text-base font-medium">{t($ => $.common.materialLabel)}</span>
            </Label.Root>
            <MaterialSelectWithEdit
              value={posts.infillMaterial}
              onValueChange={infillMaterial => {
                if (!infillMaterial) return
                updatePosts({ ...posts, infillMaterial })
              }}
            />
          </>
        )}

        <div className="col-span-2">
          <Label.Root>
            <div className="flex items-center gap-2">
              <span className="text-base font-medium">{t($ => $.openings.labels.postsHaveFullHeight)}</span>
              <Switch
                checked={config.postsSupportHeader ?? false}
                onCheckedChange={value => {
                  onUpdate({ postsSupportHeader: value })
                }}
              />
              <span className="text-base font-medium">{t($ => $.openings.labels.postsSupportHeader)}</span>
            </div>
          </Label.Root>
        </div>
      </div>
    </div>
  )
}
