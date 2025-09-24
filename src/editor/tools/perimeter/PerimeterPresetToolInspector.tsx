import { useCallback } from 'react'
import { Button, Flex, Text, Box, Separator, DataList, Heading } from '@radix-ui/themes'
import { createLength } from '@/shared/geometry'
import type { ToolInspectorProps } from '@/editor/tools/system/types'
import type { PerimeterPresetTool } from './PerimeterPresetTool'
import type { RectangularPresetConfig, LShapedPresetConfig } from './preset/presets/types'
import { RectangularPresetDialog } from './preset/presets/RectangularPresetDialog'
import { LShapedPresetDialog } from './preset/presets/LShapedPresetDialog'
import { useReactiveTool } from '@/editor/tools/system/hooks/useReactiveTool'
import { usePerimeterConstructionMethods, useConfigStore } from '@/construction/config/store'
import { formatLength } from '@/shared/utils/formatLength'
import { LShape0Icon, RectIcon } from './preset/presets/Icons'

export function PerimeterPresetToolInspector({ tool }: ToolInspectorProps<PerimeterPresetTool>): React.JSX.Element {
  const { state } = useReactiveTool(tool)
  const allPerimeterMethods = usePerimeterConstructionMethods()
  const configStore = useConfigStore()

  // Get available presets
  const availablePresets = tool.getAvailablePresets()
  const rectangularPreset = availablePresets.find(p => p.type === 'rectangular')
  const lShapedPreset = availablePresets.find(p => p.type === 'l-shaped')

  // Handle rectangular preset configuration
  const handleRectangularPresetConfirm = useCallback(
    (config: RectangularPresetConfig) => {
      if (rectangularPreset) {
        tool.setActivePreset(rectangularPreset, config)
      }
    },
    [tool, rectangularPreset]
  )

  // Handle L-shaped preset configuration
  const handleLShapedPresetConfirm = useCallback(
    (config: LShapedPresetConfig) => {
      if (lShapedPreset) {
        tool.setActivePreset(lShapedPreset, config)
      }
    },
    [tool, lShapedPreset]
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
              <RectIcon />
              Rectangular Perimeter
            </Button>
          }
        />

        {/* L-Shaped Preset Dialog */}
        <LShapedPresetDialog
          onConfirm={handleLShapedPresetConfirm}
          initialConfig={{
            width1: createLength(8000),
            length1: createLength(6000),
            width2: createLength(4000),
            length2: createLength(3000),
            rotation: 0,
            thickness: createLength(440),
            constructionMethodId: configStore.getDefaultPerimeterMethodId()
          }}
          trigger={
            <Button className="w-full" size="2">
              <LShape0Icon />
              L-Shaped Perimeter
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

                {state.activePreset?.type === 'l-shaped' && (
                  <>
                    <DataList.Item>
                      <DataList.Label minWidth="80px">Main</DataList.Label>
                      <DataList.Value>
                        {formatLength((currentConfig as LShapedPresetConfig).width1)} ×{' '}
                        {formatLength((currentConfig as LShapedPresetConfig).length1)}
                      </DataList.Value>
                    </DataList.Item>
                    <DataList.Item>
                      <DataList.Label minWidth="80px">Extension</DataList.Label>
                      <DataList.Value>
                        {formatLength((currentConfig as LShapedPresetConfig).width2)} ×{' '}
                        {formatLength((currentConfig as LShapedPresetConfig).length2)}
                      </DataList.Value>
                    </DataList.Item>
                    <DataList.Item>
                      <DataList.Label minWidth="80px">Rotation</DataList.Label>
                      <DataList.Value>{(currentConfig as LShapedPresetConfig).rotation}°</DataList.Value>
                    </DataList.Item>
                  </>
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
