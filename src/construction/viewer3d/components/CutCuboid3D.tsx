import { useMemo } from 'react'
import * as THREE from 'three'

import type { CutCuboid } from '@/construction/shapes'
import { computeCutCuboidVertices } from '@/construction/viewer3d/utils/geometryHelpers'

interface CutCuboid3DProps {
  shape: CutCuboid
  color: string
  opacity?: number
}

function CutCuboid3D({ shape, color, opacity = 1.0 }: CutCuboid3DProps): React.JSX.Element | null {
  const geometry = useMemo(() => {
    const { vertices, indices } = computeCutCuboidVertices(shape)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
    geometry.setIndex(new THREE.BufferAttribute(indices, 1))
    geometry.computeVertexNormals()
    return geometry
  }, [shape])

  const edgesGeometry = useMemo(() => {
    return new THREE.EdgesGeometry(geometry)
  }, [geometry])

  if (opacity === 0) return null

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={color} opacity={opacity} transparent depthWrite={opacity === 1.0} />
      <lineSegments geometry={edgesGeometry}>
        <lineBasicMaterial color="#000000" opacity={0.4} transparent linewidth={1} />
      </lineSegments>
    </mesh>
  )
}

export default CutCuboid3D
