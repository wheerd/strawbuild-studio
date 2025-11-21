import { PolygonToolOverlay } from '@/editor/tools/shared/polygon/PolygonToolOverlay'

import type { RoofTool } from './RoofTool'

// Use the standard polygon tool overlay
export function RoofToolOverlay({ tool }: { tool: RoofTool }): React.JSX.Element | null {
  return <PolygonToolOverlay tool={tool} />
}
