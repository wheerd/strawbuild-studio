import { useEffect, useState } from 'react'

import type { ToolImplementation } from '@/editor/tools/system/types'

/**
 * Custom hook that makes tool instances reactive in React components.
 *
 * This hook subscribes to the tool's render notifications and forces the component
 * to re-render whenever the tool's state changes. This is necessary because tool
 * state is not reactive like Zustand stores - tools manually notify when they change.
 *
 * @param tool - The tool instance to make reactive
 * @returns The same tool instance (for convenience in destructuring)
 *
 * @example
 * ```tsx
 * function MyToolOverlay({ tool }: ToolOverlayProps<MyTool>) {
 *   const { state } = useReactiveTool(tool)
 *
 *   return (
 *     <Group>
 *       <span className="text={state.someValue} /">
 *     </Group>
 *   )
 * }
 * ```
 */
export function useReactiveTool<T extends ToolImplementation>(tool: T): T {
  // Force re-renders when tool state changes
  const [, forceUpdate] = useState({})

  useEffect(() => {
    // Subscribe to tool state changes
    const unsubscribe = tool.onRenderNeeded?.(() => {
      forceUpdate({})
    })

    // Return cleanup function
    return unsubscribe
  }, [tool])

  return tool
}
