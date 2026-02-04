import { useMemo } from 'react'
import { BufferGeometry } from 'three'

import { useStoreysOrderedByLevel } from '@/building/store'
import type { VerticalOffsetMap } from '@/construction/storeys/offsets'
import {
  calculateSlopedAreaVertexHeights,
  createSlopedExtrudedGeometry
} from '@/construction/viewer3d/utils/offsetMapHelpers'
import type { Length } from '@/shared/geometry'

interface OffsetMapDebug3DProps {
  storeyId: string
  map: VerticalOffsetMap
}

export function OffsetMapDebug3D({ storeyId, map }: OffsetMapDebug3DProps) {
  const storeys = useStoreysOrderedByLevel()
  const cumulativeStoreyHeight = useMemo(() => {
    const storeyIndex = storeys.findIndex(s => s.id === storeyId)
    if (storeyIndex === -1) return 0

    let height: Length = 0
    for (let i = 0; i <= storeyIndex; i++) {
      height += storeys[i].floorHeight
    }
    return height
  }, [storeys, storeyId])

  const invert = map.getDebugInvert()

  const geometries = useMemo(() => {
    const result: {
      geometry: BufferGeometry
      color: string
    }[] = []

    const constantAreas = map.getDebugConstantAreas()
    for (const { polygon, offset } of constantAreas) {
      const effectiveOffset = invert ? -offset : offset
      const vertexHeights = Array<Length>(polygon.points.length).fill(effectiveOffset)
      result.push({
        geometry: createSlopedExtrudedGeometry(polygon, vertexHeights),
        color: '#00FF00'
      })
    }

    const slopedAreas = map.getDebugSlopedAreas()
    for (const { polygon, base, downSlopeDir, angleRad, baseOffset } of slopedAreas) {
      const areaHeights = calculateSlopedAreaVertexHeights(polygon, base, downSlopeDir, angleRad, baseOffset, invert)

      result.push({
        geometry: createSlopedExtrudedGeometry(polygon, areaHeights),
        color: '#FF9800'
      })
    }

    return result
  }, [map, cumulativeStoreyHeight, invert])

  return (
    <group position={[0, 0, cumulativeStoreyHeight]}>
      {geometries.map((geo, i) => (
        <mesh key={i} geometry={geo.geometry}>
          <meshStandardMaterial color={geo.color} transparent opacity={0.5} side={2} />
        </mesh>
      ))}
    </group>
  )
}
