import { useMemo } from 'react'
import * as THREE from 'three'

import type { ExtrudedPolygon } from '@/construction/shapes'
import { computeExtrudedPolygonGeometry } from '@/construction/viewer3d/utils/geometryHelpers'

interface ExtrudedPolygon3DProps {
  shape: ExtrudedPolygon
  color: string
  opacity?: number
}

function ExtrudedPolygon3D({ shape, color, opacity = 1.0 }: ExtrudedPolygon3DProps): React.JSX.Element | null {
  const { geometry, matrix } = useMemo(() => {
    return computeExtrudedPolygonGeometry(shape)
  }, [shape])

  const edgesGeometry = useMemo(() => {
    return new THREE.EdgesGeometry(geometry)
  }, [geometry])

  if (opacity === 0) return null

  return (
    <mesh geometry={geometry} matrix={matrix} matrixAutoUpdate={false}>
      <meshStandardMaterial color={color} opacity={opacity} transparent depthWrite={opacity === 1.0} />
      <lineSegments geometry={edgesGeometry}>
        <lineBasicMaterial color="#000000" opacity={0.4} transparent linewidth={1} />
      </lineSegments>
    </mesh>
  )
}

export default ExtrudedPolygon3D
