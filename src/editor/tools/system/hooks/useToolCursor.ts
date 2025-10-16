import { useEffect, useState } from 'react'

import { useActiveTool } from '@/editor/tools/system/store'
import type { CursorStyle } from '@/editor/tools/system/types'

export function useToolCursor(): CursorStyle {
  const activeTool = useActiveTool()
  const [cursor, setCursor] = useState<CursorStyle>(() => activeTool.getCursor?.() ?? 'default')

  useEffect(() => {
    const updateCursor = () => {
      const newCursor = activeTool.getCursor?.() ?? 'default'
      setCursor(newCursor)
    }

    updateCursor()

    if (activeTool.onRenderNeeded) {
      return activeTool.onRenderNeeded(updateCursor)
    }

    return undefined
  }, [activeTool])

  return cursor
}
