import { InfoCircledIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { Separator } from '@/components/ui/separator'
import { Tooltip } from '@/components/ui/tooltip'
import { MaterialSelectWithEdit } from '@/construction/materials/components/MaterialSelectWithEdit'
import type { InfillWallSegmentConfig } from '@/construction/walls'
import { LengthField } from '@/shared/components/LengthField/LengthField'

import { PostsConfigForm } from './PostsConfigForm'
import { TriangularBattensConfigForm } from './TriangularBattensConfigForm'

interface InfillConfigFormProps {
  config: InfillWallSegmentConfig
  onUpdate: (updates: Partial<InfillWallSegmentConfig>) => void
}

export function InfillConfigForm({ config, onUpdate }: InfillConfigFormProps): React.JSX.Element {
  const { t } = useTranslation('config')
  return (
    <div className="flex flex-col gap-3">
      <h2>{t($ => $.walls.infillConfiguration)}</h2>
      <div className="grid grid-cols-2 gap-2 gap-x-3">
        <div className="flex flex-col gap-1">
          <Label.Root>
            <span className="text-sm font-medium">{t($ => $.walls.desiredPostSpacing)}</span>
          </Label.Root>
          <LengthField
            value={config.desiredPostSpacing}
            onChange={value => {
              onUpdate({ ...config, desiredPostSpacing: value })
            }}
            unit="mm"
            size="sm"
            min={config.minStrawSpace}
            max={config.maxPostSpacing}
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label.Root>
            <span className="text-sm font-medium">{t($ => $.walls.maxPostSpacing)}</span>
          </Label.Root>
          <LengthField
            value={config.maxPostSpacing}
            onChange={value => {
              onUpdate({ ...config, maxPostSpacing: value })
            }}
            unit="mm"
            size="sm"
            min={config.desiredPostSpacing}
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label.Root>
            <span className="text-sm font-medium">{t($ => $.walls.minStrawSpace)}</span>
          </Label.Root>
          <LengthField
            value={config.minStrawSpace}
            onChange={value => {
              onUpdate({ ...config, minStrawSpace: value })
            }}
            unit="mm"
            size="sm"
            min={0}
            max={config.desiredPostSpacing}
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label.Root>
            <span className="text-sm font-medium">{t($ => $.common.strawMaterialOverride)}</span>
          </Label.Root>
          <MaterialSelectWithEdit
            value={config.strawMaterial ?? null}
            allowEmpty
            emptyLabel={t($ => $.common.useGlobalStrawSettings)}
            onValueChange={strawMaterial => {
              onUpdate({ ...config, strawMaterial: strawMaterial ?? undefined })
            }}
            size="sm"
            preferredTypes={['strawbale']}
          />
        </div>

        <Label.Root>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium">{t($ => $.walls.infillMaterial)}</span>
              <Tooltip content={t($ => $.walls.infillMaterialTooltip)}>
                <InfoCircledIcon cursor="help" width={12} height={12} style={{ color: 'var(--color-gray-900)' }} />
              </Tooltip>
            </div>
            <MaterialSelectWithEdit
              value={config.infillMaterial ?? null}
              allowEmpty
              emptyLabel={t($ => $.walls.noInfillMaterial)}
              onValueChange={infillMaterial => {
                onUpdate({ ...config, infillMaterial: infillMaterial ?? undefined })
              }}
              size="sm"
            />
          </div>
        </Label.Root>
      </div>
      <Separator />
      <PostsConfigForm
        posts={config.posts}
        onUpdate={posts => {
          onUpdate({ ...config, posts })
        }}
      />
      <Separator />
      <TriangularBattensConfigForm
        triangularBattens={config.triangularBattens}
        onUpdate={triangularBattens => {
          onUpdate({ ...config, triangularBattens })
        }}
      />
    </div>
  )
}
