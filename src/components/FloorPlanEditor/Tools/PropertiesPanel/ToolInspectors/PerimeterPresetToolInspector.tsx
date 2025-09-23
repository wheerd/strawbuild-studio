import { useCallback } from 'react'
import { Button, Flex, Text, Box, Separator, DataList, Heading } from '@radix-ui/themes'
import { createLength } from '@/types/geometry'
import type { ToolInspectorProps } from '@/components/FloorPlanEditor/Tools/ToolSystem/types'
import type { PerimeterPresetTool } from '@/components/FloorPlanEditor/Tools/Categories/PerimeterTools/PerimeterPresetTool'
import type { RectangularPresetConfig } from '@/components/FloorPlanEditor/Tools/Categories/PerimeterTools/presets'
import { RectangularPresetDialog } from '@/components/FloorPlanEditor/Tools/Categories/PerimeterTools/presets/RectangularPresetDialog'
import { useReactiveTool } from '@/components/FloorPlanEditor/Tools/hooks/useReactiveTool'
import { usePerimeterConstructionMethods, useConfigStore } from '@/config/store'
import { formatLength } from '@/utils/formatLength'
import { BoxIcon } from '@radix-ui/react-icons'

export function PerimeterPresetToolInspector({ tool }: ToolInspectorProps<PerimeterPresetTool>): React.JSX.Element {
  const { state } = useReactiveTool(tool)
  const allPerimeterMethods = usePerimeterConstructionMethods()
  const configStore = useConfigStore()

  // Get available presets
  const availablePresets = tool.getAvailablePresets()
  const rectangularPreset = availablePresets.find(p => p.type === 'rectangular')

  // Handle rectangular preset configuration
  const handleRectangularPresetConfirm = useCallback(
    (config: RectangularPresetConfig) => {
      if (rectangularPreset) {
        tool.setActivePreset(rectangularPreset, config)
      }
    },
    [tool, rectangularPreset]
  )

  // Get current config for display
  const currentConfig = tool.getCurrentConfig()
  const isPlacing = tool.isPlacing()

  return (
    <Box p="2">
      <Flex direction="column" gap="3">
        {/* Rectangular Preset Dialog */}
        <RectangularPresetDialog
          onConfirm={handleRectangularPresetConfirm}
          initialConfig={{
            width: createLength(4000),
            length: createLength(6000),
            thickness: createLength(440),
            constructionMethodId: configStore.getDefaultPerimeterMethodId()
          }}
          trigger={
            <Button className="w-full" size="2">
              <BoxIcon />
              Rectangular Perimeter
            </Button>
          }
        />

        {/* Current Configuration Display */}
        {currentConfig && (
          <>
            <Separator size="4" />
            <Flex direction="column" gap="2">
              <Heading size="2" weight="medium" color="gray">
                Current Configuration
              </Heading>

              <DataList.Root size="1">
                {/* Show preset-specific details */}
                {state.activePreset?.type === 'rectangular' && (
                  <DataList.Item>
                    <DataList.Label minWidth="80px">Dimensions</DataList.Label>
                    <DataList.Value>
                      {formatLength((currentConfig as RectangularPresetConfig).width)} ×{' '}
                      {formatLength((currentConfig as RectangularPresetConfig).length)}
                    </DataList.Value>
                  </DataList.Item>
                )}

                <DataList.Item>
                  <DataList.Label minWidth="80px">Thickness</DataList.Label>
                  <DataList.Value>{formatLength(currentConfig.thickness)}</DataList.Value>
                </DataList.Item>

                <DataList.Item>
                  <DataList.Label minWidth="80px">Method</DataList.Label>
                  <DataList.Value>
                    {allPerimeterMethods.find(m => m.id === currentConfig.constructionMethodId)?.name || 'Unknown'}
                  </DataList.Value>
                </DataList.Item>
              </DataList.Root>
            </Flex>
          </>
        )}

        {/* Placement Instructions */}
        {isPlacing && (
          <>
            <Separator size="4" />
            <Box>
              <Text size="1" color="gray">
                Click on the plan to place the room. Press{' '}
                <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs font-mono">Esc</kbd> to cancel.
              </Text>
            </Box>
          </>
        )}

        {/* Actions */}
        {isPlacing && (
          <Button color="red" variant="solid" className="w-full" onClick={() => tool.clearActivePreset()}>
            <span>✕</span>
            Cancel Placement
          </Button>
        )}
      </Flex>
    </Box>
  )
}
