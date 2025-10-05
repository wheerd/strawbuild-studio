import { Box, Button, Flex, Heading, Separator, Text } from '@radix-ui/themes'
import { useCallback } from 'react'

import type { ToolInspectorProps } from '@/editor/tools/system/types'

import type { TestDataTool } from './TestDataTool'

export function TestDataToolInspector({ tool }: ToolInspectorProps<TestDataTool>): React.JSX.Element {
  // Handler functions for each test data type
  const handleCreateCrossShaped = useCallback(() => {
    tool.createCrossShapedTestData()
  }, [tool])

  const handleCreateHexagonal = useCallback(() => {
    tool.createHexagonalTestData()
  }, [tool])

  const handleCreateRectangular = useCallback(() => {
    tool.createRectangularTestData()
  }, [tool])

  const handleResetData = useCallback(() => {
    if (
      window.confirm(
        'Are you sure you want to reset all data? This will clear all perimeters, openings, and saved work.'
      )
    ) {
      tool.resetAllData()
    }
  }, [tool])

  return (
    <Box p="2">
      <Flex direction="column" gap="3">
        {/* Test Data Generation Section */}
        <Box>
          <Heading size="2" weight="medium" mb="2" color="gray">
            Test Data Generation
          </Heading>

          <Flex direction="column" gap="2">
            {/* Cross/T-Shape Perimeter */}
            <Button className="w-full" size="2" onClick={handleCreateCrossShaped}>
              <span>📐</span>
              Cross/T-Shape Perimeter
            </Button>

            {/* Hexagonal Perimeter */}
            <Button className="w-full" size="2" onClick={handleCreateHexagonal}>
              <span>⬡</span>
              Hexagonal Perimeter (3m sides)
            </Button>

            {/* Rectangular Perimeter */}
            <Button className="w-full" size="2" onClick={handleCreateRectangular}>
              <span>▭</span>
              Rectangular Perimeter (8×5m)
            </Button>
          </Flex>
        </Box>

        {/* Separator */}
        <Separator size="4" />

        {/* Danger Zone Section */}
        <Box>
          <Heading size="2" weight="medium" mb="2" color="red">
            ⚠️ Danger Zone
          </Heading>

          <Flex direction="column" gap="2">
            <Button className="w-full" size="2" color="red" variant="solid" onClick={handleResetData}>
              <span>🗑️</span>
              Reset All Data
            </Button>

            <Text size="1" color="gray">
              ⚠️ This will permanently clear all perimeters, openings, and saved work
            </Text>
          </Flex>
        </Box>

        {/* Instructions */}
        <Separator size="4" />
        <Box>
          <Text size="1" color="gray">
            Click any button above to generate test data or reset the model. Each test case creates a perimeter with
            realistic windows and doors to demonstrate the application features.
          </Text>
        </Box>
      </Flex>
    </Box>
  )
}
