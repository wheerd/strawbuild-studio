import * as Label from '@radix-ui/react-label'
import { useTranslation } from 'react-i18next'

import { MaterialSelectWithEdit } from '@/construction/materials/components/MaterialSelectWithEdit'
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
      </div>
    </div>
  )
}
