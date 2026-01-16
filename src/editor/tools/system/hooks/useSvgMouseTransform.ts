import { type RefObject, useCallback } from 'react'

import { type Vec2, newVec2 } from '@/shared/geometry'

export type MouseTransform = (pos: { clientX: number; clientY: number }) => Vec2

export function useSvgMouseTransform(svgRef: RefObject<SVGSVGElement | null>): MouseTransform {
  return useCallback(
    ({ clientX, clientY }): Vec2 => {
      if (!svgRef.current) throw new Error('Could not determine mouse position')

      const pt = svgRef.current.createSVGPoint()
      pt.x = clientX
      pt.y = clientY
      const ctm = svgRef.current.getScreenCTM()
      if (!ctm) throw new Error('Could not determine mouse position')

      const transformed = pt.matrixTransform(ctm.inverse())
      return newVec2(transformed.x, transformed.y)
    },
    [svgRef]
  )
}
