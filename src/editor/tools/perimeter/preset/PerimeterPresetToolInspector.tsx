import { InfoCircledIcon } from '@radix-ui/react-icons'
import { Box, Button, Callout, Flex, Text } from '@radix-ui/themes'

import { useReactiveTool } from '@/editor/tools/system/hooks/useReactiveTool'
import type { ToolInspectorProps } from '@/editor/tools/system/types'

import type { PerimeterPresetTool } from './PerimeterPresetTool'

export function PerimeterPresetToolInspector({ tool }: ToolInspectorProps<PerimeterPresetTool>): React.JSX.Element {
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
            <Text size="1">
              Presets create common building shapes with the reference edge you choose. Switch between inside or outside
              dimensions and configure construction properties.
            </Text>
          </Callout.Text>
        </Callout.Root>

        {tool.availablePresets.map(preset => (
          <preset.dialog
            key={preset.type}
            trigger={
              <Button className="w-full" size="2">
                <preset.icon />
                {preset.name} Perimeter
              </Button>
            }
            onConfirm={config => tool.placePerimeter(preset, config)}
          />
        ))}
      </Flex>
    </Box>
  )
}
