import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { ToolInspectorProps } from '@/editor/tools/system/types'
import { hardReset } from '@/shared/utils/hardReset'

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
    <div className="p-2">
      <div className="flex flex-col gap-3">
        {/* Test Data Generation Section */}
        <div>
          <h2 className="text-sm font-medium mb-2 text-muted-foreground">{t($ => $.testData.generationHeading)}</h2>

          <div className="flex flex-col gap-2">
            {/* Cross/T-Shape Perimeter */}
            <Button className="w-full" size="sm" onClick={handleCreateCrossShaped}>
              {t($ => $.testData.crossShaped)}
            </Button>

            {/* Hexagonal Perimeter */}
            <Button className="w-full" size="sm" onClick={handleCreateHexagonal}>
              {t($ => $.testData.hexagonal)}
            </Button>

            {/* Rectangular Perimeter */}
            <Button className="w-full" size="sm" onClick={handleCreateRectangular}>
              {t($ => $.testData.rectangular)}
            </Button>
          </div>
        </div>

        {/* Separator */}
        <Separator />

        {/* Danger Zone Section */}
        <div>
          <h2 className="text-sm font-medium mb-2 text-destructive">{t($ => $.testData.dangerZone)}</h2>

          <div className="flex flex-col gap-2">
            <Button className="w-full" size="sm" variant="destructive" onClick={handleResetData}>
              {t($ => $.testData.resetAll)}
            </Button>
            <Button className="w-full" size="sm" variant="destructive" onClick={hardReset}>
              {t($ => $.testData.hardReset)}
            </Button>

            <span className="text-xs text-muted-foreground">{t($ => $.testData.resetWarning)}</span>
          </div>
        </div>

        {/* Instructions */}
        <Separator />
        <div>
          <span className="text-xs text-muted-foreground">{t($ => $.testData.instructions)}</span>
        </div>
      </div>
    </div>
  )
}
