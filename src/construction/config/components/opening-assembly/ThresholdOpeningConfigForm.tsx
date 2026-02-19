import * as Label from '@radix-ui/react-label'
import { Plus, Trash } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { OpeningAssemblyId } from '@/building/model/ids'
import { Button } from '@/components/ui/button'
import { OpeningAssemblySelectWithEdit } from '@/construction/config/components/OpeningAssemblySelectWithEdit'
import type { ThresholdAssemblyConfig, ThresholdConfig } from '@/construction/openings/types'
import { LengthField } from '@/shared/components/LengthField/LengthField'

interface ThresholdOpeningConfigFormProps {
  config: ThresholdAssemblyConfig
  update: (updates: Partial<ThresholdAssemblyConfig>) => void
}

export function ThresholdOpeningConfigForm({ config, update }: ThresholdOpeningConfigFormProps) {
  const { t } = useTranslation('config')

  const handleAddThreshold = () => {
    const newThresholds = [...config.thresholds, { assemblyId: '' as OpeningAssemblyId, widthThreshold: 1000 }]
    update({ thresholds: newThresholds })
  }

  const handleRemoveThreshold = (index: number) => {
    const newThresholds = config.thresholds.filter((_, i) => i !== index)
    update({ thresholds: newThresholds })
  }

  const handleUpdateThreshold = (index: number, field: keyof ThresholdConfig, value: OpeningAssemblyId | number) => {
    const newThresholds = [...config.thresholds]
    newThresholds[index] = { ...newThresholds[index], [field]: value }
    update({ thresholds: newThresholds })
  }

  const sortedThresholds = [...config.thresholds].sort((a, b) => a.widthThreshold - b.widthThreshold)

  const currentAssemblyId = (config as unknown as { id: OpeningAssemblyId }).id
  const excludeIds = [currentAssemblyId]

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 items-center gap-2 gap-x-3">
        <Label.Root className="flex flex-row items-center gap-2">
          <span className="text-base font-medium">{t($ => $.openings.labels.padding)}</span>
          <LengthField
            value={config.padding}
            onChange={padding => {
              update({ padding })
            }}
            unit="mm"
            className="grow"
          />
        </Label.Root>

        <Label.Root className="flex flex-row items-center gap-2">
          <span className="text-base font-medium">{t($ => $.openings.labels.defaultAssembly)}</span>
          <div className="grow">
            <OpeningAssemblySelectWithEdit
              value={config.defaultId}
              onValueChange={value => {
                if (value) {
                  update({ defaultId: value })
                }
              }}
              exclude={excludeIds}
            />
          </div>
        </Label.Root>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t($ => $.openings.labels.thresholds)}</h2>

        {sortedThresholds.length === 0 && (
          <p className="text-muted-foreground">{t($ => $.openings.labels.noThresholds)}</p>
        )}

        {sortedThresholds.map((threshold, sortedIndex) => {
          const originalIndex = config.thresholds.findIndex(t => t.widthThreshold === threshold.widthThreshold)
          return (
            <div key={sortedIndex} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
              <Label.Root>
                <span className="text-sm font-medium">{t($ => $.openings.labels.widthThreshold)}</span>
                <LengthField
                  value={threshold.widthThreshold}
                  onChange={widthThreshold => {
                    handleUpdateThreshold(originalIndex, 'widthThreshold', widthThreshold)
                  }}
                  min={1}
                  unit="cm"
                />
              </Label.Root>

              <Label.Root>
                <span className="text-sm font-medium">{t($ => $.openings.labels.thresholdAssembly)}</span>
                <OpeningAssemblySelectWithEdit
                  value={threshold.assemblyId}
                  onValueChange={value => {
                    if (value) {
                      handleUpdateThreshold(originalIndex, 'assemblyId', value)
                    }
                  }}
                  exclude={excludeIds}
                />
              </Label.Root>

              <div>
                <br />
                <Button
                  size="icon-sm"
                  variant="destructive"
                  onClick={() => {
                    handleRemoveThreshold(originalIndex)
                  }}
                >
                  <Trash />
                </Button>
              </div>
            </div>
          )
        })}

        <Button size="default" onClick={handleAddThreshold}>
          <Plus />
          {t($ => $.openings.labels.addThreshold)}
        </Button>
      </div>
    </div>
  )
}
