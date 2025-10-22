import { InfoCircledIcon } from '@radix-ui/react-icons'
import { Box, Button, Callout, DataList, Flex, Heading, Separator, Text } from '@radix-ui/themes'
import { useCallback } from 'react'

import { useDefaultWallAssemblyId, useWallAssemblies } from '@/construction/config/store'
import { MeasurementInfo } from '@/editor/components/MeasurementInfo'
import { useReactiveTool } from '@/editor/tools/system/hooks/useReactiveTool'
import type { ToolInspectorProps } from '@/editor/tools/system/types'
import '@/shared/geometry'
import { formatLength } from '@/shared/utils/formatLength'

import type { PerimeterPresetTool } from './PerimeterPresetTool'
import { LShape0Icon, RectIcon } from './presets/Icons'
import { LShapedPresetDialog } from './presets/LShapedPresetDialog'
import { RectangularPresetDialog } from './presets/RectangularPresetDialog'
import type { LShapedPresetConfig, RectangularPresetConfig } from './presets/types'

export function PerimeterPresetToolInspector({ tool }: ToolInspectorProps<PerimeterPresetTool>): React.JSX.Element {
  const { state } = useReactiveTool(tool)
  const allWallAssemblies = useWallAssemblies()
  const defaultWallAssemblyId = useDefaultWallAssemblyId()

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
        {/* Informational Note */}
        <Callout.Root color="blue">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            <Text size="1">
              Presets create common building shapes with the <Text weight="bold">inside edge</Text> aligned to your
              chosen dimensions. Configure the shape, then click to place it on the plan.
            </Text>
          </Callout.Text>
        </Callout.Root>

        {/* Rectangular Preset Dialog */}
        <RectangularPresetDialog
          onConfirm={handleRectangularPresetConfirm}
          initialConfig={{
            width: 4000,
            length: 6000,
            thickness: 440,
            wallAssemblyId: defaultWallAssemblyId
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
            width1: 8000,
            length1: 6000,
            width2: 4000,
            length2: 3000,
            rotation: 0,
            thickness: 440,
            wallAssemblyId: defaultWallAssemblyId
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
                  <DataList.Label minWidth="80px">
                    <Flex align="center" gap="1">
                      Thickness
                      <MeasurementInfo highlightedMeasurement="totalWallThickness" showFinishedSides />
                    </Flex>
                  </DataList.Label>
                  <DataList.Value>{formatLength(currentConfig.thickness)}</DataList.Value>
                </DataList.Item>

                <DataList.Item>
                  <DataList.Label minWidth="80px">
                    <Flex align="center" gap="1">
                      Assembly
                      <MeasurementInfo highlightedAssembly="wallAssembly" />
                    </Flex>
                  </DataList.Label>
                  <DataList.Value>
                    {allWallAssemblies.find(m => m.id === currentConfig.wallAssemblyId)?.name || 'Unknown'}
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
