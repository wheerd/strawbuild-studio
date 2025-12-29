import { InfoCircledIcon } from '@radix-ui/react-icons'
import { Box, Button, Callout, Flex, Text } from '@radix-ui/themes'
import { useTranslation } from 'react-i18next'

import { useReactiveTool } from '@/editor/tools/system/hooks/useReactiveTool'
import type { ToolInspectorProps } from '@/editor/tools/system/types'

import type { PerimeterPresetTool } from './PerimeterPresetTool'

export function PerimeterPresetToolInspector({ tool }: ToolInspectorProps<PerimeterPresetTool>): React.JSX.Element {
  const { t } = useTranslation('tool')
  useReactiveTool(tool)

  return (
    <Box p="2">
      <Flex direction="column" gap="3">
        {/* Informational Note */}
        <Callout.Root color="blue">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            <Text size="1">{t($ => $.perimeterPreset.info)}</Text>
          </Callout.Text>
        </Callout.Root>

        {tool.availablePresets.map(preset => (
          <preset.dialog
            key={preset.type}
            trigger={
              <Button className="w-full" size="2">
                <preset.icon />
                {t($ => $.perimeterPreset.presetButton, {
                  name: preset.name
                })}
              </Button>
            }
            onConfirm={config => tool.placePerimeter(preset, config)}
          />
        ))}
      </Flex>
    </Box>
  )
}
