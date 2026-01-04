import { useTranslation } from 'react-i18next'

import { SimplePolygonToolInspector } from '@/editor/tools/shared/polygon/SimplePolygonToolInspector'
import type { ToolInspectorProps } from '@/editor/tools/system/types'

import type { FloorAreaTool } from './FloorAreaTool'

export function FloorAreaToolInspector({ tool }: ToolInspectorProps<FloorAreaTool>): React.JSX.Element {
  const { t } = useTranslation('tool')

  return (
    <SimplePolygonToolInspector
      tool={tool}
      title={t($ => $.floorArea.title)}
      description={t($ => $.floorArea.description)}
      completeLabel={t($ => $.floorArea.completeLabel)}
      cancelLabel={t($ => $.floorArea.cancelLabel)}
    />
  )
}
