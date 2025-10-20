import { SimplePolygonToolInspector } from '@/editor/tools/shared/polygon/SimplePolygonToolInspector'
import type { ToolInspectorProps } from '@/editor/tools/system/types'

import type { FloorOpeningTool } from './FloorOpeningTool'

export function FloorOpeningToolInspector({ tool }: ToolInspectorProps<FloorOpeningTool>): React.JSX.Element {
  return (
    <SimplePolygonToolInspector
      tool={tool}
      title="Floor Opening"
      description="Draw an opening within an existing floor area. Use snapping to align with floor edges or other openings."
      completeLabel="Complete Floor Opening"
      cancelLabel="Cancel"
    />
  )
}
