import { useActiveTool } from '@/editor/tools/system/store'

export function SidePanel(): React.JSX.Element {
  const activeTool = useActiveTool()

  return (
    <div
      className="p-0 bg-muted border-l border-border overflow-y-auto overflow-x-hidden side-panel"
      data-testid="side-panel"
    >
      <div className="flex flex-col p-2 gap-2">
        <activeTool.inspectorComponent tool={activeTool} />
      </div>
    </div>
  )
}
