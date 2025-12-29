import { Box, Button, Flex, Heading, Separator, Text } from '@radix-ui/themes'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import type { ToolInspectorProps } from '@/editor/tools/system/types'

import type { TestDataTool } from './TestDataTool'

export function TestDataToolInspector({ tool }: ToolInspectorProps<TestDataTool>): React.JSX.Element {
  const { t } = useTranslation('tool')

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
    if (window.confirm(t($ => $.testData.confirmReset))) {
      tool.resetAllData()
    }
  }, [tool, t])

  return (
    <Box p="2">
      <Flex direction="column" gap="3">
        {/* Test Data Generation Section */}
        <Box>
          <Heading size="2" weight="medium" mb="2" color="gray">
            {t($ => $.testData.generationHeading)}
          </Heading>

          <Flex direction="column" gap="2">
            {/* Cross/T-Shape Perimeter */}
            <Button className="w-full" size="2" onClick={handleCreateCrossShaped}>
              <span>📐</span>
              {t($ => $.testData.crossShaped)}
            </Button>

            {/* Hexagonal Perimeter */}
            <Button className="w-full" size="2" onClick={handleCreateHexagonal}>
              <span>⬡</span>
              {t($ => $.testData.hexagonal)}
            </Button>

            {/* Rectangular Perimeter */}
            <Button className="w-full" size="2" onClick={handleCreateRectangular}>
              <span>▭</span>
              {t($ => $.testData.rectangular)}
            </Button>
          </Flex>
        </Box>

        {/* Separator */}
        <Separator size="4" />

        {/* Danger Zone Section */}
        <Box>
          <Heading size="2" weight="medium" mb="2" color="red">
            {t($ => $.testData.dangerZone)}
          </Heading>

          <Flex direction="column" gap="2">
            <Button className="w-full" size="2" color="red" variant="solid" onClick={handleResetData}>
              <span>🗑️</span>
              {t($ => $.testData.resetAll)}
            </Button>

            <Text size="1" color="gray">
              {t($ => $.testData.resetWarning)}
            </Text>
          </Flex>
        </Box>

        {/* Instructions */}
        <Separator size="4" />
        <Box>
          <Text size="1" color="gray">
            {t($ => $.testData.instructions)}
          </Text>
        </Box>
      </Flex>
    </Box>
  )
}
