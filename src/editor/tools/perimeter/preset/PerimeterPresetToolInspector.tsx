import { InfoCircledIcon } from '@radix-ui/react-icons'
import { Button, Callout } from '@radix-ui/themes'
import { useTranslation } from 'react-i18next'

import { useReactiveTool } from '@/editor/tools/system/hooks/useReactiveTool'
import type { ToolInspectorProps } from '@/editor/tools/system/types'

import type { PerimeterPresetTool } from './PerimeterPresetTool'

export function PerimeterPresetToolInspector({ tool }: ToolInspectorProps<PerimeterPresetTool>): React.JSX.Element {
  const { t } = useTranslation('tool')
  useReactiveTool(tool)

  return (
    <div className="p-2">
      <div className="flex flex-col gap-3">
        {/* Informational Note */}
        <Callout.Root color="blue">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            <span className="text-sm">{t($ => $.perimeterPreset.info)}</span>
          </Callout.Text>
        </Callout.Root>

        {tool.availablePresets.map(preset => (
          <preset.dialog
            key={preset.type}
            trigger={
              <Button className="w-full" size="2">
                <preset.icon />
                {t($ => $.perimeterPreset.types[preset.type])}
              </Button>
            }
            onConfirm={config => tool.placePerimeter(preset, config)}
          />
        ))}
      </div>
    </div>
  )
}
