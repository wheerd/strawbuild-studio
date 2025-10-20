import { SimplePolygonToolInspector } from '@/editor/tools/shared/polygon/SimplePolygonToolInspector'
import type { ToolInspectorProps } from '@/editor/tools/system/types'

import type { FloorAreaTool } from './FloorAreaTool'

export function FloorAreaToolInspector({ tool }: ToolInspectorProps<FloorAreaTool>): React.JSX.Element {
  return (
    <SimplePolygonToolInspector
      tool={tool}
      title="Floor Area"
      description="Click to outline the floor area on the active storey. Snap to perimeter corners or existing floor edges for precise alignment."
      completeLabel="Complete Floor Area"
      cancelLabel="Cancel"
    />
  )
}
