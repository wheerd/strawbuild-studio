import { InfoCircledIcon } from '@radix-ui/react-icons'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Callout, CalloutIcon, CalloutText } from '@/components/ui/callout'
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
        <Callout color="blue">
          <CalloutIcon>
            <InfoCircledIcon />
          </CalloutIcon>
          <CalloutText>
            <span className="text-sm">{t($ => $.perimeterPreset.info)}</span>
          </CalloutText>
        </Callout>

        {tool.availablePresets.map(preset => (
          <preset.dialog
            key={preset.type}
            trigger={
              <Button className="w-full" size="default">
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
