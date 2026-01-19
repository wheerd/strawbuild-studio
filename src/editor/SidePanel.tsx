import { useActiveTool } from '@/editor/tools/system/store'

export function SidePanel(): React.JSX.Element {
  const activeTool = useActiveTool()

  return (
    <div
      className="bg-card border-border side-panel overflow-x-hidden overflow-y-auto border-l p-0"
      data-testid="side-panel"
    >
      <div className="p-2">
        <activeTool.inspectorComponent tool={activeTool} />
      </div>
    </div>
  )
}
