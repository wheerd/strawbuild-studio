import { useTranslation } from 'react-i18next'

import { SimplePolygonToolInspector } from '@/editor/tools/shared/polygon/SimplePolygonToolInspector'
import type { ToolInspectorProps } from '@/editor/tools/system/types'

import type { FloorOpeningTool } from './FloorOpeningTool'

export function FloorOpeningToolInspector({ tool }: ToolInspectorProps<FloorOpeningTool>): React.JSX.Element {
  const { t } = useTranslation('tool')

  return (
    <SimplePolygonToolInspector
      tool={tool}
      title={t($ => $.floorOpening.title)}
      description={t($ => $.floorOpening.description)}
      completeLabel={t($ => $.floorOpening.completeLabel)}
      cancelLabel={t($ => $.floorOpening.cancelLabel)}
    />
  )
}
