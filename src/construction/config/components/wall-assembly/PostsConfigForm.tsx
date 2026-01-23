import * as Label from '@radix-ui/react-label'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { Select } from '@/components/ui/select'
import { MaterialSelectWithEdit } from '@/construction/materials/components/MaterialSelectWithEdit'
import type { MaterialId } from '@/construction/materials/material'
import type { PostConfig } from '@/construction/materials/posts'
import { LengthField } from '@/shared/components/LengthField/LengthField'

interface PostsConfigFormProps {
  posts: PostConfig
  onUpdate: (posts: PostConfig) => void
}

export function PostsConfigForm({ posts, onUpdate }: PostsConfigFormProps): React.JSX.Element {
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
